import axios from 'axios';

// Configure base URL based on environment
// Default to the same origin as the served page (works for dev and production).
// If not in a browser environment, fall back to localhost:5000 for development.
const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Menu API calls
export const menuApi = {
  // Use the main endpoint
  getAll: () => api.get('/menu'),
  
  // Use the filtered endpoint
  getByCategory: (category) => api.get(`/menu/categories/${category}/items`),
  
  // Use simple endpoint if needed
  getSimple: () => api.get('/menu/simple'),
  
  // Single item
  getItem: (id) => api.get(`/menu/items/${id}`)
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