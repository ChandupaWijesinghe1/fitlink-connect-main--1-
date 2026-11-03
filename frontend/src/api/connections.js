import API from './axios';

export const getConnectionOverview = async () => {
  const response = await API.get('/connections/overview');
  return response.data;
};

export const getConnectionStatus = async (otherId, otherType) => {
  const response = await API.get(`/connections/status/${otherId}`, {
    params: { otherType },
  });
  return response.data.status;
};

export const sendConnectionRequest = async ({ toId, toType, message }) => {
  const response = await API.post('/connections/send', { toId, toType, message });
  return response.data;
};

export const acceptConnectionRequest = async (requestId) => {
  const response = await API.post(`/connections/accept/${requestId}`);
  return response.data;
};

export const declineConnectionRequest = async (requestId) => {
  const response = await API.post(`/connections/reject/${requestId}`);
  return response.data;
};
