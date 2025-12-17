import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Order } from '@/types';
import { managerApi } from '@/services/api';
import { useManagerOrders } from '@/hooks/useOrders';
import { format } from 'date-fns';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

export function ManagerOrdersDisplay() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial orders from API
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const data = await managerApi.getPendingOrders();
        setAllOrders(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        console.error('Error loading orders:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  // Subscribe to real-time updates
  const { orders: realtimeOrders } = useManagerOrders(allOrders);

  // Merge initial and real-time orders
  useEffect(() => {
    setAllOrders(realtimeOrders);
  }, [realtimeOrders]);

  const handleApproveOrder = async (orderId: number) => {
    try {
      await managerApi.approveOrder(orderId);
      // Order will be updated via Socket.IO
    } catch (err) {
      console.error('Failed to approve order:', err);
    }
  };

  const handleRejectOrder = async (orderId: number) => {
    try {
      await managerApi.rejectOrder(orderId, 'Rejected by manager');
      // Order will be updated via Socket.IO
    } catch (err) {
      console.error('Failed to reject order:', err);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          📋 Incoming Orders
          {allOrders.length > 0 && (
            <span className="ml-2 text-lg bg-red-500 text-white rounded-full px-3 py-1 animate-pulse">
              {allOrders.filter((o) => o.status === 'pending_approval').length}
            </span>
          )}
        </h2>
      </div>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-800">⚠️ {error}</p>
          </CardContent>
        </Card>
      )}

      {loading && !allOrders.length ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Loading orders...</p>
          </CardContent>
        </Card>
      ) : allOrders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">✅ No pending orders</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {allOrders.map((order) => (
            <Card
              key={order.id}
              className={`border-l-4 transition-all ${
                order.status === 'pending_approval' ? 'border-l-red-500' : 'border-l-green-500'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Order #{order.orderNumber || order.id}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(new Date(order.createdAt), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Items */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold text-sm mb-2">Items:</h4>
                  <ul className="space-y-1 text-sm">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between text-gray-700">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Special Instructions */}
                {order.items.some((item) => item.specialInstructions) && (
                  <div className="bg-blue-50 rounded-lg p-3 border-l-2 border-blue-500">
                    <h4 className="font-semibold text-sm mb-1">Special Instructions:</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {order.items
                        .filter((item) => item.specialInstructions)
                        .map((item, idx) => (
                          <li key={idx}>
                            <strong>{item.name}:</strong> {item.specialInstructions}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="text-lg font-bold text-green-600">
                    ${order.totalAmount.toFixed(2)}
                  </span>
                </div>

                {/* Payment Method */}
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">Payment:</span> {order.paymentMethod}
                </div>

                {/* Action Buttons */}
                {order.status === 'pending_approval' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleApproveOrder(order.id)}
                      className="bg-green-600 hover:bg-green-700 flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleRejectOrder(order.id)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}

                {order.status === 'in_progress' && (
                  <div className="flex items-center text-sm text-orange-600 pt-2">
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Currently being prepared...
                  </div>
                )}

                {order.status === 'ready' && (
                  <div className="flex items-center text-sm text-green-600 font-semibold pt-2">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Ready for pickup!
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
