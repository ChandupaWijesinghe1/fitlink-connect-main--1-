import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (userId: string) => {
  if (!socket) {
    socket = io('http://localhost:5000', {
      autoConnect: false,
    });

    socket.connect();
    
    // Join with user ID
    socket.emit('user:join', userId);
    
    console.log('🔌 Socket connected:', socket.id);
  }
  
  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket disconnected');
  }
};