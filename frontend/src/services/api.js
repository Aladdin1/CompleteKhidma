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

  // OAuth helpers - check configuration first, then redirect
  initiateGoogleOAuth: async (redirectUri = null) => {
    // First check if OAuth is configured
    try {
      await api.get('/auth/oauth/google/check');
      // If check passes, proceed with redirect
    } catch (err) {
      // If OAuth is not configured, throw error to show in UI
      if (err.response?.status === 500 || err.response?.data?.error?.code === 'OAUTH_NOT_CONFIGURED') {
        throw new Error(err.response?.data?.error?.message || 'Google OAuth is not configured');
      }
    }
    
    const params = new URLSearchParams();
    if (redirectUri) {
      params.append('redirect_uri', redirectUri);
    }
    const url = `${API_BASE_URL}/auth/oauth/google${params.toString() ? `?${params.toString()}` : ''}`;
    window.location.href = url;
  },

  initiateFacebookOAuth: async (redirectUri = null) => {
    // First check if OAuth is configured
    try {
      await api.get('/auth/oauth/facebook/check');
      // If check passes, proceed with redirect
    } catch (err) {
      // If OAuth is not configured, throw error to show in UI
      if (err.response?.status === 500 || err.response?.data?.error?.code === 'OAUTH_NOT_CONFIGURED') {
        throw new Error(err.response?.data?.error?.message || 'Facebook OAuth is not configured');
      }
    }
    
    const params = new URLSearchParams();
    if (redirectUri) {
      params.append('redirect_uri', redirectUri);
    }
    const url = `${API_BASE_URL}/auth/oauth/facebook${params.toString() ? `?${params.toString()}` : ''}`;
    window.location.href = url;
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

  // Address management
  getAddresses: async () => {
    const response = await api.get('/users/me/addresses');
    return response.data;
  },

  createAddress: async (addressData) => {
    const response = await api.post('/users/me/addresses', addressData);
    return response.data;
  },

  updateAddress: async (addressId, addressData) => {
    const response = await api.patch(`/users/me/addresses/${addressId}`, addressData);
    return response.data;
  },

  deleteAddress: async (addressId) => {
    const response = await api.delete(`/users/me/addresses/${addressId}`);
    return response.data;
  },

  // Phone number change
  changePhone: async (newPhone) => {
    const response = await api.post('/users/me/change-phone', { new_phone: newPhone });
    return response.data;
  },

  verifyPhoneChange: async (newPhone, otp) => {
    const response = await api.post('/users/me/verify-phone-change', { new_phone: newPhone, otp });
    return response.data;
  },

  // Notification preferences
  getNotificationPreferences: async () => {
    const response = await api.get('/users/me/notification-preferences');
    return response.data;
  },

  updateNotificationPreferences: async (preferences) => {
    const response = await api.patch('/users/me/notification-preferences', preferences);
    return response.data;
  },

  // Account management
  deactivateAccount: async (reason) => {
    const response = await api.post('/users/me/deactivate', { reason });
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete('/users/me');
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

  post: async (taskId, options = {}) => {
    const response = await api.post(`/tasks/${taskId}/post`, options);
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

  getAvailableTaskers: async (taskId, params = {}) => {
    const response = await api.get(`/tasks/${taskId}/available-taskers`, { params });
    return response.data;
  },

  requestQuote: async (taskId, taskerId) => {
    const response = await api.post(`/tasks/${taskId}/request-quote`, { tasker_id: taskerId });
    return response.data;
  },

  getBids: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/bids`);
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
  listByCategory: async (category, params = {}) => {
    const response = await api.get('/taskers/list', {
      params: { category, limit: params.limit ?? 20 }
    });
    return response.data;
  },

  /** Public: taskers for category ordered by distance from (lat, lng). No auth required. */
  getAvailableByLocation: async (category, lat, lng, params = {}) => {
    const response = await api.get('/taskers/available-by-location', {
      params: { category, lat, lng, limit: params.limit ?? 50 }
    });
    return response.data;
  },

  getApplicationStatus: async () => {
    const response = await api.get('/taskers/me/application-status');
    return response.data;
  },

  submitVerification: async (national_id_last4) => {
    const response = await api.post('/taskers/me/verification', { national_id_last4 });
    return response.data;
  },

  resubmitApplication: async () => {
    const response = await api.post('/taskers/me/resubmit');
    return response.data;
  },

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

  getQuoteRequests: async (params = {}) => {
    const response = await api.get('/taskers/me/quote-requests', { params });
    return response.data;
  },

  getOpenForBidTasks: async (params = {}) => {
    const response = await api.get('/taskers/me/tasks/open-for-bid', { params });
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

  // Accept booking offer (for taskers)
  accept: async (bookingId) => {
    const response = await api.post(`/bookings/${bookingId}/accept`);
    return response.data;
  },

  // Reject booking offer (for taskers)
  reject: async (bookingId, reason) => {
    const response = await api.post(`/bookings/${bookingId}/reject`, { reason });
    return response.data;
  },

  updateStatus: async (bookingId, status, meta = {}) => {
    const response = await api.post(`/bookings/${bookingId}/status`, { status, meta });
    return response.data;
  },

  markArrived: async (bookingId) => {
    const response = await api.post(`/bookings/${bookingId}/arrived`);
    return response.data;
  },

  cancel: async (bookingId, reason) => {
    const response = await api.post(`/bookings/${bookingId}/cancel`, { reason });
    return response.data;
  },
};

// Bids API (tasker submits quote; client accepts/declines)
export const bidAPI = {
  submit: async (taskId, { amount, currency, minimum_minutes, message, can_start_at }) => {
    const idempotencyKey = crypto.randomUUID();
    const response = await api.post('/bids', {
      task_id: taskId,
      amount,
      currency: currency || 'EGP',
      minimum_minutes: minimum_minutes || 60,
      message: message || undefined,
      can_start_at: can_start_at || undefined,
    }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return response.data;
  },

  accept: async (bidId) => {
    const idempotencyKey = crypto.randomUUID();
    const response = await api.post(`/bids/${bidId}/accept`, {}, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return response.data;
  },

  decline: async (bidId) => {
    const response = await api.post(`/bids/${bidId}/decline`);
    return response.data;
  },
};

// Review API
export const reviewAPI = {
  create: async (bookingId, reviewData) => {
    const idempotencyKey = crypto.randomUUID();
    const response = await api.post('/reviews', {
      booking_id: bookingId,
      ...reviewData
    }, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return response.data;
  },
};

// Payment API
export const paymentAPI = {
  // Payment Methods Management
  getPaymentMethods: async () => {
    const response = await api.get('/users/me/payment-methods');
    return response.data;
  },

  addPaymentMethod: async (paymentMethodData) => {
    const response = await api.post('/users/me/payment-methods', paymentMethodData);
    return response.data;
  },

  updatePaymentMethod: async (methodId, updates) => {
    const response = await api.patch(`/users/me/payment-methods/${methodId}`, updates);
    return response.data;
  },

  deletePaymentMethod: async (methodId) => {
    const response = await api.delete(`/users/me/payment-methods/${methodId}`);
    return response.data;
  },

  setDefaultPaymentMethod: async (methodId) => {
    const response = await api.patch(`/users/me/payment-methods/${methodId}/set-default`);
    return response.data;
  },

  // Payment History
  getPaymentHistory: async (params = {}) => {
    const response = await api.get('/users/me/payments', { params });
    return response.data;
  },

  getPaymentDetails: async (paymentId) => {
    const response = await api.get(`/users/me/payments/${paymentId}`);
    return response.data;
  },

  downloadReceipt: async (paymentId) => {
    const response = await api.get(`/users/me/payments/${paymentId}/receipt`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Spending Analytics
  getSpendingAnalytics: async (params = {}) => {
    const response = await api.get('/users/me/payments/analytics', { params });
    return response.data;
  },

  // Disputes
  getDisputes: async (params = {}) => {
    const response = await api.get('/users/me/disputes', { params });
    return response.data;
  },

  getDisputeDetails: async (disputeId) => {
    const response = await api.get(`/users/me/disputes/${disputeId}`);
    return response.data;
  },
};

// Conversations & Messaging API
export const conversationsAPI = {
  list: async (params = {}) => {
    const response = await api.get('/conversations', { params });
    return response.data;
  },

  getByBooking: async (bookingId) => {
    const response = await api.get(`/conversations/by-booking/${bookingId}`);
    return response.data;
  },

  getMessages: async (conversationId, params = {}) => {
    const response = await api.get(`/conversations/${conversationId}/messages`, { params });
    return response.data;
  },

  sendMessage: async (conversationId, { kind = 'text', text, media_url }) => {
    const response = await api.post(`/conversations/${conversationId}/messages`, {
      kind,
      ...(text !== undefined && { text }),
      ...(media_url !== undefined && { media_url }),
    }, {
      headers: {
        'Idempotency-Key': crypto.randomUUID(),
      },
    });
    return response.data;
  },
};

// Notifications API
export const notificationsAPI = {
  list: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  markAsRead: async (notificationId) => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },
};

// Admin API (requires admin or ops role)
export const adminAPI = {
  getMetrics: async (params = {}) => {
    const response = await api.get('admin/metrics', { params });
    return response.data;
  },

  getTasks: async (params = {}) => {
    const response = await api.get('admin/tasks', { params });
    return response.data;
  },

  getUsers: async (params = {}) => {
    const response = await api.get('admin/users', { params });
    return response.data;
  },

  getPendingTaskers: async (params = {}) => {
    const response = await api.get('admin/taskers/pending', { params });
    return response.data;
  },

  getTaskerDetail: async (userId) => {
    const response = await api.get(`admin/taskers/${userId}`);
    return response.data;
  },

  verifyTasker: async (userId) => {
    const response = await api.post(`admin/taskers/${userId}/verify`);
    return response.data;
  },

  rejectTasker: async (userId, reason) => {
    const response = await api.post(`admin/taskers/${userId}/reject`, { reason });
    return response.data;
  },

  getBookings: async (params = {}) => {
    const response = await api.get('admin/bookings', { params });
    return response.data;
  },

  getDisputes: async (params = {}) => {
    const response = await api.get('admin/disputes', { params });
    return response.data;
  },

  assignTask: async (taskId, taskerId, reason) => {
    const response = await api.post(`admin/tasks/${taskId}/assign`, {
      tasker_id: taskerId,
      reason,
    });
    return response.data;
  },

  suspendUser: async (userId, reason) => {
    const response = await api.post(`admin/users/${userId}/suspend`, { reason });
    return response.data;
  },

  unsuspendUser: async (userId) => {
    const response = await api.post(`admin/users/${userId}/unsuspend`);
    return response.data;
  },

  resolveDispute: async (disputeId, resolution, refundAmount) => {
    const response = await api.post(`admin/disputes/${disputeId}/resolve`, {
      resolution,
      refund_amount: refundAmount,
    });
    return response.data;
  },

  cancelTaskOnBehalf: async (taskId, reason) => {
    const response = await api.post(`admin/tasks/${taskId}/cancel`, { reason });
    return response.data;
  },

  getTaskHistory: async (taskId) => {
    const response = await api.get(`admin/tasks/${taskId}/history`);
    return response.data;
  },

  getAuditLog: async (params = {}) => {
    const response = await api.get('admin/audit-log', { params });
    return response.data;
  },
};

/** True if user has admin or ops role */
export const isAdminRole = (user) =>
  user && (user.role === 'admin' || user.role === 'ops');

export default api;
