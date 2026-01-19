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