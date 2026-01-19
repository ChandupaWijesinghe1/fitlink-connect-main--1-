import mongoose from "mongoose";

const connectionRequestSchema = new mongoose.Schema({
  from: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'from.type' },
    type: { type: String, required: true, enum: ['Trainer', 'User'] },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  to: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'to.type' },
    type: { type: String, required: true, enum: ['Trainer', 'User'] },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
connectionRequestSchema.index({ 'from.id': 1, 'to.id': 1 });
connectionRequestSchema.index({ status: 1 });

const ConnectionRequest = mongoose.model("ConnectionRequest", connectionRequestSchema);

export default ConnectionRequest;