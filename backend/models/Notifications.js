import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipient.type'
    },
    type: {
      type: String,
      required: true,
      enum: ['User', 'Trainer']
    }
  },
  sender: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'sender.type'
    },
    type: {
      type: String,
      enum: ['User', 'Trainer', 'System']
    },
    name: String,
    profileImage: String
  },
  type: {
    type: String,
    required: true,
    enum: ['message', 'connection', 'connection_accepted', 'connection_declined', 'schedule', 'system']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  actionUrl: {
    type: String
  },
  metadata: {
    requestId: mongoose.Schema.Types.ObjectId,
    scheduleId: mongoose.Schema.Types.ObjectId,
    messageId: mongoose.Schema.Types.ObjectId
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
notificationSchema.index({ 'recipient.id': 1, 'recipient.type': 1, createdAt: -1 });
notificationSchema.index({ isRead: 1, createdAt: -1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = await this.create({
      recipient: data.recipient,
      sender: data.sender,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      metadata: data.metadata
    });
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId, userType) {
  return await this.countDocuments({
    'recipient.id': userId,
    'recipient.type': userType,
    isRead: false
  });
};

// Instance method to mark as read
notificationSchema.statics.markAsRead = async function(notificationId) {
  return await this.findByIdAndUpdate(
    notificationId,
    {
      isRead: true,
      readAt: new Date()
    },
    { new: true }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;