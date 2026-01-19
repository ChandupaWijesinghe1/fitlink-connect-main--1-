import API from './axios';

// Get all schedules for a user
export const getUserSchedules = async (userId) => {
  const response = await API.get(`/schedules?userId=${userId}`);
  return response.data;
};

// Get single schedule by ID
export const getScheduleById = async (scheduleId) => {
  const response = await API.get(`/schedules/${scheduleId}`);
  return response.data;
};

// Create new schedule
export const createSchedule = async (scheduleData) => {
  const response = await API.post('/schedules', scheduleData);
  return response.data;
};

// Update schedule
export const updateSchedule = async (scheduleId, scheduleData) => {
  const response = await API.put(`/schedules/${scheduleId}`, scheduleData);
  return response.data;
};

// Delete schedule
export const deleteSchedule = async (scheduleId) => {
  const response = await API.delete(`/schedules/${scheduleId}`);
  return response.data;
};

// Add this function
export const saveScheduleToUser = async (scheduleId) => {
  const response = await API.post(`/schedules/save/${scheduleId}`);
  return response.data;
};