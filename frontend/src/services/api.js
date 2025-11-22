import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
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

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear token and redirect to login if not already there
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    
    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }
    return Promise.reject(error);
  }
);

// SMTP API
export const smtpAPI = {
  getAll: () => api.get('/smtp'),
  getById: (id) => api.get(`/smtp/${id}`),
  create: (data) => api.post('/smtp', data),
  update: (id, data) => api.put(`/smtp/${id}`, data),
  delete: (id) => api.delete(`/smtp/${id}`),
  test: (id) => api.post(`/smtp/${id}/test`),
  getUsage: (id, params) => api.get(`/smtp/${id}/usage`, { params }),
};

// Campaigns API
export const campaignsAPI = {
  getAll: () => api.get('/campaigns'),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  uploadRecipients: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/campaigns/${id}/recipients`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  addRecipients: (id, emails) => api.post(`/campaigns/${id}/recipients/manual`, { emails }),
  start: (id) => api.post(`/campaigns/${id}/start`),
  pause: (id) => api.post(`/campaigns/${id}/pause`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getSMTPUsage: (params) => api.get('/dashboard/smtp-usage', { params }),
  getCampaigns: () => api.get('/dashboard/campaigns'),
};

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  verify: () => api.get('/auth/verify'),
  getMe: () => api.get('/auth/me'),
};

export default api;

