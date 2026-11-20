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

let worker = null;
let stdoutBuffer = "";
let nextRequestId = 1;
let exitHooked = false;
const pending = new Map();

function hookExit() {
  if (exitHooked) return;
  exitHooked = true;
  process.on("exit", () => {
    if (worker && !worker.killed) worker.kill();
  });
}

function failPending(error) {
  for (const item of pending.values()) {
    clearTimeout(item.timer);
    item.reject(error);
  }
  pending.clear();
}

function handleLine(line) {
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    return;
  }
  if (parsed.ready) {
    console.log("Content ranker ready");
    return;
  }
  const item = pending.get(parsed.request_id);
  if (!item) return;
  pending.delete(parsed.request_id);
  clearTimeout(item.timer);
  if (parsed.error) item.reject(new Error(parsed.error));
  else item.resolve(parsed);
}

function ensureWorker() {
  if (worker && worker.exitCode === null && !worker.killed) return worker;

  stdoutBuffer = "";
  const child = spawn(pythonCommand(), [RANK_SCRIPT, "--serve"], {
    cwd: RANKER_ROOT,
    windowsHide: true,
    env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONWARNINGS: "ignore" },
  });
  worker = child;
  hookExit();

  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk.toString();
    let newline = stdoutBuffer.indexOf("\n");
    while (newline !== -1) {
      const line = stdoutBuffer.slice(0, newline).trim();
      stdoutBuffer = stdoutBuffer.slice(newline + 1);
      if (line) handleLine(line);
      newline = stdoutBuffer.indexOf("\n");
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk.toString()).slice(-2000);
  });
  child.on("error", (error) => {
    if (worker === child) worker = null;
    failPending(error);
  });
  child.on("close", (code) => {
    if (worker === child) worker = null;
    failPending(new Error(stderr.trim() || `rank.py exited ${code}`));
  });
  return child;
}

function spawnRank(payload) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = ensureWorker();
    } catch (error) {
      reject(error);
      return;
    }

    const requestId = nextRequestId++;
    const timer = setTimeout(() => {
      if (!pending.has(requestId)) return;
      pending.delete(requestId);
      reject(new Error("content ranker timed out"));
      child.kill();
      if (worker === child) worker = null;
    }, 8000);

    pending.set(requestId, { resolve, reject, timer });
    child.stdin.write(JSON.stringify({ ...payload, request_id: requestId }) + "\n", (error) => {
      if (!error || !pending.has(requestId)) return;
      clearTimeout(timer);
      pending.delete(requestId);
      reject(error);
    });
  });
}

export function warmContentRanker() {
  if (!fs.existsSync(MODEL_PATH) || !fs.existsSync(RANK_SCRIPT)) return;
  try {
    ensureWorker();
  } catch (error) {
    console.warn("Content ranker warmup skipped:", error.message);
  }
}

export function stopContentRanker() {
  if (worker && !worker.killed) worker.kill();
  worker = null;
}

const RANK_CACHE_TTL_MS = 60 * 1000;
const RANK_CACHE_MAX = 100;
const rankCache = new Map();

function feedCacheKey(user, posts) {
  let modelMtime = 0;
  try {
    modelMtime = fs.statSync(MODEL_PATH).mtimeMs;
  } catch {
    modelMtime = 0;
  }
  const postSig = posts
    .map((post) =>
      [
        post._id,
        daysAgo(post.createdAt),
        post.caption || "",
        post.trainer?._id || "",
        post.trainer?.specialization || "",
      ].join("|")
    )
    .join("\n");
  return `${modelMtime}\n${user?._id || ""}\n${user?.trainer || ""}\n${postSig}`;
}

function cachedFeed(key, posts) {
  const hit = rankCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > RANK_CACHE_TTL_MS) {
    rankCache.delete(key);
    return null;
  }
  const byId = new Map(posts.map((post) => [String(post._id), post]));
  if (hit.rows.length !== posts.length || hit.rows.some((row) => !byId.has(row.id))) {
    rankCache.delete(key);
    return null;
  }
  rankCache.delete(key);
  rankCache.set(key, hit);
  return hit.rows.map((row) => ({ ...byId.get(row.id), rankScore: row.score }));
}

function storeFeed(key, rankedPosts) {
  if (rankCache.has(key)) rankCache.delete(key);
  rankCache.set(key, {
    at: Date.now(),
    rows: rankedPosts.map((post) => ({
      id: String(post._id),
      score: Number(post.rankScore) || 0,
    })),
  });
  while (rankCache.size > RANK_CACHE_MAX) {
    const oldest = rankCache.keys().next().value;
    rankCache.delete(oldest);
  }
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

  const key = feedCacheKey(user, posts);
  const cached = cachedFeed(key, posts);
  if (cached) return { posts: cached, ranked: true };

  try {
    const client = await buildClientFeatures(user);
    const result = await spawnRank({
      client,
      posts: postsToRankPayload(posts),
    });
    const rankedPosts = applyRanking(posts, result.posts);
    storeFeed(key, rankedPosts);
    return { posts: rankedPosts, ranked: true };
  } catch (error) {
    console.warn("Content ranker skipped:", error.message);
    return { posts, ranked: false };
  }
}
