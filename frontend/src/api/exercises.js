import API from './axios';

// Get all exercises
export const getAllExercises = async () => {
  const response = await API.get('/exercises');
  return response.data;
};

// Search exercises by name
export const searchExercises = async (query) => {
  const response = await API.get(`/exercises/search?q=${query}`);
  return response.data;
};

// Get single exercise
export const getExerciseById = async (exerciseId) => {
  const response = await API.get(`/exercises/${exerciseId}`);
  return response.data;
};

// Create new exercise
export const createExercise = async (exerciseData) => {
  const response = await API.post('/exercises', exerciseData);
  return response.data;
};

// Update exercise
export const updateExercise = async (exerciseId, exerciseData) => {
  const response = await API.put(`/exercises/${exerciseId}`, exerciseData);
  return response.data;
};

// Delete exercise
export const deleteExercise = async (exerciseId) => {
  const response = await API.delete(`/exercises/${exerciseId}`);
  return response.data;
};