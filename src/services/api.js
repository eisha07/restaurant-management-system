// src/services/api.js
import axios from 'axios';

// Configure base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:5000/api');

console.log('API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add request/response interceptors for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method.toUpperCase()} request to:`, config.url);
    console.log('Request data:', config.data);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response from ${response.config.url}:`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      response: error.response?.data
    });
    
    // Return mock data for development if backend is down
    if (process.env.NODE_ENV === 'development' && error.code === 'ERR_NETWORK') {
      console.log('🔧 Using development mock data');
      return getMockResponse(error.config);
    }
    
    return Promise.reject(error);
  }
);

// Mock responses for development
const getMockResponse = (config) => {
  const { url, method, data } = config;
  
  // Mock order creation
  if (url.includes('/orders') && method === 'post') {
    const mockOrderId = Math.floor(Math.random() * 10000) + 1000;
    return {
      data: {
        success: true,
        data: {
          id: mockOrderId,
          order_number: `ORD-${mockOrderId.toString().padStart(6, '0')}`,
          status: 'pending_approval',
          total_amount: JSON.parse(data)?.totalAmount || 0,
          created_at: new Date().toISOString()
        },
        message: 'Order created successfully (development mode)'
      }
    };
  }
  
  // Mock menu items
  if (url.includes('/menu') && method === 'get') {
    return {
      data: [
        {
          id: 1,
          name: 'Mock Chicken Biryani',
          description: 'Aromatic basmati rice with tender chicken',
          price: 12.99,
          category: 'Desi',
          image_url: '/images/biryani.jpg',
          is_available: true,
          rating: 4.8
        },
        {
          id: 2,
          name: 'Mock Butter Chicken',
          description: 'Creamy tomato-based curry',
          price: 14.99,
          category: 'Curries',
          image_url: '/images/butter-chicken.jpg',
          is_available: true,
          rating: 4.7
        }
      ]
    };
  }
  
  // Default mock response
  return {
    data: {
      success: true,
      message: 'Mock response for development',
      data: {}
    }
  };
};

// ================= ORDER API SERVICE =================
export const orderApi = {
  // CREATE ORDER - Compatible with new checkout flow
  create: async (orderData) => {
    console.log('📦 Creating order with data:', orderData);
    
    try {
      // Calculate total if not provided
      let totalAmount = 0;
      if (!orderData.totalAmount && orderData.items) {
        // In real app, you'd fetch prices from database
        // For now, use a mock calculation
        totalAmount = orderData.items.reduce((sum, item) => {
          return sum + (item.quantity * 10); // Mock $10 per item
        }, 0);
      }
      
      // Add total to order data
      const orderDataWithTotal = {
        ...orderData,
        totalAmount: totalAmount || 0
      };
      
      console.log('📤 Sending to backend:', orderDataWithTotal);
      
      const response = await api.post('/orders', orderDataWithTotal);
      console.log('✅ Backend response:', response.data);
      
      return response;
      
    } catch (error) {
      console.error('❌ Order creation failed:', error);
      
      // Return mock for development
      if (process.env.NODE_ENV === 'development') {
        const mockOrderId = Math.floor(Math.random() * 10000) + 1000;
        const mockResponse = {
          data: {
            success: true,
            data: {
              id: mockOrderId,
              order_number: `ORD-${mockOrderId.toString().padStart(6, '0')}`,
              status: 'pending_approval',
              total_amount: 25.99, // Mock total
              created_at: new Date().toISOString(),
              customer_session_id: orderData.customerSessionId,
              payment_method: orderData.paymentMethod
            },
            message: 'Order created (development mode)'
          }
        };
        console.log('🔧 Returning mock order:', mockResponse.data);
        return mockResponse;
      }
      
      throw error;
    }
  },

  // GET ORDER BY ID
  getById: async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response;
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      
      if (process.env.NODE_ENV === 'development') {
        return {
          data: {
            success: true,
            data: {
              id: orderId,
              order_number: `ORD-${orderId.toString().padStart(6, '0')}`,
              status: 'pending_approval',
              total_amount: 25.99,
              items: [],
              created_at: new Date().toISOString()
            }
          }
        };
      }
      
      throw error;
    }
  },

  // GET ORDERS BY SESSION
  getBySessionId: async (sessionId) => {
    try {
      const response = await api.get(`/orders/session/${sessionId}`);
      return response;
    } catch (error) {
      console.error(`Error fetching session orders ${sessionId}:`, error);
      throw error;
    }
  },

  // APPROVE ORDER
  approveOrder: async (orderId) => {
    try {
      const response = await api.patch(`/orders/${orderId}/approve`);
      return response;
    } catch (error) {
      console.error(`Error approving order ${orderId}:`, error);
      throw error;
    }
  },

  // CANCEL ORDER
  cancelOrder: async (orderId, reason) => {
    try {
      const response = await api.patch(`/orders/${orderId}/cancel`, { reason });
      return response;
    } catch (error) {
      console.error(`Error cancelling order ${orderId}:`, error);
      throw error;
    }
  },

  // UPDATE STATUS
  updateStatus: async (orderId, status) => {
    try {
      const response = await api.patch(`/orders/${orderId}/status`, { status });
      return response;
    } catch (error) {
      console.error(`Error updating order status ${orderId}:`, error);
      throw error;
    }
  },

  // GET ALL ORDERS
  getAll: async () => {
    try {
      const response = await api.get('/orders');
      return response;
    } catch (error) {
      console.error('Error fetching all orders:', error);
      throw error;
    }
  },

  // TEST ENDPOINT
  test: async () => {
    try {
      const response = await api.get('/orders/test');
      return response;
    } catch (error) {
      console.error('Order test failed:', error);
      
      if (process.env.NODE_ENV === 'development') {
        return {
          data: {
            success: true,
            message: 'Order API is working (development mode)',
            timestamp: new Date().toISOString()
          }
        };
      }
      
      throw error;
    }
  }
};

// ================= MENU API SERVICE =================
export const menuApi = {
  getAll: async () => {
    try {
      const response = await api.get('/menu');
      return response;
    } catch (error) {
      console.error('Error fetching menu:', error);
      throw error;
    }
  },
  
  getByCategory: async (category) => {
    try {
      const response = await api.get(`/menu/categories/${category}/items`);
      return response;
    } catch (error) {
      console.error(`Error fetching ${category} items:`, error);
      throw error;
    }
  },
  
  getItem: async (id) => {
    try {
      const response = await api.get(`/menu/items/${id}`);
      return response;
    } catch (error) {
      console.error(`Error fetching item ${id}:`, error);
      throw error;
    }
  },
  
  getSimple: async () => {
    try {
      const response = await api.get('/menu/simple');
      return response;
    } catch (error) {
      console.error('Error fetching simple menu:', error);
      throw error;
    }
  }
};

// ================= QR API SERVICE =================
export const qrApi = {
  generateTableQR: async (tableNumber) => {
    try {
      const response = await api.get(`/qr/table/${tableNumber}`);
      return response;
    } catch (error) {
      console.error('Error generating QR:', error);
      
      if (process.env.NODE_ENV === 'development') {
        return {
          data: {
            qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=table_${tableNumber}_${Date.now()}`,
            table_number: tableNumber,
            message: 'QR generated (development mode)'
          }
        };
      }
      
      throw error;
    }
  },
  
  test: async () => {
    try {
      const response = await api.get('/qr/test');
      return response;
    } catch (error) {
      console.error('QR test failed:', error);
      throw error;
    }
  }
};

// ================= FEEDBACK API SERVICE =================
export const feedbackApi = {
  submit: async (feedbackData) => {
    try {
      const response = await api.post('/feedback', feedbackData);
      return response;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },
  
  getAll: async () => {
    try {
      const response = await api.get('/feedback');
      return response;
    } catch (error) {
      console.error('Error fetching feedback:', error);
      throw error;
    }
  }
};

// ================= HEALTH CHECK =================
export const healthApi = {
  check: async () => {
    try {
      const response = await api.get('/health');
      return response;
    } catch (error) {
      console.error('Health check failed:', error);
      
      if (process.env.NODE_ENV === 'development') {
        return {
          data: {
            status: 'healthy (development mode)',
            database: 'connected',
            timestamp: new Date().toISOString()
          }
        };
      }
      
      throw error;
    }
  }
};

export default api;