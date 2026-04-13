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
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  checkEmail: (email) => api.post('/auth/check-email', { email }),
};

export const demandService = {
  getAll: () => api.get('/demands'),
  getAvailable: () => api.get('/demands/available'),
  getMy: () => api.get('/demands/my'),
  getById: (id) => api.get(`/demands/${id}`),
  create: (data) => api.post('/demands', data),
  accept: (id) => api.post(`/demands/${id}/accept`),
  complete: (id, data) => api.post(`/demands/${id}/complete`, data || {}),
  cancel: (id) => api.post(`/demands/${id}/cancel`, {}),
  requestVerification: (id, data) => api.post(`/demands/${id}/request-verification`, data),
  verifyCheckout: (id) => api.post(`/demands/${id}/verify-checkout`),
};

export const disputeService = {
  create: (demandId, data) => api.post(`/demands/${demandId}/dispute`, data),
  get: (demandId) => api.get(`/demands/${demandId}/dispute`),
  respond: (demandId, data) => api.post(`/demands/${demandId}/dispute/respond`, data),
};

export const messageService = {
  getByDemand: (demandId) => api.get(`/messages/${demandId}`),
  send: (demandId, content) => api.post('/messages', { demand_id: demandId, content }),
  getUnreadSummary: () => api.get('/messages/unread-summary'),
};

export const userService = {
  getById: (id) => api.get(`/users/${id}`),
  getLocation: (id) => api.get(`/users/${id}/location`),
  updateProfile: (data) => api.put('/users/profile', data),
  updateLocation: (data) => api.post('/users/location', data),
};

export const subscriptionService = {
  getPlans: () => api.get('/subscription/plans'),
  getMy: () => api.get('/subscription/my'),
  createCheckout: (data) => api.post('/subscription/checkout', data),
  syncPending: () => api.post('/payments/sync-pending', {}),
};

export const uploadService = {
  upload: async (uri) => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('file', { uri, name: filename || 'photo.jpg', type });
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (data) => data,
    });
  },
};

export const miscService = {
  getCategories: () => api.get('/categories'),
  geocodeSearch: (q) => api.get('/geocode/search', { params: { q } }),
  aresLookup: (ico) => api.get(`/ares/${ico}`),
  getPlatformStats: () => api.get('/platform/stats'),
};

export const notificationService = {
  registerPushToken: (token) => api.post('/users/push-token', { push_token: token }),
};

export default api;
