import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:5000/api');

console.log('API Base URL:', API_BASE_URL); // Add this to debug

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Add timeout
});

// Add request interceptor for logging
api.interceptors.request.use(
  config => {
    console.log('Making request to:', config.url);
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  response => {
    console.log('Response from:', response.config.url, response.status);
    return response;
  },
  error => {
    console.error('Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export const menuApi = {
  getAll: () => {
    const timestamp = new Date().getTime();
    return api.get(`/menu?t=${timestamp}`); // Add timestamp to prevent caching
  },
  
  getByCategory: (category) => {
    const timestamp = new Date().getTime();
    return api.get(`/menu/categories/${category}/items?t=${timestamp}`);
  },
  
  getSimple: () => {
    const timestamp = new Date().getTime();
    return api.get(`/menu/simple?t=${timestamp}`);
  },
  
  getItem: (id) => {
    const timestamp = new Date().getTime();
    return api.get(`/menu/items/${id}?t=${timestamp}`);
  }
};

// Order API calls
export const orderApi = {
  create: (orderData) => api.post('/orders', orderData),
  getById: (orderId) => api.get(`/orders/${orderId}`),
  getAll: () => api.get('/orders'),
  updateStatus: (orderId, status) => api.patch(`/orders/${orderId}/status`, { status }),
  getBySessionId: (sessionId) => api.get(`/orders/session/${sessionId}`),
  approveOrder: (orderId) => api.patch(`/orders/${orderId}/approve`),
  cancelOrder: (orderId) => api.patch(`/orders/${orderId}/cancel`),
};

// Feedback API calls
export const feedbackApi = {
  submit: (feedbackData) => api.post('/feedback', feedbackData),
  getAll: () => api.get('/feedback'),
};

// QR API calls
export const qrApi = {
  generateTableQR: (tableNumber) => api.get(`/qr/table/${tableNumber}`),
  test: () => api.get('/qr/test'),
};

export default api;