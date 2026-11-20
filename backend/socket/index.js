import mongoose from 'mongoose';
import Message from '../models/Message.js';
import { resolveAccountFromToken } from '../middleware/authMiddleware.js';

let io = null;

// Each logged-in user gets a private room, so several tabs or devices all receive events.
const userRoom = (userId) => `user:${userId}`;

// userId -> number of open sockets
const activeUsers = new Map();

export const getActiveUserCount = () => activeUsers.size;

// Lets the REST controllers push an event to a user if they are online.
export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(userRoom(String(userId))).emit(event, payload);
};

const isId = (value) =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);

export const registerSocketHandlers = (server) => {
  io = server;

  // Handshake: the client must send its login token as `auth: { token }`.
  // The user id comes from that token, never from data the client sends later.
  io.use(async (socket, next) => {
    try {
      const resolved = await resolveAccountFromToken(socket.handshake.auth?.token);
      if (!resolved) return next(new Error('Unauthorized'));

      socket.data.userId = String(resolved.account._id);
      socket.data.role = resolved.role;
      socket.data.tokenExpiresAt = resolved.exp ? resolved.exp * 1000 : null;
      return next();
    } catch (error) {
      console.error('Socket auth error:', error);
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, tokenExpiresAt } = socket.data;

    socket.join(userRoom(userId));
    activeUsers.set(userId, (activeUsers.get(userId) || 0) + 1);
    console.log(`✅ User ${userId} connected with socket ${socket.id}`);

    // Close the connection when the login token runs out
    let expiryTimer = null;
    if (tokenExpiresAt) {
      const msLeft = Math.max(tokenExpiresAt - Date.now(), 0);
      expiryTimer = setTimeout(() => socket.disconnect(true), msLeft);
    }

    socket.on('message:markRead', async (data) => {
      try {
        const conversationId = data?.conversationId;
        if (typeof conversationId !== 'string' || !conversationId.split('_').includes(userId)) {
          socket.emit('message:error', { error: 'Invalid conversation' });
          return;
        }

        await Message.updateMany(
          { conversationId, 'receiver.id': userId, isRead: false },
          { $set: { isRead: true, readAt: new Date() } }
        );

        const otherUserId = conversationId.split('_').find((id) => id !== userId);
        if (isId(otherUserId)) {
          emitToUser(otherUserId, 'message:read', { conversationId, userId });
        }
      } catch (error) {
        console.error('Mark read error:', error);
        socket.emit('message:error', { error: 'Could not mark messages as read' });
      }
    });

    socket.on('user:typing', (data) => {
      if (isId(data?.receiverId)) {
        emitToUser(data.receiverId, 'user:typing', { senderId: userId });
      }
    });

    socket.on('user:stopTyping', (data) => {
      if (isId(data?.receiverId)) {
        emitToUser(data.receiverId, 'user:stopTyping', { senderId: userId });
      }
    });

    socket.on('disconnect', () => {
      clearTimeout(expiryTimer);
      const remaining = (activeUsers.get(userId) || 1) - 1;
      if (remaining > 0) {
        activeUsers.set(userId, remaining);
      } else {
        activeUsers.delete(userId);
      }
      console.log(`👋 User ${userId} disconnected`);
    });
  });
};
