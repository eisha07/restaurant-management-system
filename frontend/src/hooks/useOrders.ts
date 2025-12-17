import { useState, useEffect, useRef } from 'react';
import { Order } from '@/types';
import {
  subscribeToManagerDashboard,
  unsubscribeFromManagerDashboard,
  onNewOrder,
  onOrderStatusUpdate,
  subscribeToKitchenDisplay,
  unsubscribeFromKitchenDisplay,
  onKitchenOrderUpdate,
} from '@/services/socket';

/**
 * Hook to subscribe to real-time manager orders
 */
export const useManagerOrders = (initialOrders: Order[] = []) => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // Subscribe to new orders
    const unsubscribeNewOrder = onNewOrder((newOrder) => {
      setOrders((prevOrders) => {
        // Avoid duplicates
        if (!prevOrders.find((o) => o.id === newOrder.id)) {
          return [newOrder, ...prevOrders];
        }
        return prevOrders;
      });
    });

    // Subscribe to order status updates
    const unsubscribeStatus = onOrderStatusUpdate((updatedOrder) => {
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        )
      );
    });

    subscribeToManagerDashboard();

    unsubscribeRef.current = [unsubscribeNewOrder, unsubscribeStatus];

    return () => {
      unsubscribeFromManagerDashboard();
      unsubscribeRef.current.forEach((unsub) => unsub());
    };
  }, []);

  return { orders, setOrders, loading };
};

/**
 * Hook to subscribe to real-time kitchen orders
 */
export const useKitchenOrders = (initialOrders: Order[] = []) => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // Subscribe to kitchen order updates
    const unsubscribeKitchenUpdate = onKitchenOrderUpdate((updatedOrder) => {
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        )
      );
    });

    subscribeToKitchenDisplay();

    unsubscribeRef.current = [unsubscribeKitchenUpdate];

    return () => {
      unsubscribeFromKitchenDisplay();
      unsubscribeRef.current.forEach((unsub) => unsub());
    };
  }, []);

  return { orders, setOrders, loading };
};

/**
 * Hook to track specific order updates
 */
export const useOrderUpdates = (orderId: number) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // Subscribe to status updates for this specific order
    const unsubscribeStatus = onOrderStatusUpdate((updatedOrder) => {
      if (updatedOrder.id === orderId) {
        setOrder(updatedOrder);
      }
    });

    unsubscribeRef.current = [unsubscribeStatus];
    setLoading(false);

    return () => {
      unsubscribeRef.current.forEach((unsub) => unsub());
    };
  }, [orderId]);

  return { order, loading };
};
