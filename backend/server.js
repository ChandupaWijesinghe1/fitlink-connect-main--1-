import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";

// Import models
import User from './models/User.js';

// Auth, validation and real-time helpers
import { protect, requireSelf } from "./middleware/authMiddleware.js";
import { validateIdParam } from "./middleware/validators.js";
import { getActiveUserCount, registerSocketHandlers } from "./socket/index.js";

// Import your existing auth routes
import authRoutes from "./routes/authRoutes.js";

// Import new routes for exercises and schedules
import exerciseRoutes from "./routes/exercises.js";
import scheduleRoutes from "./routes/schedules.js";
import trainerScheduleRoutes from "./routes/trainerSchedules.js";
import connectionRequestRoutes from './routes/connectionRequests.js';
import notificationRoutes from './routes/Notificationroutes.js';
import messageRoutes from './routes/messageRoutes.js';
import trainerRoutes from './routes/trainerRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import { stopContentRanker, warmContentRanker } from './utils/contentRanker.js';

dotenv.config();

// ============ DEBUG LOGGING ============
console.log('🔍 Environment:', process.env.NODE_ENV);
console.log('🔍 MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('🔍 PORT:', process.env.PORT || 5000);
// ========================================

const app = express();
const httpServer = createServer(app);

// When the API runs behind a reverse proxy (Render, Railway, Nginx...), set
// TRUST_PROXY=1 so the login rate limit counts each visitor's own IP address
// instead of the proxy's.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
}

// Determine allowed origins based on environment
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5000',
  process.env.FRONTEND_URL || 'https://fitlink-connect.vercel.app',
  'https://fitlink-connect-efac.vercel.app'
];

// A real localhost origin such as http://localhost:8080 (not just any URL containing the word)
const LOCALHOST_ORIGIN = /^https?:\/\/localhost(:\d+)?$/;
const isAllowedOrigin = (origin) =>
  !origin || LOCALHOST_ORIGIN.test(origin) || allowedOrigins.includes(origin);

// Socket.io setup with CORS
const io = new Server(httpServer, {
  cors: {
    // The result must go through the callback: returning a value here leaves
    // every Socket.io handshake hanging.
    origin: function (origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ==================== MIDDLEWARE - CORRECT ORDER! ====================
// Security headers (also removes the X-Powered-By header)
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost origins in development
    if (LOCALHOST_ORIGIN.test(origin)) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

// Add request logging middleware for debugging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    let bodyPreview = req.body && JSON.stringify(req.body).length > 500
      ? '[large payload omitted]'
      : req.body;
    // Login and signup bodies contain passwords, so they are never logged
    if (req.path.startsWith('/api/auth')) bodyPreview = '[hidden]';
    console.log('📦 Body:', bodyPreview);
    console.log('📋 Headers:', req.headers['content-type']);
    next();
  });
}

// Socket.io: connections are authenticated with the login token (see socket/index.js)
registerSocketHandlers(io);

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Fitness App Backend is running',
    timestamp: new Date().toISOString(),
    activeUsers: getActiveUserCount(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get connected trainers for a user - own account only
app.get('/api/user/my-trainers/:userId', protect, validateIdParam('userId'), requireSelf('userId'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📥 GET /api/user/my-trainers/${userId}`);
    
    const user = await User.findById(userId).populate('trainer');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const trainers = user.trainer ? [user.trainer] : [];

    console.log(`✅ Found ${trainers.length} connected trainers`);

    res.json({
      success: true,
      trainers
    });
  } catch (error) {
    console.error('❌ Error fetching connected trainers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch connected trainers',
      error: error.message
    });
  }
});

// Routes - Register BEFORE other middleware
app.use("/api/auth", authRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/trainer", trainerScheduleRoutes);
app.use('/api/connections', connectionRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/progress', progressRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "Fitness App API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      exercises: "/api/exercises",
      schedules: "/api/schedules",
      trainers: "/api/trainers",
      connections: "/api/connections",
      messages: "/api/messages",
      notifications: "/api/notifications"
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: '/api'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully!");
    console.log("📦 Database:", mongoose.connection.name);
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    console.error("Full error:", err);
    process.exit(1); // Exit if database connection fails
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, closing HTTP server');
  stopContentRanker();
  httpServer.close(() => {
    console.log('💤 HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('💤 MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Start Server with Socket.io
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  warmContentRanker();
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io ready for real-time messaging`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 CORS enabled for: ${allowedOrigins.join(', ')}`);
});