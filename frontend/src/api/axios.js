import axios from 'axios';

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`, // ✅ uses deployed backend
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // ✅ Allow credentials with CORS
});


// Add token to requests automatically
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// When the API says the token is missing, invalid or expired, end the session.
// AuthContext listens for this event, logs out, and the route guards send the
// user to the login page. Login and signup requests are left alone.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default API;