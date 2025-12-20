import axios, { AxiosError } from 'axios';
import { MenuItem, Order, OrderItem, Feedback, OrderStatus, KitchenStatus, PaymentMethod, Statistics } from '@/types';

// API base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds to handle slow DB queries
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

// Helper to transform backend menu item to frontend format
export const transformMenuItem = (item: any): MenuItem => {
  return {
    id: item.id || item.item_id,
    name: item.name,
    description: item.description,
    price: parseFloat(item.price || 0),
    category: item.category || 'Uncategorized',
    image: item.image_url || item.image || 'https://via.placeholder.com/150',
    rating: parseFloat(item.rating || 4.5),
    available: item.is_available !== undefined ? item.is_available : (item.available !== undefined ? item.available : true),
    preparationTime: item.preparation_time_min || item.preparationTime || 15,
    spicyLevel: item.spicy_level || item.spicyLevel,
    tags: item.dietary_tags ? item.dietary_tags.split(',') : (item.tags || [])
  };
};

// Helper to transform backend feedback to frontend format
export const transformFeedback = (feedback: any): Feedback => {
  return {
    id: feedback.feedback_id || feedback.id,
    orderId: feedback.order_id || feedback.orderId,
    foodQuality: feedback.food_quality || feedback.foodQuality || 5,
    serviceSpeed: feedback.service_speed || feedback.serviceSpeed || 5,
    overallExperience: feedback.overall_experience || feedback.overallExperience || 5,
    accuracy: feedback.order_accuracy || feedback.accuracy || 5,
    valueForMoney: feedback.value_for_money || feedback.valueForMoney || 5,
    comment: feedback.comment || '',
    submittedAt: feedback.submitted_at || feedback.submittedAt || new Date().toISOString()
  };
};

// Helper to transform backend order to frontend format
export const transformOrder = (order: any): Order => {
  // Map backend status names to frontend status codes
  const statusMap: Record<string, OrderStatus> = {
    'Pending Approval': 'pending_approval',
    'Approved': 'approved',
    'In Progress': 'in_progress',
    'Ready': 'ready',
    'Completed': 'completed',
    'Cancelled': 'cancelled',
    'pending_approval': 'pending_approval',
    'approved': 'approved',
    'in_progress': 'in_progress',
    'ready': 'ready',
    'completed': 'completed',
    'cancelled': 'cancelled'
  };

  const kitchenStatusMap: Record<string, KitchenStatus> = {
    'Pending': 'pending',
    'Preparing': 'preparing',
    'Ready': 'ready',
    'pending': 'pending',
    'preparing': 'preparing',
    'ready': 'ready'
  };

  return {
    id: order.id || order.order_id,
    orderNumber: order.order_number || `ORD-${order.id}`,
    status: statusMap[order.status] || order.status || 'pending_approval',
    kitchenStatus: kitchenStatusMap[order.kitchen_status] || order.kitchen_status || 'pending',
    paymentMethod: (order.payment_method?.toLowerCase() as PaymentMethod) || 'cash',
    tableNumber: order.table_number?.toString(),
    items: (order.items || []).map((item: any) => ({
      menuItemId: item.menu_item_id,
      name: item.name || item.item_name,
      price: parseFloat(item.price || item.item_price || 0),
      quantity: item.quantity,
      specialInstructions: item.special_instructions,
      status: item.status || item.item_status
    })),
    totalAmount: parseFloat(order.total || order.total_amount || 0),
    createdAt: order.created_at || new Date().toISOString(),
    expectedCompletion: order.expected_completion,
    completedAt: order.completed_at,
    customerSessionId: order.customer_id?.toString() || ''
  };
};

// ==================== MENU API ====================
const menuApi = {
  /**
   * Get all menu items from database
   */
  getAllItems: async (): Promise<MenuItem[]> => {
    try {
      const response = await api.get<any[]>('/menu', {
        timeout: 30000, // 30 second timeout for menu loading
      });
      
      if (Array.isArray(response.data)) {
        return response.data.map(transformMenuItem);
      }
      
      return [];
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        console.warn('Menu API timeout - backend may be slow or unavailable');
        // Return empty array instead of throwing to allow UI to render
        return [];
      }
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ERR_NETWORK') {
        console.warn('Backend server not reachable - check if server is running on', API_BASE_URL);
        return [];
      }
      console.error('Failed to fetch menu items:', error);
      // Return empty array on error to prevent UI crash
      return [];
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
const orderApi = {
  /**
   * Create new order
   */
  create: async (orderData: {
    customerSessionId: string;
    paymentMethod: string;
    tableNumber?: number;
    items: Array<{
      menuItemId: number;
      quantity: number;
      specialInstructions?: string;
    }>;
    specialInstructions?: string;
  }): Promise<Order> => {
    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        data: any;
      }>('/orders', orderData);
      
      if (response.data.data) {
        return transformOrder(response.data.data);
      }
      
      return transformOrder(response.data);
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  },

  /**
   * Create new order (alias for create)
   */
  createOrder: async (orderData: {
    customerSessionId: string;
    paymentMethod: string;
    tableNumber?: number;
    items: Array<{
      menuItemId: number;
      quantity: number;
      specialInstructions?: string;
    }>;
    specialInstructions?: string;
  }): Promise<Order> => {
    return orderApi.create(orderData);
  },

  /**
   * Get order by ID
   */
  getById: async (orderId: number): Promise<Order> => {
    try {
      const response = await api.get<any>(`/orders/${orderId}`);
      return transformOrder(response.data);
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
      const response = await api.get<{
        success: boolean;
        data: any[];
      }>(`/orders/session/${sessionId}`);
      
      if (response.data.data) {
        return response.data.data.map(transformOrder);
      }
      
      // Fallback if response is direct array
      if (Array.isArray(response.data)) {
        return (response.data as any[]).map(transformOrder);
      }
      
      return [];
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
const managerApi = {
  /**
   * Get all pending orders
   */
  getPendingOrders: async (): Promise<Order[]> => {
    try {
      const response = await api.get<{
        success: boolean;
        orders: any[];
      }>('/manager/orders/pending');
      
      if (response.data.orders) {
        return response.data.orders.map(transformOrder);
      }
      
      // Fallback if response is direct array
      if (Array.isArray(response.data)) {
        return (response.data as any[]).map(transformOrder);
      }
      
      return [];
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
      // Use /manager/orders/all to match backend route
      const response = await api.get<{
        orders: any[];
        total: number;
        success?: boolean;
      }>('/manager/orders/all', { params: filters });
      
      // Handle different response formats
      if (response.data.orders) {
        return {
          orders: response.data.orders.map(transformOrder),
          total: response.data.total || response.data.orders.length
        };
      } else if (Array.isArray(response.data)) {
        return {
          orders: (response.data as any[]).map(transformOrder),
          total: response.data.length
        };
      }
      
      return { orders: [], total: 0 };
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      throw error;
    }
  },

  /**
   * Get manager statistics
   */
  getStatistics: async (): Promise<Statistics> => {
    try {
      const response = await api.get<Statistics>('/manager/statistics');
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
   * Approve order with estimated completion time
   */
  approveOrder: async (orderId: number, expectedCompletion?: number): Promise<Order> => {
    try {
      const response = await api.put<Order>(
        `/manager/orders/${orderId}/approve`,
        { expectedCompletion }
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
      // Use /manager/menu to get manager-specific menu data
      const response = await api.get<{
        success: boolean;
        items: any[];
      }>('/manager/menu');
      
      if (response.data.items) {
        return response.data.items.map(transformMenuItem);
      }
      
      // Fallback to /menu if /manager/menu fails or returns different format
      const fallbackResponse = await api.get<any[]>('/menu');
      return fallbackResponse.data.map(transformMenuItem);
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      // Try fallback
      try {
        const fallbackResponse = await api.get<any[]>('/menu');
        return fallbackResponse.data.map(transformMenuItem);
      } catch (fallbackError) {
        throw error;
      }
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
      const response = await api.post<{
        success: boolean;
        item: any;
      }>('/manager/menu', itemData);
      
      if (response.data.item) {
        return transformMenuItem(response.data.item);
      }
      
      // Fallback if response is direct item
      return transformMenuItem(response.data);
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
      const response = await api.put<{
        success: boolean;
        item: any;
      }>(`/manager/menu/${itemId}`, itemData);
      
      if (response.data.item) {
        return transformMenuItem(response.data.item);
      }
      
      // Fallback if response is direct item
      return transformMenuItem(response.data);
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
      await api.delete(`/manager/menu/${itemId}`);
    } catch (error) {
      console.error(`Failed to delete menu item ${itemId}:`, error);
      throw error;
    }
  },

  /**
   * Get customer feedback for manager
   */
  getFeedback: async (page = 1, limit = 50): Promise<{
    feedback: Feedback[];
    total: number;
    page: number;
  }> => {
    try {
      const response = await api.get('/manager/feedback', {
        params: { page, limit },
      });
      // Handle both response formats
      const data = response.data;
      const rawFeedback = data.feedback || data.data || [];
      // Transform feedback data
      const feedback = rawFeedback.map(transformFeedback);
      return {
        feedback: feedback,
        total: feedback.length, // Backend doesn't support totalCount yet
        page: page,
      };
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      throw error;
    }
  },
};

// ==================== KITCHEN API ====================
const kitchenApi = {
  /**
   * Get active kitchen orders
   */
  getActiveOrders: async (): Promise<Order[]> => {
    try {
      const response = await api.get<any>('/kitchen/orders/active');
      // Handle both { orders: [...] } and direct array responses
      const ordersData = response.data.orders || response.data;
      if (Array.isArray(ordersData)) {
        return ordersData.map(transformOrder);
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch active orders:', error);
      throw error;
    }
  },

  /**
   * Update order kitchen status
   */
  updateOrderStatus: async (
    orderId: number,
    statusCode: 'pending' | 'preparing' | 'ready' | 'completed'
  ): Promise<Order> => {
    try {
      const response = await api.put<{success: boolean; data: any}>(
        `/kitchen/orders/${orderId}/status`,
        { status_code: statusCode }
      );
      return transformOrder(response.data.data || response.data);
    } catch (error) {
      console.error(`Failed to update order status ${orderId}:`, error);
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
const feedbackApi = {
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
      // Use /manager/feedback to match backend route
      const response = await api.get<{
        success: boolean;
        feedback: Feedback[];
        total?: number;
      }>('/manager/feedback', {
        params: { page, limit },
      });
      
      if (response.data.feedback) {
        return {
          feedback: response.data.feedback,
          total: response.data.total || response.data.feedback.length,
          page: page
        };
      }
      
      return { feedback: [], total: 0, page: page };
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
      const response = await api.get<{
        success: boolean;
        data: {
          summary: {
            averageRating: number;
            totalFeedback: number;
          }
        }
      }>('/feedback/stats');
      
      if (response.data.data?.summary) {
        return {
          averageRating: response.data.data.summary.averageRating,
          totalFeedback: response.data.data.summary.totalFeedback
        };
      }
      
      // Fallback
      return { averageRating: 0, totalFeedback: 0 };
    } catch (error) {
      console.error('Failed to fetch average rating:', error);
      throw error;
    }
  },
};

// ==================== QR CODE API ====================
const qrApi = {
  /**
   * Generate QR code for table
   */
  generateTableQR: async (tableNumber: number): Promise<string> => {
    try {
      const response = await api.get<{ qrCode?: string; qr_url?: string }>(`/qr/table/${tableNumber}`);
      return response.data.qrCode || response.data.qr_url || '';
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
      const response = await api.get<{ qrCode?: string; qr_url?: string }>(`/qr/order/${orderId}`);
      return response.data.qrCode || response.data.qr_url || '';
    } catch (error) {
      console.error(`Failed to generate QR code for order ${orderId}:`, error);
      throw error;
    }
  },
};

// ==================== AUTH API ====================
const authApi = {
  /**
   * Manager login
   */
  login: async (credentials: {
    username: string;
    password: string;
  }): Promise<{ token: string; manager: { id: number; username: string; role: string } }> => {
    try {
      // Try the more robust login first
      const response = await api.post('/auth/manager/login', credentials);
      if (response.data.token) {
        localStorage.setItem('managerToken', response.data.token);
      }
      return response.data;
    } catch (error) {
      console.warn('Standard login failed, trying simple login...');
      try {
        // Fallback to simple password-only login for dev
        const response = await api.post('/auth/manager-login', { password: credentials.password });
        if (response.data.token) {
          localStorage.setItem('managerToken', response.data.token);
        }
        return response.data;
      } catch (fallbackError) {
        console.error('All login methods failed:', fallbackError);
        throw error;
      }
    }
  },

  /**
   * Manager logout
   */
  logout: () => {
    localStorage.removeItem('managerToken');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('managerToken');
  },

  /**
   * Get stored token
   */
  getToken: (): string | null => {
    return localStorage.getItem('managerToken');
  },
};

// ==================== HEALTH CHECK API ====================
const healthApi = {
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
// Named exports (preferred)
export {
  menuApi,
  orderApi,
  managerApi,
  kitchenApi,
  feedbackApi,
  qrApi,
  authApi,
  healthApi,
};

// Default export for convenience (also includes createOrder alias)
export default {
  menuApi,
  orderApi,
  managerApi,
  kitchenApi,
  feedbackApi,
  qrApi,
  authApi,
  healthApi,
  // Convenience aliases
  createOrder: orderApi.createOrder,
  create: orderApi.create,
};
