import axios from 'axios';

const API_BASE_URL = '/api';
const ACCESS_TOKEN_KEY = 'payslip_access_token';
const REFRESH_TOKEN_KEY = 'payslip_refresh_token';
const USER_KEY = 'payslip_user';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

const buildQueryConfig = (params = {}) => {
  const filteredEntries = Object.entries(params).filter(([, value]) => (
    value !== undefined && value !== null && value !== ''
  ));

  return filteredEntries.length ? { params: Object.fromEntries(filteredEntries) } : {};
};

export const extractCollection = (payload) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      count: payload.length,
      next: null,
      previous: null,
    };
  }

  return {
    items: payload?.results || [],
    count: payload?.count || 0,
    next: payload?.next || null,
    previous: payload?.previous || null,
  };
};

export const authStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser: () => {
    const rawUser = localStorage.getItem(USER_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  },
  setSession: ({ access, refresh, user }) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (data) => api.post('/auth/login/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  profile: () => api.get('/auth/profile/'),
};

export const employeeAPI = {
  getAll: (params) => api.get('/employees/', buildQueryConfig(params)),
  summary: () => api.get('/employees/summary/'),
  create: (data) => api.post('/employees/', data),
  get: (id) => api.get(`/employees/${id}/`),
  update: (id, data) => api.put(`/employees/${id}/`, data),
  delete: (id) => api.delete(`/employees/${id}/`),
};

export const payslipAPI = {
  getAll: (params) => api.get('/payslips/', buildQueryConfig(params)),
  recentActivity: (params) => api.get('/payslips/recent_activity/', buildQueryConfig(params)),
  exportRegister: (params) => api.get('/payslips/export/', { ...buildQueryConfig(params), responseType: 'blob' }),
  bulkUpdate: (data) => api.post('/payslips/bulk_update/', data),
  create: (data) => api.post('/payslips/', data),
  get: (id) => api.get(`/payslips/${id}/`),
  download: (id) => api.get(`/payslips/${id}/download/`, { responseType: 'blob' }),
  approve: (id) => api.post(`/payslips/${id}/approve/`),
  issue: (id) => api.post(`/payslips/${id}/issue/`),
};

export default api;
