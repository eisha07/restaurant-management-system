import axios, { AxiosError } from 'axios';
import { MenuItem, Order, OrderItem, Feedback } from '@/types';

// API base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging and adding auth token
api.interceptors.request.use((config) => {
  console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
  
  // Add manager token if available
  const token = localStorage.getItem('managerToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('✓ Manager token added to request');
  }
  
  return config;
});

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.message}`);
    return Promise.reject(error);
  }
);

// ==================== MENU API ====================
export const menuApi = {
  /**
   * Get all menu items from database
   */
  getAllItems: async (): Promise<MenuItem[]> => {
    try {
      const response = await api.get<MenuItem[]>('/menu');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      throw error;
    }
  },

  /**
   * Get single menu item by ID
   */
  getItemById: async (id: number): Promise<MenuItem> => {
    try {
      const response = await api.get<MenuItem>(`/menu/items/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch menu item ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get menu items by category
   */
  getByCategory: async (category: string): Promise<MenuItem[]> => {
    try {
      const response = await api.get<MenuItem[]>(`/menu/category/${category}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch menu by category ${category}:`, error);
      throw error;
    }
  },

  /**
   * Search menu items
   */
  search: async (query: string): Promise<MenuItem[]> => {
    try {
      const response = await api.get<MenuItem[]>('/menu/search', {
        params: { q: query },
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to search menu:`, error);
      throw error;
    }
  },
};

// ==================== ORDER API ====================
export const orderApi = {
  /**
   * Create new order
   */
  create: async (orderData: {
    customerSessionId: string;
    paymentMethod: string;
    items: Array<{
      menuItemId: number;
      quantity: number;
      specialInstructions?: string;
    }>;
  }): Promise<Order> => {
    try {
      const response = await api.post<Order>('/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  },

  /**
   * Get order by ID
   */
  getById: async (orderId: number): Promise<Order> => {
    try {
      const response = await api.get<Order>(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Get orders by customer session
   */
  getByCustomerSession: async (sessionId: string): Promise<Order[]> => {
    try {
      const response = await api.get<Order[]>('/orders/customer', {
        params: { sessionId },
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch customer orders:`, error);
      throw error;
    }
  },

  /**
   * Update order status
   */
  updateStatus: async (
    orderId: number,
    status: string
  ): Promise<Order> => {
    try {
      const response = await api.put<Order>(`/orders/${orderId}/status`, {
        status,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to update order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Cancel order
   */
  cancel: async (orderId: number): Promise<Order> => {
    try {
      const response = await api.put<Order>(`/orders/${orderId}/cancel`);
      return response.data;
    } catch (error) {
      console.error(`Failed to cancel order ${orderId}:`, error);
      throw error;
    }
  },
};

// ==================== MANAGER API ====================
export const managerApi = {
  /**
   * Get all pending orders
   */
  getPendingOrders: async (): Promise<Order[]> => {
    try {
      const response = await api.get<Order[]>('/manager/orders/pending');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch pending orders:', error);
      throw error;
    }
  },

  /**
   * Get all orders with optional filtering
   */
  getAllOrders: async (filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: Order[]; total: number }> => {
    try {
      const response = await api.get<{
        orders: Order[];
        total: number;
      }>('/manager/orders', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      throw error;
    }
  },

  /**
   * Get manager statistics
   */
  getStatistics: async (): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    pendingOrders: number;
  }> => {
    try {
      const response = await api.get('/manager/statistics');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      throw error;
    }
  },

  /**
   * Get order details
   */
  getOrderDetails: async (orderId: number): Promise<Order> => {
    try {
      const response = await api.get<Order>(`/manager/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch order details ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Approve order
   */
  approveOrder: async (orderId: number): Promise<Order> => {
    try {
      const response = await api.put<Order>(
        `/manager/orders/${orderId}/approve`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to approve order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Reject order
   */
  rejectOrder: async (
    orderId: number,
    reason?: string
  ): Promise<Order> => {
    try {
      const response = await api.put<Order>(
        `/manager/orders/${orderId}/reject`,
        { reason }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to reject order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Get all menu items for manager
   */
  getMenuItems: async (): Promise<MenuItem[]> => {
    try {
      const response = await api.get<MenuItem[]>('/menu');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      throw error;
    }
  },

  /**
   * Create new menu item
   */
  createMenuItem: async (itemData: {
    name: string;
    description: string;
    price: number;
    category: string;
    image_url?: string;
    is_available?: boolean;
  }): Promise<MenuItem> => {
    try {
      const response = await api.post<MenuItem>('/menu/items', itemData);
      return response.data;
    } catch (error) {
      console.error('Failed to create menu item:', error);
      throw error;
    }
  },

  /**
   * Update menu item
   */
  updateMenuItem: async (
    itemId: number,
    itemData: Partial<{
      name: string;
      description: string;
      price: number;
      category: string;
      image_url: string;
      is_available: boolean;
    }>
  ): Promise<MenuItem> => {
    try {
      const response = await api.put<MenuItem>(`/menu/items/${itemId}`, itemData);
      return response.data;
    } catch (error) {
      console.error(`Failed to update menu item ${itemId}:`, error);
      throw error;
    }
  },

  /**
   * Delete menu item
   */
  deleteMenuItem: async (itemId: number): Promise<void> => {
    try {
      await api.delete(`/menu/items/${itemId}`);
    } catch (error) {
      console.error(`Failed to delete menu item ${itemId}:`, error);
      throw error;
    }
  },

  /**
   * Get customer feedback for manager
   */
  getFeedback: async (page = 1, limit = 10): Promise<{
    feedback: Feedback[];
    total: number;
    page: number;
  }> => {
    try {
      const response = await api.get('/feedback', {
        params: { page, limit },
      });
      // Handle both response formats
      const data = response.data;
      return {
        feedback: data.data || data.feedback || [],
        total: data.pagination?.totalCount || data.total || 0,
        page: data.pagination?.page || page || 1,
      };
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      throw error;
    }
  },
};

// ==================== KITCHEN API ====================
export const kitchenApi = {
  /**
   * Get active kitchen orders
   */
  getActiveOrders: async (): Promise<Order[]> => {
    try {
      const response = await api.get<Order[]>('/kitchen/orders/active');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch active orders:', error);
      throw error;
    }
  },

  /**
   * Update kitchen item status
   */
  updateItemStatus: async (
    orderId: number,
    itemId: number,
    status: 'pending' | 'preparing' | 'ready'
  ): Promise<Order> => {
    try {
      const response = await api.put<Order>(
        `/kitchen/orders/${orderId}/items/${itemId}/status`,
        { status }
      );
      return response.data;
    } catch (error) {
      console.error(
        `Failed to update kitchen item status ${orderId}/${itemId}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Mark order as ready
   */
  markOrderReady: async (orderId: number): Promise<Order> => {
    try {
      const response = await api.put<Order>(
        `/kitchen/orders/${orderId}/ready`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to mark order ready ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Get kitchen statistics
   */
  getStatistics: async (): Promise<{
    activeOrders: number;
    completedToday: number;
    averagePrepTime: number;
  }> => {
    try {
      const response = await api.get('/kitchen/statistics');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch kitchen statistics:', error);
      throw error;
    }
  },
};

// ==================== FEEDBACK API ====================
export const feedbackApi = {
  /**
   * Submit order feedback
   */
  submit: async (feedbackData: {
    orderId: number;
    rating: number;
    comment?: string;
  }): Promise<Feedback> => {
    try {
      const response = await api.post<Feedback>('/feedback', feedbackData);
      return response.data;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  },

  /**
   * Get all feedback with pagination
   */
  getAll: async (page = 1, limit = 10): Promise<{
    feedback: Feedback[];
    total: number;
    page: number;
  }> => {
    try {
      const response = await api.get('/feedback', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      throw error;
    }
  },

  /**
   * Get average rating
   */
  getAverageRating: async (): Promise<{
    averageRating: number;
    totalFeedback: number;
  }> => {
    try {
      const response = await api.get('/feedback/average');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch average rating:', error);
      throw error;
    }
  },
};

// ==================== QR CODE API ====================
export const qrApi = {
  /**
   * Generate QR code for table
   */
  generateTableQR: async (tableNumber: number): Promise<string> => {
    try {
      const response = await api.get(`/qr/table/${tableNumber}`);
      return response.data.qrCode;
    } catch (error) {
      console.error(`Failed to generate QR code for table ${tableNumber}:`, error);
      throw error;
    }
  },

  /**
   * Generate QR code for order
   */
  generateOrderQR: async (orderId: number): Promise<string> => {
    try {
      const response = await api.get(`/qr/order/${orderId}`);
      return response.data.qrCode;
    } catch (error) {
      console.error(`Failed to generate QR code for order ${orderId}:`, error);
      throw error;
    }
  },
};

// ==================== HEALTH CHECK API ====================
export const healthApi = {
  /**
   * Check backend health status
   */
  check: async (): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
  }> => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Failed to check health:', error);
      throw error;
    }
  },
};

// ==================== EXPORT MAIN API OBJECT ====================
export default {
  menuApi,
  orderApi,
  managerApi,
  kitchenApi,
  feedbackApi,
  qrApi,
  healthApi,
};
