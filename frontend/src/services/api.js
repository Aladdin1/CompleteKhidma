import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;

          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  requestOTP: async (phone, locale = 'ar-EG') => {
    const response = await api.post('/auth/otp/request', { phone, locale });
    return response.data;
  },

  verifyOTP: async (phone, otp, deviceId) => {
    const response = await api.post('/auth/otp/verify', {
      phone,
      otp,
      device_id: deviceId,
    });
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/token/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },
};

// User API
export const userAPI = {
  getMe: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  updateMe: async (data) => {
    const response = await api.patch('/users/me', data);
    return response.data;
  },

  becomeTasker: async () => {
    const response = await api.post('/users/me/become-tasker');
    return response.data;
  },
};

// Task API
export const taskAPI = {
  create: async (taskData) => {
    const idempotencyKey = crypto.randomUUID();
    const response = await api.post('/tasks', taskData, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return response.data;
  },

  list: async (params = {}) => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  get: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  update: async (taskId, updates) => {
    const response = await api.patch(`/tasks/${taskId}`, updates);
    return response.data;
  },

  post: async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/post`);
    return response.data;
  },

  cancel: async (taskId, reason) => {
    const response = await api.post(`/tasks/${taskId}/cancel`, { reason });
    return response.data;
  },

  getCandidates: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/candidates`);
    return response.data;
  },

  selectTasker: async (taskId, taskerId, proposedRate = null, minimumMinutes = null) => {
    const idempotencyKey = crypto.randomUUID();
    const response = await api.post('/bookings', {
      task_id: taskId,
      tasker_id: taskerId,
      proposed_rate: proposedRate,
      minimum_minutes: minimumMinutes
    }, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return response.data;
  },

  accept: async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/accept`);
    return response.data;
  },

  decline: async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/decline`);
    return response.data;
  },
};

// Tasker API
export const taskerAPI = {
  getProfile: async () => {
    const response = await api.get('/taskers/me/profile');
    return response.data;
  },

  getProfileById: async (taskerId) => {
    const response = await api.get(`/taskers/${taskerId}/profile`);
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.patch('/taskers/me/profile', data);
    return response.data;
  },

  getAvailableTasks: async (params = {}) => {
    const response = await api.get('/taskers/me/tasks/available', { params });
    return response.data;
  },

  getOfferedTasks: async (params = {}) => {
    const response = await api.get('/taskers/me/tasks/offered', { params });
    return response.data;
  },

  getAvailability: async (params = {}) => {
    const response = await api.get('/taskers/me/availability', { params });
    return response.data;
  },

  createAvailabilityBlock: async (blockData) => {
    const response = await api.post('/taskers/me/availability/blocks', blockData);
    return response.data;
  },

  deleteAvailabilityBlock: async (blockId) => {
    const response = await api.delete(`/taskers/me/availability/blocks/${blockId}`);
    return response.data;
  },

  getEarnings: async (params = {}) => {
    const response = await api.get('/taskers/me/earnings', { params });
    return response.data;
  },

  getPayouts: async (params = {}) => {
    const response = await api.get('/taskers/me/payouts', { params });
    return response.data;
  },

  requestPayout: async (data) => {
    const response = await api.post('/taskers/me/payouts/request', data);
    return response.data;
  },
};

// Booking API
export const bookingAPI = {
  list: async (params = {}) => {
    const response = await api.get('/bookings', { params });
    return response.data;
  },

  get: async (bookingId) => {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;
  },

  updateStatus: async (bookingId, status, meta = {}) => {
    const response = await api.post(`/bookings/${bookingId}/status`, { status, meta });
    return response.data;
  },

  cancel: async (bookingId, reason) => {
    const response = await api.post(`/bookings/${bookingId}/cancel`, { reason });
    return response.data;
  },
};

export default api;
