import API from './axios';

export const getProgress = async () => {
  const response = await API.get('/progress');
  return response.data.progress;
};

export const getClientProgressForTrainer = async (clientId) => {
  const response = await API.get(`/progress/client/${clientId}`);
  return response.data;
};

export const updateProgressSettings = async (settings) => {
  const response = await API.put('/progress/settings', settings);
  return response.data.progress;
};

export const saveDailyLog = async (log) => {
  const response = await API.post('/progress/daily', log);
  return response.data.progress;
};

export const saveMeasurement = async (measurement) => {
  const response = await API.post('/progress/measurements', measurement);
  return response.data.progress;
};

export const saveProgressPhotos = async (photos) => {
  const response = await API.post('/progress/photos', photos);
  return response.data.progress;
};
