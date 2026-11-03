import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import ClientProgress from "./models/ClientProgress.js";
import { estimateNavyBodyFat } from "./utils/navyBodyFat.js";

dotenv.config();

const DEMO_EMAIL = "progress.demo@fitconnect.local";
const DEMO_PASSWORD = "Progress123!";

const isoDate = (daysAgo) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

const placeholderPhoto = (label, color) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">
    <rect width="100%" height="100%" fill="${color}"/>
    <rect y="0" width="100%" height="160" fill="#111827" opacity="0.55"/>
    <text x="50%" y="54%" text-anchor="middle" fill="white" font-size="28" font-family="Arial">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) {
  console.error("Missing MONGODB_URI in backend/.env");
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(mongoUri);
  console.log("Connected to", mongoose.connection.name);

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await User.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      name: "Alex Progress",
      email: DEMO_EMAIL,
      password,
      phone: "0771234567",
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const gender = "male";
  const heightCm = 178;
  const dailyLogs = [];

  for (let i = 89; i >= 0; i -= 1) {
    const progress = (89 - i) / 89;
    dailyLogs.push({
      date: isoDate(i),
      weight: Number((84.5 - progress * 4.2 + Math.sin(i / 6) * 0.25).toFixed(1)),
      calories: Math.round(2050 + Math.sin(i / 4) * 180 + (i % 5) * 20),
      protein: Math.round(125 + Math.sin(i / 5) * 18),
      steps: Math.round(7200 + Math.sin(i / 3) * 1600 + (i % 7) * 120),
      workoutCompleted: [1, 2, 4, 6].includes(new Date(`${isoDate(i)}T12:00:00`).getDay()),
    });
  }

  const measurements = [];
  for (let week = 11; week >= 0; week -= 1) {
    const date = isoDate(week * 7);
    const t = (11 - week) / 11;
    const waist = Number((92 - t * 4.5).toFixed(1));
    const neck = Number((39.5 - t * 0.8).toFixed(1));
    const hip = Number((99 - t * 2.2).toFixed(1));
    measurements.push({
      date,
      chest: Number((104 - t * 1.8).toFixed(1)),
      waist,
      hip,
      arm: Number((34.5 + t * 0.9).toFixed(1)),
      thigh: Number((58 - t * 1.1).toFixed(1)),
      neck,
      estimatedBodyFat: estimateNavyBodyFat({ gender, heightCm, waist, neck, hip }),
    });
  }

  const photos = [
    {
      date: isoDate(60),
      front: placeholderPhoto("BEFORE FRONT", "#b45309"),
      side: placeholderPhoto("BEFORE SIDE", "#c2410c"),
      back: placeholderPhoto("BEFORE BACK", "#9a3412"),
    },
    {
      date: isoDate(5),
      front: placeholderPhoto("AFTER FRONT", "#0f766e"),
      side: placeholderPhoto("AFTER SIDE", "#0d9488"),
      back: placeholderPhoto("AFTER BACK", "#115e59"),
    },
  ];

  await ClientProgress.findOneAndUpdate(
    { userId: user._id },
    {
      userId: user._id,
      gender,
      heightCm,
      goals: {
        weight: 78,
        bodyFat: 15,
        calories: 2200,
        protein: 140,
        steps: 8000,
        weeklyWorkouts: 4,
      },
      dailyLogs,
      measurements,
      photos,
    },
    { upsert: true, new: true }
  );

  console.log("Seeded demo client progress");
  console.log("Login as CLIENT with:");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log("Then open Profile -> Progress");
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
