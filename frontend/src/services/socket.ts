import { io, Socket } from 'socket.io-client';
import { Order } from '@/types';
import { transformOrder } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

let socket: Socket | null = null;

// Track rooms to rejoin on reconnection
const activeRooms = {
  manager: false,
  kitchen: false,
  orders: new Set<number>(),
  sessions: new Set<string>()
};

/**
 * Initialize Socket.IO connection
 */
export const initializeSocket = (): Socket => {
  if (socket && socket.connected) {
    console.log('✅ Socket already connected');
    return socket;
  }

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10, // Increased attempts
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('🔗 Socket connected:', socket!.id);
    
    // Rejoin rooms on reconnection
    if (activeRooms.manager) {
      socket!.emit('join-manager');
      console.log('📡 Rejoined manager room');
    }
    if (activeRooms.kitchen) {
      socket!.emit('join-kitchen');
      console.log('📡 Rejoined kitchen room');
    }
    activeRooms.orders.forEach(orderId => {
      socket!.emit('join-customer', { orderId });
      console.log(`📡 Rejoined order room: order_${orderId}`);
    });
    activeRooms.sessions.forEach(sessionId => {
      socket!.emit('join-customer', { sessionId });
      console.log(`📡 Rejoined session room: session_${sessionId}`);
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });

  return socket;
};

/**
 * Get active socket instance
 */
export const getSocket = (): Socket => {
  if (!socket) {
    return initializeSocket();
  }
  // If socket exists but is disconnected, try to reconnect
  if (!socket.connected) {
    console.log('🔄 Socket disconnected, attempting to reconnect...');
    socket.connect();
  }
  return socket;
};

/**
 * Close socket connection
 */
export const closeSocket = (): void => {
  if (socket && socket.connected) {
    socket.disconnect();
    console.log('🔌 Socket disconnected');
  }
};

// ==================== REAL-TIME ORDER EVENTS ====================

/**
 * Listen for new orders (for manager)
 */
export const onNewOrder = (callback: (order: Order) => void): (() => void) => {
  const socketInstance = getSocket();
  
  const handler = (data: any) => {
    // Backend sends { type, order, timestamp }, extract the order
    if (data.order) {
      callback(transformOrder(data.order));
    } else {
      callback(transformOrder(data));
    }
  };
  
  socketInstance.on('new-order', handler);
  
  return () => {
    socketInstance.off('new-order', handler);
  };
};

/**
 * Listen for order status updates
 */
export const onOrderStatusUpdate = (
  callback: (order: Order) => void
): (() => void) => {
  const socketInstance = getSocket();
  
  const handler = (data: any) => {
    console.log('📡 Socket: order status update received:', data);
    // Backend sends orderId and status, construct a partial order update
    const orderUpdate = {
      id: data.orderId || data.id || data.order_id,
      order_id: data.orderId || data.id || data.order_id,
      status: data.status,
      kitchen_status: data.status || data.kitchen_status,
      ...data
    };
    callback(transformOrder(orderUpdate));
  };
  
  // Listen to both event names (backend uses 'order-update', legacy uses 'order_status_updated')
  socketInstance.on('order_status_updated', handler);
  socketInstance.on('order-update', handler);
  
  return () => {
    socketInstance.off('order_status_updated', handler);
    socketInstance.off('order-update', handler);
  };
};

/**
 * Listen for order approval/rejection
 */
export const onOrderApprovalUpdate = (
  callback: (data: { orderId: number; approved: boolean; reason?: string }) => void
): (() => void) => {
  const socketInstance = getSocket();
  
  const handleApproved = (data: any) => callback({ ...data, approved: true });
  const handleRejected = (data: any) => callback({ ...data, approved: false });

  socketInstance.on('order_approved', handleApproved);
  socketInstance.on('order-approved', handleApproved);
  socketInstance.on('order_rejected', handleRejected);
  socketInstance.on('order-rejected', handleRejected);
  
  return () => {
    socketInstance.off('order_approved', handleApproved);
    socketInstance.off('order-approved', handleApproved);
    socketInstance.off('order_rejected', handleRejected);
    socketInstance.off('order-rejected', handleRejected);
  };
};

/**
 * Listen for kitchen order updates
 */
export const onKitchenOrderUpdate = (
  callback: (order: Order) => void
): (() => void) => {
  const socketInstance = getSocket();
  socketInstance.on('kitchen_order_updated', callback);
  
  return () => {
    socketInstance.off('kitchen_order_updated', callback);
  };
};

/**
 * Listen for item status updates
 */
export const onItemStatusUpdate = (
  callback: (data: {
    orderId: number;
    itemId: number;
    status: 'pending' | 'preparing' | 'ready';
  }) => void
): (() => void) => {
  const socketInstance = getSocket();
  socketInstance.on('item_status_updated', callback);
  
  return () => {
    socketInstance.off('item_status_updated', callback);
  };
};

/**
 * Listen for order completion
 */
export const onOrderComplete = (
  callback: (order: Order) => void
): (() => void) => {
  const socketInstance = getSocket();
  
  const handler = (data: any) => {
    const order = transformOrder(data);
    if (order.status === 'completed') {
      callback(order);
    }
  };

  socketInstance.on('order_completed', callback);
  socketInstance.on('order-update', handler);
  
  return () => {
    socketInstance.off('order_completed', callback);
    socketInstance.off('order-update', handler);
  };
};

/**
 * Listen for order creation (for customer)
 */
export const onOrderCreated = (callback: (data: any) => void): (() => void) => {
  const socketInstance = getSocket();
  socketInstance.on('order-created', callback);
  
  return () => {
    socketInstance.off('order-created', callback);
  };
};

// ==================== NOTIFICATION EVENTS ====================

/**
 * Listen for real-time notifications
 */
export const onNotification = (
  callback: (notification: {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: number;
  }) => void
): (() => void) => {
  const socketInstance = getSocket();
  socketInstance.on('notification', callback);
  
  return () => {
    socketInstance.off('notification', callback);
  };
};

// ==================== REAL-TIME STATISTICS ====================

/**
 * Listen for dashboard statistics updates
 */
export const onStatsUpdate = (
  callback: (stats: {
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    averageOrderValue: number;
  }) => void
): (() => void) => {
  const socketInstance = getSocket();
  socketInstance.on('stats_updated', callback);
  
  return () => {
    socketInstance.off('stats_updated', callback);
  };
};

/**
 * Listen for kitchen display updates
 */
export const onKitchenStatsUpdate = (
  callback: (stats: {
    activeOrders: number;
    completedToday: number;
    averagePrepTime: number;
  }) => void
): (() => void) => {
  const socketInstance = getSocket();
  socketInstance.on('kitchen_stats_updated', callback);
  
  return () => {
    socketInstance.off('kitchen_stats_updated', callback);
  };
};

// ==================== SOCKET EMITTERS ====================

/**
 * Join order updates room
 */
export const joinOrderRoom = (orderId: number): void => {
  const socketInstance = getSocket();
  activeRooms.orders.add(orderId);
  socketInstance.emit('join-customer', { orderId });
  console.log(`📡 Joined order room: order_${orderId}`);
};

/**
 * Join customer session room
 */
export const joinSessionRoom = (sessionId: string): void => {
  const socketInstance = getSocket();
  activeRooms.sessions.add(sessionId);
  socketInstance.emit('join-customer', { sessionId });
  console.log(`📡 Joined session room: session_${sessionId}`);
};

/**
 * Leave order updates room
 */
export const leaveOrderRoom = (orderId: number): void => {
  const socketInstance = getSocket();
  activeRooms.orders.delete(orderId);
  socketInstance.emit('leave-customer', { orderId });
  console.log(`📡 Left order room: order_${orderId}`);
};

/**
 * Subscribe to manager updates
 */
export const subscribeToManagerDashboard = (): void => {
  const socketInstance = getSocket();
  activeRooms.manager = true;
  // Join the managers room to receive real-time updates
  socketInstance.emit('join-manager');
  console.log('📡 Subscribed to manager dashboard - joined managers room');
};

/**
 * Unsubscribe from manager updates
 */
export const unsubscribeFromManagerDashboard = (): void => {
  const socketInstance = getSocket();
  activeRooms.manager = false;
  socketInstance.emit('leave-manager');
  console.log('📡 Unsubscribed from manager dashboard');
};

/**
 * Subscribe to kitchen display
 */
export const subscribeToKitchenDisplay = (): void => {
  const socketInstance = getSocket();
  activeRooms.kitchen = true;
  socketInstance.emit('join-kitchen');
  console.log('📡 Subscribed to kitchen display - joined kitchen room');
};

/**
 * Unsubscribe from kitchen display
 */
export const unsubscribeFromKitchenDisplay = (): void => {
  const socketInstance = getSocket();
  activeRooms.kitchen = false;
  socketInstance.emit('leave-kitchen');
  console.log('📡 Unsubscribed from kitchen display');
};

export default {
  initializeSocket,
  getSocket,
  closeSocket,
  onNewOrder,
  onOrderStatusUpdate,
  onOrderApprovalUpdate,
  onKitchenOrderUpdate,
  onItemStatusUpdate,
  onOrderComplete,
  onOrderCreated,
  onNotification,
  onStatsUpdate,
  onKitchenStatsUpdate,
  joinOrderRoom,
  joinSessionRoom,
  leaveOrderRoom,
  subscribeToManagerDashboard,
  unsubscribeFromManagerDashboard,
  subscribeToKitchenDisplay,
  unsubscribeFromKitchenDisplay,
};
