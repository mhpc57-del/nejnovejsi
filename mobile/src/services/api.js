import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://craftbolt.cz/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const demandService = {
  getAll: () => api.get('/demands'),
  getAvailable: () => api.get('/demands/available'),
  getMy: () => api.get('/demands/my'),
  getById: (id) => api.get(`/demands/${id}`),
  create: (data) => api.post('/demands', data),
  accept: (id) => api.post(`/demands/${id}/accept`),
  softAccept: (id, reason) => api.post(`/demands/${id}/soft-accept`, null, { params: { reason } }),
  arrive: (id) => api.post(`/demands/${id}/arrive`),
  complete: (id) => api.post(`/demands/${id}/complete`),
  cancel: (id, reason) => api.post(`/demands/${id}/cancel-reason`, null, { params: { reason } }),
  verifyCheckout: (id) => api.post(`/demands/${id}/verify-checkout`),
};

export const messageService = {
  getByDemand: (demandId) => api.get(`/messages/${demandId}`),
  send: (demandId, content) => api.post('/messages', { demand_id: demandId, content }),
  getUnreadSummary: () => api.get('/messages/unread-summary'),
};

export const userService = {
  getById: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
};

export const subscriptionService = {
  getPlans: () => api.get('/subscription/plans'),
  getMy: () => api.get('/subscription/my'),
  createCheckout: (data) => api.post('/subscription/checkout', data),
  getStatus: (sessionId) => api.get(`/subscription/status/${sessionId}`),
};

export const reviewService = {
  create: (data) => api.post('/reviews', data),
  getByUser: (userId) => api.get(`/reviews/user/${userId}`),
};

export const uploadService = {
  upload: async (uri) => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('file', { uri, name: filename || 'photo.jpg', type });
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (data) => data,
    });
    return res;
  },
};

export const miscService = {
  getCategories: () => api.get('/categories'),
  geocodeSearch: (q) => api.get('/geocode/search', { params: { q } }),
  suggestCategory: (name) => api.post('/categories/suggest', { name }),
  aresLookup: (ico) => api.get(`/ares/${ico}`),
  getPlatformStats: () => api.get('/platform/stats'),
};

export const notificationService = {
  registerPushToken: (token) => api.post('/users/push-token', { push_token: token }),
};

export default api;
