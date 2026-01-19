const socketIo = require('socket.io');

let io;
const userSockets = new Map();

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', (userId) => {
      socket.userId = userId;
      userSockets.set(userId, socket.id);
      console.log(`User ${userId} joined with socket ${socket.id}`);
    });

    socket.on('sendMessage', (messageData) => {
      const { receiverId, message } = messageData;
      const receiverSocketId = userSockets.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receiveMessage', message);
      }
      socket.emit('messageSent', message);
    });

    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      const receiverSocketId = userSockets.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userTyping', {
          userId: socket.userId,
          isTyping
        });
      }
    });

    socket.on('markAsRead', (data) => {
      const { senderId } = data;
      const senderSocketId = userSockets.get(senderId);

      if (senderSocketId) {
        io.to(senderSocketId).emit('messagesRead', {
          readBy: socket.userId
        });
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
        console.log(`User ${socket.userId} disconnected`);
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };