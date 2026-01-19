import API from './axios';

// Get all conversations
export const getAllConversations = async () => {
  const response = await API.get('/messages/conversations');
  return response.data;
};

// Get conversation with specific user
export const getConversation = async (userId) => {
  const response = await API.get(`/messages/conversation/${userId}`);
  return response.data;
};

// Send text message
export const sendMessage = async (messageData) => {
  const response = await API.post('/messages/send', messageData);
  return response.data;
};

// Share schedule
export const shareSchedule = async (scheduleData) => {
  const response = await API.post('/messages/share-schedule', scheduleData);
  return response.data;
};

// Mark messages as read
export const markMessagesAsRead = async (userId) => {
  const response = await API.put(`/messages/read/${userId}`);
  return response.data;
};

// Get unread count
export const getUnreadCount = async () => {
  const response = await API.get('/messages/unread-count');
  return response.data;
};

// Get trainer's clients (for trainers)
export const getTrainerClients = async () => {
  const response = await API.get('/messages/trainer/clients');
  return response.data;
};