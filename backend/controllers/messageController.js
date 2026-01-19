import Message from '../models/Message.js';
import User from '../models/User.js';
import Trainer from '../models/Trainer.js';
import Notification from '../models/Notifications.js';

// Generate conversation ID (consistent for both participants)
const generateConversationId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

// Helper function to create message notification
const createMessageNotification = async (sender, receiver, messageContent, messageId) => {
  try {
    // Don't create notification if sender and receiver are the same
    if (sender.id.toString() === receiver.id.toString()) {
      return;
    }

    await Notification.createNotification({
      recipient: {
        id: receiver.id,
        type: receiver.type
      },
      sender: {
        id: sender.id,
        type: sender.type,
        name: sender.name,
        profileImage: sender.profileImage
      },
      type: 'message',
      title: 'New Message',
      message: `${sender.name}: ${messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent}`,
      actionUrl: '/messages',
      metadata: {
        messageId: messageId
      }
    });

    console.log(`✅ Message notification created for ${receiver.name}`);
  } catch (error) {
    console.error('❌ Error creating message notification:', error);
    // Don't throw error - notification failure shouldn't stop message sending
  }
};

// Share a schedule via message
export const shareSchedule = async (req, res) => {
  try {
    const { receiverId, scheduleId, scheduleTitle, scheduleDays } = req.body;
    const senderId = req.user._id;

    // Determine sender type and get full details
    const senderTrainer = await Trainer.findById(senderId);
    const senderModel = senderTrainer ? 'Trainer' : 'User';
    const senderUser = senderTrainer ? null : await User.findById(senderId);
    const senderName = senderTrainer ? senderTrainer.name : senderUser.name;
    const senderProfileImage = senderTrainer ? senderTrainer.profileImage : senderUser?.profileImage;

    // Determine receiver type and get full details
    const receiverTrainer = await Trainer.findById(receiverId);
    const receiverModel = receiverTrainer ? 'Trainer' : 'User';
    const receiverUser = receiverTrainer ? null : await User.findById(receiverId);
    const receiverName = receiverTrainer ? receiverTrainer.name : receiverUser?.name;
    const receiverProfileImage = receiverTrainer ? receiverTrainer.profileImage : receiverUser?.profileImage;
    
    if (!receiverUser && !receiverTrainer) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Generate conversation ID
    const conversationId = generateConversationId(senderId, receiverId);

    const messageContent = `📅 Shared a workout schedule: ${scheduleTitle}`;

    // Create schedule message
    const message = new Message({
      conversationId,
      sender: {
        id: senderId,
        type: senderModel,
        name: senderName
      },
      receiver: {
        id: receiverId,
        type: receiverModel,
        name: receiverName
      },
      message: messageContent,
      messageType: 'schedule',
      scheduleId: scheduleId,
      scheduleData: {
        title: scheduleTitle,
        days: scheduleDays || 0
      },
      isRead: false
    });

    await message.save();

    // Create notification for the receiver
    await createMessageNotification(
      {
        id: senderId,
        type: senderModel,
        name: senderName,
        profileImage: senderProfileImage
      },
      {
        id: receiverId,
        type: receiverModel,
        name: receiverName,
        profileImage: receiverProfileImage
      },
      messageContent,
      message._id
    );

    res.status(201).json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Share schedule error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text' } = req.body;
    const senderId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Determine sender type and get full details
    const senderTrainer = await Trainer.findById(senderId);
    const senderModel = senderTrainer ? 'Trainer' : 'User';
    const senderUser = senderTrainer ? null : await User.findById(senderId);
    const senderName = senderTrainer ? senderTrainer.name : senderUser.name;
    const senderProfileImage = senderTrainer ? senderTrainer.profileImage : senderUser?.profileImage;

    // Determine receiver type and get full details
    const receiverTrainer = await Trainer.findById(receiverId);
    const receiverModel = receiverTrainer ? 'Trainer' : 'User';
    const receiverUser = receiverTrainer ? null : await User.findById(receiverId);
    const receiverName = receiverTrainer ? receiverTrainer.name : receiverUser?.name;
    const receiverProfileImage = receiverTrainer ? receiverTrainer.profileImage : receiverUser?.profileImage;
    
    if (!receiverUser && !receiverTrainer) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Generate conversation ID
    const conversationId = generateConversationId(senderId, receiverId);

    // Create message (matching your server.js Socket structure)
    const message = new Message({
      conversationId,
      sender: {
        id: senderId,
        type: senderModel,
        name: senderName
      },
      receiver: {
        id: receiverId,
        type: receiverModel,
        name: receiverName
      },
      message: content.trim(),
      messageType,
      isRead: false
    });

    await message.save();

    // Create notification for the receiver
    await createMessageNotification(
      {
        id: senderId,
        type: senderModel,
        name: senderName,
        profileImage: senderProfileImage
      },
      {
        id: receiverId,
        type: receiverModel,
        name: receiverName,
        profileImage: receiverProfileImage
      },
      content.trim(),
      message._id
    );

    res.status(201).json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get conversation between two users
export const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const conversationId = generateConversationId(currentUserId, userId);

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all conversations for a user
export const getAllConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const messages = await Message.find({
      $or: [
        { 'sender.id': userId },
        { 'receiver.id': userId }
      ]
    })
      .sort({ createdAt: -1 });

    const conversationsMap = new Map();

    messages.forEach(message => {
      const conversationId = message.conversationId;
      
      if (!conversationsMap.has(conversationId)) {
        const otherUser = message.sender.id.toString() === userId.toString() 
          ? message.receiver 
          : message.sender;

        conversationsMap.set(conversationId, {
          conversationId,
          otherUser,
          lastMessage: message,
          unreadCount: 0,
          messages: []
        });
      }

      const conversation = conversationsMap.get(conversationId);
      
      if (!message.isRead && message.receiver.id.toString() === userId.toString()) {
        conversation.unreadCount++;
      }
    });

    const conversations = Array.from(conversationsMap.values());

    res.status(200).json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Get all conversations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark messages as read - IMPROVED VERSION
export const markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    console.log('📧 Marking messages as read');
    console.log('Current User ID:', currentUserId);
    console.log('Other User ID:', userId);

    // Validate current user
    if (!currentUserId) {
      console.error('❌ No current user ID found');
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    // Validate target user ID
    if (!userId) {
      console.error('❌ No target user ID provided');
      return res.status(400).json({ 
        success: false,
        message: 'User ID required' 
      });
    }

    // Validate ObjectId format
    const mongoose = await import('mongoose');
    if (!mongoose.default.Types.ObjectId.isValid(userId)) {
      console.error('❌ Invalid user ID format:', userId);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID format' 
      });
    }

    const conversationId = generateConversationId(currentUserId, userId);
    console.log('Conversation ID:', conversationId);

    // Update messages
    const result = await Message.updateMany(
      {
        conversationId,
        'receiver.id': currentUserId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    console.log(`✅ Marked ${result.modifiedCount} messages as read`);

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ 
        success: false,
        message: 'Message not found' 
      });
    }

    if (message.sender.id.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this message' 
      });
    }

    await message.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    const unreadCount = await Message.countDocuments({
      'receiver.id': userId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      unreadCount
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

// Get all clients for a trainer
export const getTrainerClients = async (req, res) => {
  try {
    const trainerId = req.user._id;
    
    // Find ALL clients in the system (not just assigned ones)
    const clients = await User.find({})
      .select('name email profileImage phone createdAt')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: clients.length,
      clients
    });
  } catch (error) {
    console.error('Get trainer clients error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};