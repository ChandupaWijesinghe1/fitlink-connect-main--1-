import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

// Import models
import Trainer from "./models/Trainer.js";
import User from './models/User.js';
import Message from './models/Message.js';

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

dotenv.config();

// ============ DEBUG LOGGING ============
console.log('🔍 Raw MONGODB_URI:', process.env.MONGODB_URI);
console.log('🔍 MONGODB_URI length:', process.env.MONGODB_URI?.length);
console.log('🔍 First 80 chars:', process.env.MONGODB_URI?.substring(0, 80));
console.log('🔍 Has PORT in URI?:', process.env.MONGODB_URI?.includes('PORT'));
// ========================================

const app = express();
const httpServer = createServer(app);

// Socket.io setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:8080'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ==================== MIDDLEWARE - CORRECT ORDER! ====================
// Enable CORS for all origins (for testing) - you can restrict this later
app.use(cors({
  origin: true, // Allow all origins for testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  console.log('📦 Body:', req.body);
  console.log('📋 Headers:', req.headers['content-type']);
  next();
});

// Store active users with their socket IDs
const activeUsers = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 New socket connection:', socket.id);

  socket.on('user:join', (userId) => {
    activeUsers.set(userId, socket.id);
    console.log(`✅ User ${userId} joined with socket ${socket.id}`);
    console.log(`👥 Active users: ${activeUsers.size}`);
  });

  socket.on('message:send', async (data) => {
    try {
      const { senderId, senderType, receiverId, receiverType, message } = data;

      const SenderModel = senderType === 'Trainer' ? Trainer : User;
      const sender = await SenderModel.findById(senderId);
      
      if (!sender) {
        socket.emit('message:error', { error: 'Sender not found' });
        return;
      }

      const ReceiverModel = receiverType === 'Trainer' ? Trainer : User;
      const receiver = await ReceiverModel.findById(receiverId);
      
      if (!receiver) {
        socket.emit('message:error', { error: 'Receiver not found' });
        return;
      }

      const conversationId = Message.generateConversationId(senderId, receiverId);

      const newMessage = new Message({
        conversationId,
        sender: {
          id: senderId,
          type: senderType,
          name: sender.name
        },
        receiver: {
          id: receiverId,
          type: receiverType,
          name: receiver.name
        },
        message: message.trim()
      });

      await newMessage.save();
      socket.emit('message:sent', newMessage);

      const receiverSocketId = activeUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message:receive', newMessage);
        console.log(`📨 Message delivered to ${receiverId}`);
      } else {
        console.log(`📭 Receiver ${receiverId} is offline`);
      }

    } catch (error) {
      console.error('Socket message error:', error);
      socket.emit('message:error', { error: error.message });
    }
  });

  socket.on('message:markRead', async (data) => {
    try {
      const { conversationId, userId } = data;

      await Message.updateMany(
        {
          conversationId,
          'receiver.id': userId,
          isRead: false
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      );

      const messages = await Message.find({ conversationId }).sort({ createdAt: -1 }).limit(1);
      if (messages.length > 0) {
        const otherUserId = messages[0].sender.id.toString() === userId 
          ? messages[0].receiver.id.toString() 
          : messages[0].sender.id.toString();
        
        const otherUserSocketId = activeUsers.get(otherUserId);
        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit('message:read', { conversationId, userId });
        }
      }

    } catch (error) {
      console.error('Mark read error:', error);
      socket.emit('message:error', { error: error.message });
    }
  });

  socket.on('user:typing', (data) => {
    const { senderId, receiverId } = data;
    const receiverSocketId = activeUsers.get(receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user:typing', { senderId });
    }
  });

  socket.on('user:stopTyping', (data) => {
    const { senderId, receiverId } = data;
    const receiverSocketId = activeUsers.get(receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user:stopTyping', { senderId });
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        console.log(`👋 User ${userId} disconnected`);
        break;
      }
    }
    console.log(`👥 Active users: ${activeUsers.size}`);
  });
});

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Fitness App Backend is running',
    timestamp: new Date().toISOString(),
    activeUsers: activeUsers.size
  });
});

// Get connected trainers for a user
app.get('/api/user/my-trainers/:userId', async (req, res) => {
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
app.use('/api/trainers', trainerRoutes);  // ← Trainer routes (uses trainerController)

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "Fitness App API",
    endpoints: {
      auth: "/api/auth",
      exercises: "/api/exercises",
      schedules: "/api/schedules",
      trainers: "/api/trainers",
      connections: "/api/connections",
      messages: "/api/messages"
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// MongoDB Connection - FIXED VARIABLE NAME
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    console.error("Full error:", err);
  });

// Start Server with Socket.io
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io ready for real-time messaging`);
  console.log(`📡 CORS enabled for testing`);
});