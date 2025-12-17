import { useState, useMemo, useEffect } from 'react';
import { mockOrders } from '@/data/mockData';
import { Order, KitchenStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChefHat, 
  Clock, 
  ArrowRight, 
  Bell, 
  Search,
  Timer,
  UtensilsCrossed,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { kitchenApi } from '@/services/api';
import { usePersistentState } from '@/hooks/usePersistentState';

interface KanbanColumnProps {
  title: string;
  status: KitchenStatus;
  orders: Order[];
  icon: React.ReactNode;
  color: string;
  onMoveOrder: (orderId: number, newStatus: KitchenStatus) => void;
}

function KanbanColumn({ title, status, orders, icon, color, onMoveOrder }: KanbanColumnProps) {
  const nextStatus: Record<KitchenStatus, KitchenStatus | null> = {
    pending: 'preparing',
    preparing: 'ready',
    ready: null,
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-t-xl ${color}`}>
        {icon}
        <h3 className="font-semibold text-white">{title}</h3>
        <Badge variant="secondary" className="ml-auto bg-white/20 text-white">
          {orders.length}
        </Badge>
      </div>
      
      <ScrollArea className="flex-1 bg-muted/30 rounded-b-xl border border-t-0 border-border">
        <div className="p-3 space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No orders</p>
            </div>
          ) : (
            orders.map(order => {
              const timeAgo = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true });
              const isUrgent = Date.now() - new Date(order.createdAt).getTime() > 10 * 60 * 1000;
              
              return (
                <div
                  key={order.id}
                  className={`bg-card rounded-lg p-4 shadow-sm border transition-all hover:shadow-md ${
                    isUrgent && status === 'pending' ? 'border-destructive/50 animate-pulse' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-semibold text-sm text-primary">
                      {order.orderNumber}
                    </span>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{timeAgo}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3 text-sm">
                    <Badge variant="outline" className="text-xs">
                      Table {order.tableNumber}
                    </Badge>
                    {isUrgent && status !== 'ready' && (
                      <Badge className="bg-destructive text-destructive-foreground text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Urgent
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-foreground">
                          {item.quantity}x {item.name}
                        </span>
                        {item.specialInstructions && (
                          <span className="text-xs text-secondary truncate max-w-[100px]">
                            {item.specialInstructions}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {nextStatus[status] && (
                    <Button
                      size="sm"
                      onClick={() => onMoveOrder(order.id, nextStatus[status]!)}
                      className="w-full bg-gradient-primary hover:opacity-90"
                    >
                      {status === 'pending' ? 'Start Preparing' : 'Mark Ready'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}

                  {status === 'ready' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-success text-success hover:bg-success/10"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Complete Order
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function KitchenPage() {
  // Use persistent state to maintain order status across navigation
  const [orders, setOrders] = usePersistentState<Order[]>(
    'kitchenOrders',
    [],
    sessionStorage
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch active kitchen orders on component mount (only once)
  useEffect(() => {
    const fetchOrders = async () => {
      if (hasFetched) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const activeOrders = await kitchenApi.getActiveOrders();
        setOrders(activeOrders.length > 0 ? activeOrders : mockOrders);
        console.log('✅ Kitchen orders loaded:', activeOrders.length, 'orders');
      } catch (error) {
        console.error('Failed to load kitchen orders:', error);
        // Fall back to mock data if fetch fails
        setOrders(mockOrders);
      } finally {
        setLoading(false);
        setHasFetched(true);
      }
    };

    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const query = searchQuery.toLowerCase();
    return orders.filter(
      order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.tableNumber?.includes(query)
    );
  }, [orders, searchQuery]);

  const pendingOrders = filteredOrders.filter(o => o.kitchenStatus === 'pending');
  const preparingOrders = filteredOrders.filter(o => o.kitchenStatus === 'preparing');
  const readyOrders = filteredOrders.filter(o => o.kitchenStatus === 'ready');

  const handleMoveOrder = (orderId: number, newStatus: KitchenStatus) => {
    // Update local state immediately for UI feedback
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, kitchenStatus: newStatus } : order
      )
    );
    
    // TODO: Call backend API to persist status change
    // await kitchenApi.updateOrderStatus(orderId, newStatus);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-dark text-white">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold">Kitchen Display</h1>
                <p className="text-white/70 text-sm">Real-time order management</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 w-64 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-warning" />
              <span className="text-white/70">Pending:</span>
              <span className="font-semibold">{pendingOrders.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-secondary" />
              <span className="text-white/70">Preparing:</span>
              <span className="font-semibold">{preparingOrders.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-white/70">Ready:</span>
              <span className="font-semibold">{readyOrders.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          <KanbanColumn
            title="Pending"
            status="pending"
            orders={pendingOrders}
            icon={<Timer className="w-5 h-5 text-white" />}
            color="bg-warning"
            onMoveOrder={handleMoveOrder}
          />
          <KanbanColumn
            title="Preparing"
            status="preparing"
            orders={preparingOrders}
            icon={<UtensilsCrossed className="w-5 h-5 text-white" />}
            color="bg-secondary"
            onMoveOrder={handleMoveOrder}
          />
          <KanbanColumn
            title="Ready"
            status="ready"
            orders={readyOrders}
            icon={<CheckCircle2 className="w-5 h-5 text-white" />}
            color="bg-success"
            onMoveOrder={handleMoveOrder}
          />
        </div>
      </main>
    </div>
  );
}
