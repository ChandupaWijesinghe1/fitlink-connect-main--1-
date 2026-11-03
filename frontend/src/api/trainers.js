import API from './axios';

// Get all trainers
export const getAllTrainers = async () => {
  const response = await API.get('/trainers');
  return response.data.trainers;
};

// Get single trainer by ID
export const getTrainerById = async (trainerId) => {
  const response = await API.get(`/trainers/${trainerId}`);
  return response.data.trainer;
};

// Search trainers by name or specialization
export const searchTrainers = async (query) => {
  const response = await API.get(`/trainers/search?query=${query}`);
  return response.data.trainers;
};

// Get trainer's clients
export const getTrainerClients = async (trainerId) => {
  const response = await API.get(`/trainers/${trainerId}/clients`);
  return response.data.clients;
};

// Get all users (for trainer to browse and connect)
export const getAllUsers = async () => {
  const response = await API.get('/trainers/users/all');
  return response.data.users;
};

export const getTrainerFeedPosts = async () => {
  const response = await API.get('/trainers/feed');
  return response.data.posts;
};

export const getMyTrainerProfile = async () => {
  const response = await API.get('/trainers/me');
  return response.data.trainer;
};

export const updateMyTrainerProfile = async (profileData) => {
  const response = await API.patch('/trainers/me', profileData);
  return response.data.trainer;
};

export const addTrainerPost = async (postData) => {
  const response = await API.post('/trainers/me/posts', postData);
  return response.data.posts;
};

export const deleteTrainerPost = async (postId) => {
  const response = await API.delete(`/trainers/me/posts/${postId}`);
  return response.data.posts;
};