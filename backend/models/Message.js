import mongoose from 'mongoose';

// backend/models/Message.js
const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'sender.type'
    },
    type: {
      type: String,
      required: true,
      enum: ['User', 'Trainer']
    },
    name: {
      type: String,
      required: true
    }
  },
  receiver: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'receiver.type'
    },
    type: {
      type: String,
      required: true,
      enum: ['User', 'Trainer']
    },
    name: {
      type: String,
      required: true
    }
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'schedule'],  // ← Add 'schedule'
    default: 'text'
  },
  // NEW: Store schedule reference
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    default: null
  },
  scheduleData: {
    type: Object,
    default: null  // Store schedule details for quick preview
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

export default mongoose.model('Message', messageSchema);