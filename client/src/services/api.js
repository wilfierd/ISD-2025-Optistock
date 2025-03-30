// client/src/services/api.js
import axios from 'axios';
import config from '../config';

// Create an Axios instance with default configs
const api = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Important for cookies/session
  timeout: config.defaultTimeout,
});

// Request interceptor - could be used for adding auth tokens
api.interceptors.request.use((config) => {
  // You could add JWT token here if using token-based auth
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor - handle common response scenarios
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  // Handle common errors (401, 403, 500, etc.)
  if (error.response && error.response.status === 401) {
    // Redirect to login or handle unauthorized
    window.location.href = '/login';
  }
  
  return Promise.reject(error);
});

// API service functions
const apiService = {
  // Auth related endpoints
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    checkStatus: () => api.get('/auth/status'),
  },

  // Materials endpoints
  materials: {
    getAll: () => api.get('/materials'),
    getById: (id) => api.get(`/materials/${id}`),
    create: (data) => api.post('/materials', data),
    update: (id, data) => api.put(`/materials/${id}`, data),
    delete: (id) => api.delete(`/materials/${id}`),
    deleteBatch: (ids) => api.delete('/materials', { data: { ids } }),
  },

  // User management endpoints
  users: {
    getAll: () => api.get('/users'),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
  },

  // Dashboard data
  dashboard: {
    getData: () => api.get('/dashboard'),
  },

  materialRequests: {
    getAll: (status = 'pending') => api.get(`/material-requests?status=${status}`),
    getMyRequests: () => api.get('/my-material-requests'),
    create: (data) => api.post('/material-requests', data),
    process: (id, data) => api.put(`/material-requests/${id}`, data),
    getById: (id) => api.get(`/material-requests/${id}`),
  },
  
  // Notifications endpoints
  notifications: {
    getAll: () => api.get('/notifications'),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAsRead: (notificationIds) => api.put('/notifications/read', { notificationIds }),
    delete: (id) => api.delete(`/notifications/${id}`),
    clearAll: () => api.delete('/notifications'),
  },
  // Add these functions to client/src/services/api.js

  // Inside the apiService object, add a new section for batches
  batches: {
    getAll: () => api.get('/batches'),
    getById: (id) => api.get(`/batches/${id}`),
    getUngrouped: () => api.get('/batches/ungrouped'),
    getGrouped: () => api.get('/batches/grouped'),
    groupBatches: (data) => api.post('/batches/group', data),
    updateStatus: (id, status) => api.put(`/batches/${id}/status`, { status }),
  },
};

export default apiService;