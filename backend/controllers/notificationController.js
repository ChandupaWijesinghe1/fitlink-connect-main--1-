import Notification from '../models/Notifications.js';
import ConnectionRequest from '../models/ConnectionRequest.js';
import User from '../models/User.js';
import Trainer from '../models/Trainer.js';

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
    const { requestId } = req.params;
    const trainerId = req.user._id;  // ← Changed from req.user.id
    
    // Verify user is a trainer
    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return res.status(403).json({ 
        success: false,
        message: 'Only trainers can accept connection requests' 
      });
    }
    
    const connectionRequest = await ConnectionRequest.findById(requestId);
    
    if (!connectionRequest) {
      return res.status(404).json({ 
        success: false,
        message: 'Connection request not found' 
      });
    }
    
    if (connectionRequest.trainerId.toString() !== trainerId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }
    
    if (connectionRequest.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Request already processed' 
      });
    }
    
    // Accept the request
    connectionRequest.status = 'accepted';
    connectionRequest.respondedAt = new Date();
    await connectionRequest.save();
    
    // Update user's trainer
    await User.findByIdAndUpdate(connectionRequest.userId, {
      trainer: trainerId
    });
    
    // Create notification for client
    const client = await User.findById(connectionRequest.userId);
    await Notification.createNotification({
      recipient: {
        id: connectionRequest.userId,
        type: 'User'
      },
      sender: {
        id: trainerId,
        type: 'Trainer',
        name: trainer.name,
        profileImage: trainer.profileImage
      },
      type: 'connection_accepted',
      title: 'Connection Accepted',
      message: `${trainer.name} accepted your connection request. You can now message them!`,
      actionUrl: '/messages'
    });
    
    res.status(200).json({
      success: true,
      message: 'Connection request accepted',
      connectionRequest
    });
  } catch (error) {
    console.error('Accept connection error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Handle connection request decline (from notification)
export const declineConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const trainerId = req.user._id;  // ← Changed from req.user.id
    
    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return res.status(403).json({ 
        success: false,
        message: 'Only trainers can decline connection requests' 
      });
    }
    
    const connectionRequest = await ConnectionRequest.findById(requestId);
    
    if (!connectionRequest) {
      return res.status(404).json({ 
        success: false,
        message: 'Connection request not found' 
      });
    }
    
    if (connectionRequest.trainerId.toString() !== trainerId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }
    
    if (connectionRequest.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Request already processed' 
      });
    }
    
    // Decline the request
    connectionRequest.status = 'declined';
    connectionRequest.respondedAt = new Date();
    await connectionRequest.save();
    
    // Create notification for client
    await Notification.createNotification({
      recipient: {
        id: connectionRequest.userId,
        type: 'User'
      },
      sender: {
        id: trainerId,
        type: 'Trainer',
        name: trainer.name,
        profileImage: trainer.profileImage
      },
      type: 'connection_declined',
      title: 'Connection Request Declined',
      message: `${trainer.name} declined your connection request.`,
      actionUrl: '/trainers'
    });
    
    res.status(200).json({
      success: true,
      message: 'Connection request declined',
      connectionRequest
    });
  } catch (error) {
    console.error('Decline connection error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
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