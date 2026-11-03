import Notification from '../models/Notifications.js';
import Trainer from '../models/Trainer.js';
import { acceptRequestForUser, rejectRequestForUser } from '../utils/connectionService.js';

// Get all notifications for current user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;  // ← Changed from req.user.id
    
    // Determine user type by checking if they're a trainer
    const isTrainer = await Trainer.findById(userId);
    const recipientType = isTrainer ? 'Trainer' : 'User';
    
    const notifications = await Notification.find({
      'recipient.id': userId,
      'recipient.type': recipientType
    })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 notifications
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;  // ← Changed from req.user.id
    
    const isTrainer = await Trainer.findById(userId);
    const recipientType = isTrainer ? 'Trainer' : 'User';
    
    const count = await Notification.getUnreadCount(userId, recipientType);
    
    res.status(200).json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;  // ← Changed from req.user.id
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ 
        success: false,
        message: 'Notification not found' 
      });
    }
    
    // Verify ownership
    if (notification.recipient.id.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }
    
    const updatedNotification = await Notification.markAsRead(notificationId);
    
    res.status(200).json({
      success: true,
      notification: updatedNotification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;  // ← Changed from req.user.id
    
    const isTrainer = await Trainer.findById(userId);
    const recipientType = isTrainer ? 'Trainer' : 'User';
    
    await Notification.updateMany(
      {
        'recipient.id': userId,
        'recipient.type': recipientType,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;  // ← Changed from req.user.id
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ 
        success: false,
        message: 'Notification not found' 
      });
    }
    
    // Verify ownership
    if (notification.recipient.id.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }
    
    await notification.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Handle connection request accept (from notification)
export const acceptConnectionRequest = async (req, res) => {
  try {
    const connectionRequest = await acceptRequestForUser(req.params.requestId, req.user._id);
    res.status(200).json({
      success: true,
      message: 'Connection request accepted',
      connectionRequest
    });
  } catch (error) {
    console.error('Accept connection error:', error);
    res.status(error.statusCode || 500).json({ 
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Handle connection request decline (from notification)
export const declineConnectionRequest = async (req, res) => {
  try {
    const connectionRequest = await rejectRequestForUser(req.params.requestId, req.user._id);
    res.status(200).json({
      success: true,
      message: 'Connection request declined',
      connectionRequest
    });
  } catch (error) {
    console.error('Decline connection error:', error);
    res.status(error.statusCode || 500).json({ 
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Helper function to create notification (can be called from other controllers)
export const createNotification = async (notificationData) => {
  try {
    return await Notification.createNotification(notificationData);
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};