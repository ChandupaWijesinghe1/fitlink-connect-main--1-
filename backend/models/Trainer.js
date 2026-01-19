import mongoose from "mongoose";

const trainerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  specialization: { type: String, required: true },
  clients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  profileImage: { type: String, default: null },
  bio: { type: String, default: "" },
  experience: { type: Number, default: 0 },
  certifications: [{
    name: String,
    issuedBy: String,
    issuedDate: Date
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Trainer = mongoose.model("Trainer", trainerSchema);

export default Trainer;