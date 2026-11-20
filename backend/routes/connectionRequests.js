import express from "express";
import ConnectionRequest from "../models/ConnectionRequest.js";
import Trainer from "../models/Trainer.js";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  actorType,
  areAlreadyConnected,
  acceptRequestForUser,
  getPairStatus,
  notifyRecipientOfRequest,
  rejectRequestForUser,
} from "../utils/connectionService.js";
import { escapeRegex } from "../utils/escapeRegex.js";

const router = express.Router();
router.use(protect);

const handleServiceError = (res, error) => {
  const status = error.statusCode || 500;
  res.status(status).json({
    success: false,
    message: error.message || "Connection request failed",
  });
};

router.get("/overview", async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = actorType(req.user);

    const incoming = await ConnectionRequest.find({
      "to.id": userId,
      status: "pending",
    }).sort({ createdAt: -1 });

    const outgoing = await ConnectionRequest.find({
      "from.id": userId,
      status: "pending",
    }).sort({ createdAt: -1 });

    let connectedTrainerId = null;
    let connectedClientIds = [];

    if (userType === "User") {
      const client = await User.findById(userId).select("trainer");
      connectedTrainerId = client?.trainer || null;
    } else {
      const trainer = await Trainer.findById(userId).select("clients");
      connectedClientIds = trainer?.clients || [];
    }

    res.json({
      success: true,
      incoming,
      outgoing,
      connectedTrainerId,
      connectedClientIds,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
});

router.get("/status/:otherId", async (req, res) => {
  try {
    const { otherType } = req.query;
    if (!otherType) {
      return res.status(400).json({ success: false, message: "otherType is required" });
    }

    const status = await getPairStatus(
      req.user._id,
      actorType(req.user),
      req.params.otherId,
      otherType
    );

    res.json({ success: true, status });
  } catch (error) {
    handleServiceError(res, error);
  }
});

router.get("/search", async (req, res) => {
  try {
    const { query, type } = req.query;
    const requesterId = req.user._id;
    const requesterType = actorType(req.user);

    if (!query || !type || typeof query !== "string" || query.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    const pattern = escapeRegex(query);
    let results = [];

    if (type === "trainer") {
      results = await Trainer.find({
        _id: { $ne: requesterId },
        $or: [
          { name: { $regex: pattern, $options: "i" } },
          { email: { $regex: pattern, $options: "i" } },
          { specialization: { $regex: pattern, $options: "i" } },
        ],
        isActive: true,
      })
        .select("name email specialization experience profileImage bio")
        .limit(20);
    } else if (type === "client") {
      results = await User.find({
        _id: { $ne: requesterId },
        $or: [
          { name: { $regex: pattern, $options: "i" } },
          { email: { $regex: pattern, $options: "i" } },
        ],
      })
        .select("name email")
        .limit(20);
    }

    const resultsWithStatus = await Promise.all(
      results.map(async (result) => {
        const resultObj = result.toObject();
        const otherType = type === "trainer" ? "Trainer" : "User";
        resultObj.connectionStatus = await getPairStatus(
          requesterId,
          requesterType,
          result._id,
          otherType
        );
        return resultObj;
      })
    );

    res.json({
      success: true,
      results: resultsWithStatus,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
});

router.post("/send", async (req, res) => {
  try {
    const fromId = req.user._id;
    const fromType = actorType(req.user);
    const { toId, toType, message } = req.body;

    if (!toId || !toType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const validPair =
      (fromType === "User" && toType === "Trainer") ||
      (fromType === "Trainer" && toType === "User");

    if (!validPair) {
      return res.status(400).json({
        success: false,
        message: "Connections are only allowed between a client and a trainer",
      });
    }

    if (await areAlreadyConnected(fromId, fromType, toId, toType)) {
      return res.status(400).json({
        success: false,
        message: "You are already connected",
      });
    }

    const existingRequest = await ConnectionRequest.findOne({
      status: "pending",
      $or: [
        { "from.id": fromId, "to.id": toId },
        { "from.id": toId, "to.id": fromId },
      ],
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "A connection request is already pending",
      });
    }

    const ReceiverModel = toType === "Trainer" ? Trainer : User;
    const receiver = await ReceiverModel.findById(toId);

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    const connectionRequest = await ConnectionRequest.create({
      from: {
        id: fromId,
        type: fromType,
        name: req.user.name,
        email: req.user.email,
      },
      to: {
        id: toId,
        type: toType,
        name: receiver.name,
        email: receiver.email,
      },
      message: message || "",
      status: "pending",
    });

    await notifyRecipientOfRequest(connectionRequest);

    res.status(201).json({
      success: true,
      message: "Connection request sent successfully",
      request: connectionRequest,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
});

router.get("/my-requests", async (req, res) => {
  try {
    const userId = req.user._id;

    const incoming = await ConnectionRequest.find({
      "to.id": userId,
      status: "pending",
    }).sort({ createdAt: -1 });

    const outgoing = await ConnectionRequest.find({
      "from.id": userId,
      status: "pending",
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      incoming,
      outgoing,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
});

router.post("/accept/:requestId", async (req, res) => {
  try {
    const request = await acceptRequestForUser(req.params.requestId, req.user._id);
    res.json({
      success: true,
      message: "Connection request accepted",
      request,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
});

router.post("/reject/:requestId", async (req, res) => {
  try {
    const request = await rejectRequestForUser(req.params.requestId, req.user._id);
    res.json({
      success: true,
      message: "Connection request declined",
      request,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
});

router.delete("/cancel/:requestId", async (req, res) => {
  try {
    const request = await ConnectionRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (String(request.from.id) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel processed request",
      });
    }

    await ConnectionRequest.findByIdAndDelete(req.params.requestId);

    res.json({
      success: true,
      message: "Request cancelled successfully",
    });
  } catch (error) {
    handleServiceError(res, error);
  }
});

export default router;