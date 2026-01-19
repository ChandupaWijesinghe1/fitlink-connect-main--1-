import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sets: {
    type: Number,
    default: 3,
    required: true
  },
  reps: {
    type: Number,
    default: 10,
    required: true
  },
  videoUrl: {           // ← Add this field
    type: String,
    trim: true,
    default: null
  },
  description: {        // ← Add this field
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// Add text index for search functionality
exerciseSchema.index({ name: 'text' });

export default mongoose.model('Exercise', exerciseSchema);