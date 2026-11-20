import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// The server identifies the user from the login token sent in the handshake,
// so no user id is sent from here.
export const initializeSocket = () => {
  if (!socket) {
    socket = io('http://localhost:5000', {
      autoConnect: false,
      auth: (cb) => cb({ token: localStorage.getItem('token') }),
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection failed:', error.message);
    });

    socket.connect();
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
