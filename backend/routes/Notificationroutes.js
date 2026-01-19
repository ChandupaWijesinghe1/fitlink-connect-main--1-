import express from 'express';
import ConnectionRequest from '../models/ConnectionRequest.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  acceptConnectionRequest,
  declineConnectionRequest
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ========== OLD ROUTE: Get connection request notifications ==========
// Get all notifications for a user (connection requests based)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get incoming connection requests
    const incomingRequests = await ConnectionRequest.find({
      'to.id': userId,
      'to.type': 'User',
      status: 'pending'
    }).sort({ createdAt: -1 });

    // Get recently accepted/rejected (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const updates = await ConnectionRequest.find({
      'to.id': userId,
      'to.type': 'User',
      status: { $in: ['accepted', 'rejected'] },
      updatedAt: { $gte: sevenDaysAgo }
    }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      notifications: {
        pending: incomingRequests,
        updates: updates
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// ========== NEW ROUTES: Full notification system ==========
// All routes below require authentication
router.use(protect);

// GET all notifications (from Notification model)
router.get('/', getNotifications);

// GET unread count
router.get('/unread/count', getUnreadCount);

// PATCH mark notification as read
router.patch('/:notificationId/read', markAsRead);

// PATCH mark all as read
router.patch('/read-all', markAllAsRead);

// DELETE single notification
router.delete('/:notificationId', deleteNotification);

// DELETE all notifications (clear all)
router.delete('/clear-all', async (req, res) => {
  try {
    const userId = req.user._id;  // ← FIXED: Changed from req.user.id
    const Notification = (await import('../models/Notifications.js')).default;  // ← FIXED: Added 's'
    const Trainer = (await import('../models/Trainer.js')).default;
    
    const isTrainer = await Trainer.findById(userId);
    const recipientType = isTrainer ? 'Trainer' : 'User';
    
    await Notification.deleteMany({
      'recipient.id': userId,
      'recipient.type': recipientType
    });
    
    res.status(200).json({
      success: true,
      message: 'All notifications cleared'
    });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// POST accept connection request
router.post('/connection/:requestId/accept', acceptConnectionRequest);

// POST decline connection request
router.post('/connection/:requestId/decline', declineConnectionRequest);

export default router;