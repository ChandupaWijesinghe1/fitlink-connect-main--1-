import API from './axios';

// Client Authentication
export const clientSignup = async (userData) => {
  const response = await API.post('/auth/signup', userData);
  return response.data;
};

export const clientLogin = async (credentials) => {
  const response = await API.post('/auth/login', credentials);
  return response.data;
};

// Trainer Authentication
export const trainerSignup = async (trainerData) => {
  const response = await API.post('/auth/trainer-signup', trainerData);
  return response.data;
};

export const trainerLogin = async (credentials) => {
  const response = await API.post('/auth/trainer-login', credentials);
  return response.data;
};