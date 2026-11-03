import ConnectionRequest from "../models/ConnectionRequest.js";
import Notification from "../models/Notifications.js";
import Trainer from "../models/Trainer.js";
import User from "../models/User.js";

export const actorType = (user) =>
  user?.constructor?.modelName === "Trainer" ? "Trainer" : "User";

export const idsEqual = (a, b) => String(a) === String(b);

export async function linkTrainerAndClient(trainerId, clientId) {
  const client = await User.findById(clientId);
  if (client?.trainer && !idsEqual(client.trainer, trainerId)) {
    await Trainer.findByIdAndUpdate(client.trainer, { $pull: { clients: clientId } });
  }
  await Trainer.findByIdAndUpdate(trainerId, { $addToSet: { clients: clientId } });
  await User.findByIdAndUpdate(clientId, { trainer: trainerId });
}

export async function applyAcceptedRequest(request) {
  if (request.from.type === "Trainer") {
    await linkTrainerAndClient(request.from.id, request.to.id);
  } else {
    await linkTrainerAndClient(request.to.id, request.from.id);
  }
}

export async function areAlreadyConnected(aId, aType, bId, bType) {
  if (aType === "Trainer" && bType === "User") {
    const trainer = await Trainer.findById(aId).select("clients");
    return Boolean(trainer?.clients?.some((id) => idsEqual(id, bId)));
  }
  if (aType === "User" && bType === "Trainer") {
    const client = await User.findById(aId).select("trainer");
    return Boolean(client?.trainer && idsEqual(client.trainer, bId));
  }
  return false;
}

export async function getPairStatus(userId, userType, otherId, otherType) {
  if (await areAlreadyConnected(userId, userType, otherId, otherType)) {
    return "connected";
  }

  const pending = await ConnectionRequest.findOne({
    status: "pending",
    $or: [
      { "from.id": userId, "to.id": otherId },
      { "from.id": otherId, "to.id": userId },
    ],
  });

  if (!pending) return "none";
  if (idsEqual(pending.from.id, userId)) return "pending_sent";
  return "pending_received";
}

export async function notifyRecipientOfRequest(request) {
  await Notification.createNotification({
    recipient: {
      id: request.to.id,
      type: request.to.type,
    },
    sender: {
      id: request.from.id,
      type: request.from.type,
      name: request.from.name,
    },
    type: "connection",
    title: "New connection request",
    message: `${request.from.name} wants to connect with you.`,
    actionUrl: request.to.type === "Trainer" ? "/trainer/notifications" : "/notifications",
    metadata: { requestId: request._id },
  });
}

export async function notifySenderOfDecision(request, accepted) {
  await Notification.createNotification({
    recipient: {
      id: request.from.id,
      type: request.from.type,
    },
    sender: {
      id: request.to.id,
      type: request.to.type,
      name: request.to.name,
    },
    type: accepted ? "connection_accepted" : "connection_declined",
    title: accepted ? "Connection accepted" : "Connection declined",
    message: accepted
      ? `${request.to.name} accepted your connection request.`
      : `${request.to.name} declined your connection request.`,
    actionUrl: request.from.type === "Trainer" ? "/trainer/dashboard" : "/dashboard",
    metadata: { requestId: request._id },
  });
}

export async function acceptRequestForUser(requestId, userId) {
  const request = await ConnectionRequest.findById(requestId);
  if (!request) {
    const error = new Error("Request not found");
    error.statusCode = 404;
    throw error;
  }
  if (!idsEqual(request.to.id, userId)) {
    const error = new Error("Not authorized to accept this request");
    error.statusCode = 403;
    throw error;
  }
  if (request.status !== "pending") {
    const error = new Error("Request already processed");
    error.statusCode = 400;
    throw error;
  }

  request.status = "accepted";
  request.updatedAt = new Date();
  await request.save();
  await applyAcceptedRequest(request);
  await notifySenderOfDecision(request, true);
  return request;
}

export async function rejectRequestForUser(requestId, userId) {
  const request = await ConnectionRequest.findById(requestId);
  if (!request) {
    const error = new Error("Request not found");
    error.statusCode = 404;
    throw error;
  }
  if (!idsEqual(request.to.id, userId)) {
    const error = new Error("Not authorized to decline this request");
    error.statusCode = 403;
    throw error;
  }
  if (request.status !== "pending") {
    const error = new Error("Request already processed");
    error.statusCode = 400;
    throw error;
  }

  request.status = "rejected";
  request.updatedAt = new Date();
  await request.save();
  await notifySenderOfDecision(request, false);
  return request;
}
