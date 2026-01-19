import API from './axios';

// Get all notifications for a user (connection requests) - OLD ENDPOINT
export const getNotificationsForUser = async (userId) => {
  try {
    const response = await API.get(`/notifications/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    throw error;
  }
};

// Get all notifications from the new notificationController
export const getAllNotifications = async () => {
  try {
    const response = await API.get('/notifications');
    return response.data;
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    throw error;
  }
};

// Get unread count
export const getUnreadCount = async () => {
  try {
    const response = await API.get('/notifications/unread/count');
    return response.data.unreadCount;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await API.patch(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all as read
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await API.patch('/notifications/read-all');
    return response.data;
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
};

// Delete notification
export const deleteNotification = async (notificationId) => {
  try {
    const response = await API.delete(`/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

// Clear all notifications
export const clearAllNotifications = async () => {
  try {
    const response = await API.delete('/notifications/clear-all');
    return response.data;
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    throw error;
  }
};

// Accept connection request from notification
export const acceptConnectionFromNotification = async (requestId) => {
  try {
    const response = await API.post(`/notifications/connection/${requestId}/accept`);
    return response.data;
  } catch (error) {
    console.error('Error accepting connection:', error);
    throw error;
  }
};

// Decline connection request from notification
export const declineConnectionFromNotification = async (requestId) => {
  try {
    const response = await API.post(`/notifications/connection/${requestId}/decline`);
    return response.data;
  } catch (error) {
    console.error('Error declining connection:', error);
    throw error;
  }
};