import express from 'express';
import ConnectionRequest from '../models/ConnectionRequest.js';
import Trainer from '../models/Trainer.js';
import User from '../models/User.js';

const router = express.Router();

// Search for trainers or clients
router.get('/search', async (req, res) => {
  try {
    const { query, type, requesterId, requesterType } = req.query;

    if (!query || !type || !requesterId || !requesterType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    let results = [];

    if (type === 'trainer') {
      results = await Trainer.find({
        _id: { $ne: requesterId },
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { specialization: { $regex: query, $options: 'i' } }
        ],
        isActive: true
      }).select('name email specialization experience profileImage bio').limit(20);
    } else if (type === 'client') {
      results = await User.find({
        _id: { $ne: requesterId },
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      }).select('name email').limit(20);
    }

    // Check existing connections and pending requests
    const resultsWithStatus = await Promise.all(results.map(async (result) => {
      const resultObj = result.toObject();
      
      if (requesterType === 'Trainer') {
        const trainer = await Trainer.findById(requesterId);
        const isConnected = trainer.clients.some(clientId => clientId.equals(result._id));
        resultObj.connectionStatus = isConnected ? 'connected' : 'none';
      } else {
        const client = await User.findById(requesterId);
        const isConnected = client.trainer && client.trainer.equals(result._id);
        resultObj.connectionStatus = isConnected ? 'connected' : 'none';
      }

      if (resultObj.connectionStatus === 'none') {
        const pendingRequest = await ConnectionRequest.findOne({
          $or: [
            { 'from.id': requesterId, 'to.id': result._id, status: 'pending' },
            { 'from.id': result._id, 'to.id': requesterId, status: 'pending' }
          ]
        });

        if (pendingRequest) {
          if (pendingRequest.from.id.equals(requesterId)) {
            resultObj.connectionStatus = 'pending_sent';
          } else {
            resultObj.connectionStatus = 'pending_received';
          }
        }
      }

      return resultObj;
    }));

    res.json({
      success: true,
      results: resultsWithStatus
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
});

// Send connection request
router.post('/send', async (req, res) => {
  try {
    const { fromId, fromType, toId, toType, message } = req.body;

    if (!fromId || !fromType || !toId || !toType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const existingRequest = await ConnectionRequest.findOne({
      $or: [
        { 'from.id': fromId, 'to.id': toId },
        { 'from.id': toId, 'to.id': fromId }
      ],
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Connection request already exists'
      });
    }

    const SenderModel = fromType === 'Trainer' ? Trainer : User;
    const sender = await SenderModel.findById(fromId);
    
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    const ReceiverModel = toType === 'Trainer' ? Trainer : User;
    const receiver = await ReceiverModel.findById(toId);
    
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    const connectionRequest = new ConnectionRequest({
      from: {
        id: fromId,
        type: fromType,
        name: sender.name,
        email: sender.email
      },
      to: {
        id: toId,
        type: toType,
        name: receiver.name,
        email: receiver.email
      },
      message: message || '',
      status: 'pending'
    });

    await connectionRequest.save();

    res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      request: connectionRequest
    });

  } catch (error) {
    console.error('Send request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send connection request',
      error: error.message
    });
  }
});

// Get all requests
router.get('/my-requests', async (req, res) => {
  try {
    const { userId, userType } = req.query;

    if (!userId || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    const incomingRequests = await ConnectionRequest.find({
      'to.id': userId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    const outgoingRequests = await ConnectionRequest.find({
      'from.id': userId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      incoming: incomingRequests,
      outgoing: outgoingRequests
    });

  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message
    });
  }
});

// Accept connection request
router.post('/accept/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId } = req.body;

    const request = await ConnectionRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (!request.to.id.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request already processed'
      });
    }

    request.status = 'accepted';
    request.updatedAt = new Date();
    await request.save();

    if (request.from.type === 'Trainer') {
      await Trainer.findByIdAndUpdate(request.from.id, {
        $addToSet: { clients: request.to.id }
      });
      await User.findByIdAndUpdate(request.to.id, {
        trainer: request.from.id
      });
    } else {
      await Trainer.findByIdAndUpdate(request.to.id, {
        $addToSet: { clients: request.from.id }
      });
      await User.findByIdAndUpdate(request.from.id, {
        trainer: request.to.id
      });
    }

    res.json({
      success: true,
      message: 'Connection request accepted',
      request
    });

  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept request',
      error: error.message
    });
  }
});

// Reject connection request
router.post('/reject/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId } = req.body;

    const request = await ConnectionRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (!request.to.id.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request already processed'
      });
    }

    request.status = 'rejected';
    request.updatedAt = new Date();
    await request.save();

    res.json({
      success: true,
      message: 'Connection request rejected',
      request
    });

  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request',
      error: error.message
    });
  }
});

// Cancel sent request
router.delete('/cancel/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId } = req.query;

    const request = await ConnectionRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (!request.from.id.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel processed request'
      });
    }

    await ConnectionRequest.findByIdAndDelete(requestId);

    res.json({
      success: true,
      message: 'Request cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel request',
      error: error.message
    });
  }
});

export default router;