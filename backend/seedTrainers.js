import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Trainer from "./models/Trainer.js";

dotenv.config();

const DEMO_PASSWORD = "Trainer123!";

const poster = (title, subtitle, from, to) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="900">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="640" cy="120" r="160" fill="white" opacity="0.12"/>
    <circle cx="80" cy="760" r="180" fill="black" opacity="0.18"/>
    <text x="56" y="430" fill="white" font-size="42" font-family="Arial" font-weight="700">${title}</text>
    <text x="56" y="490" fill="white" font-size="24" font-family="Arial" opacity="0.9">${subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

const avatar = (initials, color) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <rect width="100%" height="100%" fill="${color}"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="72" font-family="Arial" font-weight="700">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

const daysAgo = (n) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date;
};

const trainers = [
  {
    name: "Maya Fernando",
    email: "maya.strength@fitconnect.local",
    phone: "0771000001",
    specialization: "Strength & Conditioning",
    experience: 8,
    bio: "Helping clients build muscle with simple, progressive lifting plans.",
    profileImage: avatar("MF", "#f97316"),
    certifications: [{ name: "NASM CPT", issuedBy: "NASM", issuedDate: new Date("2020-01-01") }],
    posts: [
      {
        image: poster("Leg Day", "Squats • Lunges • RDLs", "#ea580c", "#111827"),
        caption: "Leg day complete. Slow eccentrics on squats today.",
        createdAt: daysAgo(1),
      },
      {
        image: poster("Push Strength", "Bench • Overhead press", "#fb923c", "#0f172a"),
        caption: "Upper-body push session. Leave 2 reps in reserve.",
        createdAt: daysAgo(4),
      },
    ],
  },
  {
    name: "Ravi Perera",
    email: "ravi.hiit@fitconnect.local",
    phone: "0771000002",
    specialization: "HIIT & Fat Loss",
    experience: 6,
    bio: "Short, hard sessions for busy people who want to drop fat.",
    profileImage: avatar("RP", "#14b8a6"),
    certifications: [{ name: "ACE Personal Trainer", issuedBy: "ACE", issuedDate: new Date("2021-03-01") }],
    posts: [
      {
        image: poster("20-min HIIT", "Bike • Burpees • Row", "#0d9488", "#042f2e"),
        caption: "Twenty minutes. Heart rate up, form first.",
        createdAt: daysAgo(2),
      },
      {
        image: poster("Core Finish", "Plank • Mountain climbers", "#2dd4bf", "#115e59"),
        caption: "Core finisher after conditioning. Keep the ribs down.",
        createdAt: daysAgo(6),
      },
    ],
  },
  {
    name: "Nisha Jayawardena",
    email: "nisha.yoga@fitconnect.local",
    phone: "0771000003",
    specialization: "Yoga & Mobility",
    experience: 10,
    bio: "Mobility and breath work for athletes who sit too much.",
    profileImage: avatar("NJ", "#8b5cf6"),
    certifications: [{ name: "RYT-200", issuedBy: "Yoga Alliance", issuedDate: new Date("2018-06-01") }],
    posts: [
      {
        image: poster("Hip Mobility", "90/90 • Pigeon • Flow", "#7c3aed", "#1e1b4b"),
        caption: "Open the hips before your next squat session.",
        createdAt: daysAgo(0),
      },
      {
        image: poster("Morning Flow", "Sun salutations", "#a78bfa", "#312e81"),
        caption: "10-minute morning flow. Move slow, breathe slower.",
        createdAt: daysAgo(3),
      },
      {
        image: poster("Desk Reset", "Thoracic openers", "#c4b5fd", "#4c1d95"),
        caption: "If you sit all day, this is your reset.",
        createdAt: daysAgo(8),
      },
    ],
  },
  {
    name: "Daniel Cruz",
    email: "daniel.nutrition@fitconnect.local",
    phone: "0771000004",
    specialization: "Nutrition Coaching",
    experience: 7,
    bio: "High-protein meals that still fit a normal life.",
    profileImage: avatar("DC", "#22c55e"),
    certifications: [{ name: "Precision Nutrition L1", issuedBy: "PN", issuedDate: new Date("2019-09-01") }],
    posts: [
      {
        image: poster("Protein Bowl", "Chicken • Rice • Veg", "#16a34a", "#052e16"),
        caption: "Simple lunch: 40g protein, rice, and a pile of veg.",
        createdAt: daysAgo(1),
      },
      {
        image: poster("Prep Sunday", "4 meals ready", "#4ade80", "#14532d"),
        caption: "Batch cook once. Eat well all week.",
        createdAt: daysAgo(5),
      },
    ],
  },
  {
    name: "Amaya Silva",
    email: "amaya.box@fitconnect.local",
    phone: "0771000005",
    specialization: "Boxing & Conditioning",
    experience: 5,
    bio: "Pad work and conditioning for confidence and cardio.",
    profileImage: avatar("AS", "#ef4444"),
    certifications: [{ name: "Boxing Coach L1", issuedBy: "AIBA", issuedDate: new Date("2022-02-01") }],
    posts: [
      {
        image: poster("Pad Work", "Jab • Cross • Hook", "#dc2626", "#450a0a"),
        caption: "Rounds on the pads. Snap the jab, sit down on the cross.",
        createdAt: daysAgo(2),
      },
      {
        image: poster("Footwork", "Pivot • Angle", "#f87171", "#7f1d1d"),
        caption: "Footwork drill of the week. Stay light, stay balanced.",
        createdAt: daysAgo(7),
      },
    ],
  },
];

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) {
  console.error("Missing MONGODB_URI in backend/.env");
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(mongoUri);
  console.log("Connected to", mongoose.connection.name);

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const trainer of trainers) {
    const saved = await Trainer.findOneAndUpdate(
      { email: trainer.email },
      {
        ...trainer,
        password,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Seeded ${saved.name} (${saved.email}) with ${saved.posts.length} posts`);
  }

  console.log("\nLogin any seeded trainer with password:", DEMO_PASSWORD);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
