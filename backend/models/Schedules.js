import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  days: [{
    dayNumber: {
      type: Number,
      required: true
    },
    exercises: [{
      exerciseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exercise',
        required: true
      },
      name: {
        type: String,
        required: true
      },
      sets: {
        type: Number,
        required: true
      },
      reps: {
        type: Number,
        required: true
      }
    }]
  }],
  userId: {
    type: String,
    required: true
  },
  trainer: {
    type: String,
    default: 'self'
  }
}, {
  timestamps: true
});

export default mongoose.model('Schedule', scheduleSchema);``