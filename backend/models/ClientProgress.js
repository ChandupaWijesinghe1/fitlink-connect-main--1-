import mongoose from "mongoose";

const dailyLogSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    weight: { type: Number, default: null },
    calories: { type: Number, default: null },
    protein: { type: Number, default: null },
    steps: { type: Number, default: null },
    workoutCompleted: { type: Boolean, default: false },
  },
  { _id: false }
);

const measurementSchema = new mongoose.Schema({
  date: { type: String, required: true },
  chest: { type: Number, default: null },
  waist: { type: Number, default: null },
  hip: { type: Number, default: null },
  arm: { type: Number, default: null },
  thigh: { type: Number, default: null },
  neck: { type: Number, default: null },
  estimatedBodyFat: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
});

const photoSetSchema = new mongoose.Schema({
  date: { type: String, required: true },
  front: { type: String, default: null },
  side: { type: String, default: null },
  back: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

const clientProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      default: "male",
    },
    heightCm: { type: Number, default: null },
    goals: {
      weight: { type: Number, default: null },
      bodyFat: { type: Number, default: null },
      calories: { type: Number, default: 2200 },
      protein: { type: Number, default: 140 },
      steps: { type: Number, default: 8000 },
      weeklyWorkouts: { type: Number, default: 4 },
    },
    dailyLogs: [dailyLogSchema],
    measurements: [measurementSchema],
    photos: [photoSetSchema],
  },
  { timestamps: true }
);

export default mongoose.model("ClientProgress", clientProgressSchema);
