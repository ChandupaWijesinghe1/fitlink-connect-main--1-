import ClientProgress from "../models/ClientProgress.js";
import Trainer from "../models/Trainer.js";
import User from "../models/User.js";
import { estimateNavyBodyFat } from "../utils/navyBodyFat.js";

const emptyProfile = (userId) => ({
  userId,
  gender: "male",
  heightCm: null,
  goals: {
    weight: null,
    bodyFat: null,
    calories: 2200,
    protein: 140,
    steps: 8000,
    weeklyWorkouts: 4,
  },
  dailyLogs: [],
  measurements: [],
  photos: [],
});

const getOrCreate = async (userId) => {
  let profile = await ClientProgress.findOne({ userId });
  if (!profile) {
    profile = await ClientProgress.create(emptyProfile(userId));
  }
  return profile;
};

export const getProgress = async (req, res) => {
  try {
    const profile = await getOrCreate(req.user._id);
    res.json({ success: true, progress: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getClientProgressForTrainer = async (req, res) => {
  try {
    const { clientId } = req.params;
    const trainer = await Trainer.findById(req.user._id);

    if (!trainer) {
      return res.status(403).json({ success: false, message: "Trainers only" });
    }

    const isLinked = (trainer.clients || []).some(
      (id) => id.toString() === clientId
    );
    if (!isLinked) {
      return res.status(403).json({
        success: false,
        message: "You can only view progress for connected clients",
      });
    }

    const client = await User.findById(clientId).select("name email");
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    const profile =
      (await ClientProgress.findOne({ userId: clientId })) || emptyProfile(clientId);

    res.json({
      success: true,
      progress: profile,
      client: { _id: client._id, name: client.name, email: client.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { gender, heightCm, goals } = req.body;
    const profile = await getOrCreate(req.user._id);

    if (gender === "male" || gender === "female") profile.gender = gender;
    if (heightCm !== undefined) profile.heightCm = heightCm || null;
    if (goals) {
      profile.goals.weight = goals.weight ?? profile.goals.weight;
      profile.goals.bodyFat = goals.bodyFat ?? profile.goals.bodyFat;
      profile.goals.calories = goals.calories ?? profile.goals.calories;
      profile.goals.protein = goals.protein ?? profile.goals.protein;
      profile.goals.steps = goals.steps ?? profile.goals.steps;
      profile.goals.weeklyWorkouts = goals.weeklyWorkouts ?? profile.goals.weeklyWorkouts;
    }

    await profile.save();
    res.json({ success: true, progress: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const upsertDailyLog = async (req, res) => {
  try {
    const { date, weight, calories, protein, steps, workoutCompleted } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    const profile = await getOrCreate(req.user._id);
    const existing = profile.dailyLogs.find((log) => log.date === date);

    if (existing) {
      if (weight !== undefined) existing.weight = weight;
      if (calories !== undefined) existing.calories = calories;
      if (protein !== undefined) existing.protein = protein;
      if (steps !== undefined) existing.steps = steps;
      if (workoutCompleted !== undefined) existing.workoutCompleted = workoutCompleted;
    } else {
      profile.dailyLogs.push({
        date,
        weight: weight ?? null,
        calories: calories ?? null,
        protein: protein ?? null,
        steps: steps ?? null,
        workoutCompleted: Boolean(workoutCompleted),
      });
    }

    profile.dailyLogs.sort((a, b) => a.date.localeCompare(b.date));
    await profile.save();
    res.json({ success: true, progress: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addMeasurement = async (req, res) => {
  try {
    const { date, chest, waist, hip, arm, thigh, neck } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    const profile = await getOrCreate(req.user._id);
    const estimatedBodyFat = estimateNavyBodyFat({
      gender: profile.gender,
      heightCm: profile.heightCm,
      waist,
      neck,
      hip,
    });

    profile.measurements.push({
      date,
      chest: chest ?? null,
      waist: waist ?? null,
      hip: hip ?? null,
      arm: arm ?? null,
      thigh: thigh ?? null,
      neck: neck ?? null,
      estimatedBodyFat,
    });
    profile.measurements.sort((a, b) => a.date.localeCompare(b.date));
    await profile.save();
    res.json({ success: true, progress: profile, estimatedBodyFat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addPhotos = async (req, res) => {
  try {
    const { date, front, side, back } = req.body;
    if (!date || (!front && !side && !back)) {
      return res.status(400).json({
        success: false,
        message: "Date and at least one photo are required",
      });
    }

    const profile = await getOrCreate(req.user._id);
    const existing = profile.photos.find((set) => set.date === date);
    if (existing) {
      if (front) existing.front = front;
      if (side) existing.side = side;
      if (back) existing.back = back;
    } else {
      profile.photos.push({ date, front: front || null, side: side || null, back: back || null });
    }
    profile.photos.sort((a, b) => a.date.localeCompare(b.date));
    await profile.save();
    res.json({ success: true, progress: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
