import axios from 'axios';
import { publishToast } from '../utils/toastBus';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (!error.response) {
      publishToast({ message: 'Network error — check your connection.', type: 'error' });
    } else if (error.response.status >= 400) {
      publishToast({ message: error.response.data?.message || 'Something went wrong. Please try again.', type: 'error' });
    }
    return Promise.reject(error);
  }
);

export default api;
