import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ClientProgress from "../models/ClientProgress.js";
import Trainer from "../models/Trainer.js";

const RANKER_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../ml/content-ranker"
);
const RANK_SCRIPT = path.join(RANKER_ROOT, "rank.py");
const MODEL_PATH = path.join(RANKER_ROOT, "models", "content_ranker.joblib");

const SPECIALTY_KEYS = ["strength", "hiit", "yoga", "nutrition", "boxing"];

export function mapSpecialty(text = "") {
  const value = String(text).toLowerCase();
  if (value.includes("yoga") || value.includes("mobility")) return "yoga";
  if (value.includes("hiit") || value.includes("fat")) return "hiit";
  if (value.includes("nutrition") || value.includes("diet") || value.includes("meal")) {
    return "nutrition";
  }
  if (value.includes("box")) return "boxing";
  if (value.includes("strength") || value.includes("condition") || value.includes("muscle")) {
    return "strength";
  }
  return SPECIALTY_KEYS.find((key) => value.includes(key)) || "strength";
}

export function mapDifficulty(caption = "") {
  const value = String(caption).toLowerCase();
  if (/(beginner|easy|mobility|desk|morning flow)/.test(value)) return "beginner";
  if (/(advanced|hard|hiit|twenty minute|pad work)/.test(value)) return "advanced";
  return "intermediate";
}

function pythonCommand() {
  if (process.env.CONTENT_RANKER_PYTHON) return process.env.CONTENT_RANKER_PYTHON;
  const win = path.join(RANKER_ROOT, ".venv", "Scripts", "python.exe");
  const unix = path.join(RANKER_ROOT, ".venv", "bin", "python");
  if (fs.existsSync(win)) return win;
  if (fs.existsSync(unix)) return unix;
  return "python";
}

function daysAgo(date) {
  if (!date) return 0;
  const ms = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function experienceBand(createdAt) {
  if (!createdAt) return 1;
  const years = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (years < 0.5) return 0;
  if (years < 2) return 1;
  return 2;
}

export async function buildClientFeatures(user) {
  const connectedId = user?.trainer ? String(user.trainer) : "";
  let preferred = "strength";
  if (connectedId) {
    const trainer = await Trainer.findById(connectedId).select("specialization");
    if (trainer?.specialization) preferred = mapSpecialty(trainer.specialization);
  }

  const progress = await ClientProgress.findOne({ userId: user._id }).select("goals");
  return {
    preferred_specialty: preferred,
    experience: experienceBand(user.createdAt),
    workouts_per_week: progress?.goals?.weeklyWorkouts || 4,
    connected_trainer_id: connectedId,
  };
}

export function postsToRankPayload(posts) {
  return posts.map((post) => ({
    post_id: String(post._id),
    trainer_id: String(post.trainer?._id || ""),
    trainer_name: post.trainer?.name || "",
    specialty: mapSpecialty(post.trainer?.specialization),
    difficulty: mapDifficulty(post.caption),
    days_ago: daysAgo(post.createdAt),
    caption: post.caption || "",
  }));
}

function spawnRank(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand(), [RANK_SCRIPT, "--stdin"], {
      cwd: RANKER_ROOT,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("content ranker timed out"));
    }, 8000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `rank.py exited ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`rank.py returned invalid JSON: ${stdout.slice(0, 200)}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export function applyRanking(posts, rankedRows) {
  const scores = new Map(
    (rankedRows || []).map((row) => [String(row.post_id), Number(row.score)])
  );
  return [...posts]
    .map((post) => ({
      ...post,
      rankScore: scores.has(String(post._id)) ? scores.get(String(post._id)) : 0,
    }))
    .sort((a, b) => b.rankScore - a.rankScore || new Date(b.createdAt) - new Date(a.createdAt));
}

export async function rankClientFeed(user, posts) {
  if (!posts.length || !fs.existsSync(MODEL_PATH) || !fs.existsSync(RANK_SCRIPT)) {
    return { posts, ranked: false };
  }

  try {
    const client = await buildClientFeatures(user);
    const result = await spawnRank({
      client,
      posts: postsToRankPayload(posts),
    });
    return { posts: applyRanking(posts, result.posts), ranked: true };
  } catch (error) {
    console.warn("Content ranker skipped:", error.message);
    return { posts, ranked: false };
  }
}
