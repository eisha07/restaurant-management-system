import { useState, useEffect, useCallback } from 'react';
import { Order, MenuItem } from '@/types';
import { MenuBrowser } from '@/components/customer/MenuBrowser';
import { CartModal } from '@/components/customer/CartModal';
import { CheckoutModal } from '@/components/customer/CheckoutModal';
import { OrderStatusTracker } from '@/components/customer/OrderStatusTracker';
import { FeedbackForm } from '@/components/customer/FeedbackForm';
import { Header } from '@/components/shared/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Sparkles, ClipboardList, ChevronRight, ChevronDown } from 'lucide-react';
import { menuApi, orderApi } from '@/services/api';
import { 
  initializeSocket, 
  getSocket, 
  joinOrderRoom, 
  joinSessionRoom,
  leaveOrderRoom,
  onOrderStatusUpdate,
  onOrderApprovalUpdate,
  onOrderComplete,
  onOrderCreated
} from '@/services/socket';
import { toast } from 'sonner';

export default function CustomerPage() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [feedbackDueOrders, setFeedbackDueOrders] = useState<Set<number>>(new Set());

  // Accept sessionId from URL and store as customerSessionId if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('sessionId');
    if (urlSessionId) {
      localStorage.setItem('customerSessionId', urlSessionId);
    }
  }, []);

  // Get customer session ID
  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem('customerSessionId');
    if (!sessionId) {
      sessionId = `customer-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem('customerSessionId', sessionId);
    }
    return sessionId;
  }, []);

  // Fetch customer's orders from database
  const fetchCustomerOrders = useCallback(async () => {
    const sessionId = getSessionId();
    try {
      const orders = await orderApi.getByCustomerSession(sessionId);
      setCustomerOrders(orders);
      console.log('✅ Customer orders loaded:', orders.length, 'orders');
      
      // Join socket rooms for each active order
      orders.forEach(order => {
        if (order.status !== 'completed' && order.status !== 'cancelled') {
          joinOrderRoom(order.id);
        }
      });
    } catch (error) {
      console.error('Failed to load customer orders:', error);
    }
  }, [getSessionId]);

  // Initialize socket and fetch orders
  useEffect(() => {
    initializeSocket();
    const sessionId = getSessionId();
    joinSessionRoom(sessionId);
    fetchCustomerOrders();

    // Listen for new orders from this session via Socket.IO
    const unsubCreated = onOrderCreated((data) => {
      console.log('📡 Order created confirmation received:', data);
      fetchCustomerOrders();
    });

    // Also keep the window event for local updates
    const handleOrderCreated = () => {
      fetchCustomerOrders();
    };
    window.addEventListener('orderCreated', handleOrderCreated);

    return () => {
      unsubCreated();
      window.removeEventListener('orderCreated', handleOrderCreated);
    };
  }, [fetchCustomerOrders, getSessionId]);

  // Socket event handlers for real-time updates
  useEffect(() => {
    // Handle order status updates
    const unsubStatus = onOrderStatusUpdate((updatedOrder) => {
      console.log('📡 Real-time order status update:', updatedOrder);
      setCustomerOrders(prev => 
        prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)
      );
      
      // Update selected order if it matches
      setSelectedOrder(prev => 
        prev && prev.id === updatedOrder.id ? { ...prev, ...updatedOrder } : prev
      );
      
      // Show toast notification for status changes
      const statusMessages: Record<string, string> = {
        'approved': '✅ Your order has been approved!',
        'in_progress': '👨‍🍳 Your order is being prepared!',
        'ready': '🍽️ Your order is ready for pickup!',
        'completed': '✓ Order completed. Thank you!'
      };
      if (statusMessages[updatedOrder.status]) {
        toast.success(statusMessages[updatedOrder.status]);
      }
    });

    // Handle order approval/rejection
    const unsubApproval = onOrderApprovalUpdate((data) => {
      console.log('📡 Order approval update:', data);
      
      const orderId = typeof data.orderId === 'string' ? parseInt(data.orderId, 10) : data.orderId;
      
      if (data.approved) {
        toast.success('Your order has been approved by the manager!');
        // Update local state immediately for better UX
        setCustomerOrders(prev => 
          prev.map(o => o.id === orderId ? { ...o, status: 'approved' as const } : o)
        );
        setSelectedOrder(prev => 
          prev && prev.id === orderId ? { ...prev, status: 'approved' as const } : prev
        );
      } else {
        toast.error(`Order rejected: ${data.reason || 'Please contact staff'}`);
        setCustomerOrders(prev => 
          prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as const } : o)
        );
      }
      
      // Still fetch to get full updated data (like expected completion time)
      fetchCustomerOrders();
    });

    // Handle order completion
    const unsubComplete = onOrderComplete((order) => {
      console.log('📡 Order completed:', order);
      toast.success('🎉 Your order is complete!');
      setCustomerOrders(prev => 
        prev.map(o => o.id === order.id ? order : o)
      );
      // Leave the order room
      leaveOrderRoom(order.id);
    });

    return () => {
      unsubStatus();
      unsubApproval();
      unsubComplete();
    };
  }, [fetchCustomerOrders]);

  // Check for orders that are due for feedback (estimated time has passed)
  useEffect(() => {
    const checkFeedbackDue = () => {
      const now = new Date();
      customerOrders.forEach(order => {
        if (order.expectedCompletion && order.status !== 'cancelled') {
          const expectedTime = new Date(order.expectedCompletion);
          if (now >= expectedTime && !feedbackDueOrders.has(order.id)) {
            // Order is past its expected completion - prompt for feedback
            setFeedbackDueOrders(prev => new Set(prev).add(order.id));
            if (order.status === 'completed' || order.status === 'ready') {
              // Auto-open feedback form for completed orders
              setSelectedOrder(order);
              setIsFeedbackOpen(true);
              toast.info('Please rate your order experience!', {
                duration: 5000,
              });
            }
          }
        }
      });
    };

    // Check immediately and then every 30 seconds
    checkFeedbackDue();
    const interval = setInterval(checkFeedbackDue, 30000);
    return () => clearInterval(interval);
  }, [customerOrders, feedbackDueOrders]);

  // Fetch menu items from database
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoadingMenu(true);
        const items = await menuApi.getAllItems();
        setMenuItems(items);
        console.log('✅ Menu loaded from database:', items.length, 'items');
      } catch (error) {
        console.error('Failed to load menu:', error);
        setMenuItems([]);
      } finally {
        setLoadingMenu(false);
      }
    };
    
    fetchMenu();
  }, []);

  // Filter active orders (not completed or cancelled)
  const activeOrders = customerOrders.filter(o => 
    o.status !== 'completed' && o.status !== 'cancelled'
  );

  // Extract categories from menu items with item counts
  const categories = Array.from(
    menuItems.reduce((acc, item) => {
      if (!acc.has(item.category)) {
        acc.set(item.category, { 
          id: item.category, 
          name: item.category,
          icon: '🍽️',
          itemCount: 0 
        });
      }
      const cat = acc.get(item.category)!;
      cat.itemCount++;
      return acc;
    }, new Map<string, { id: string; name: string; icon: string; itemCount: number }>())
    .values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const handleTrackOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsTrackingOpen(true);
  };

  const handleLeaveFeedback = () => {
    setIsTrackingOpen(false);
    setIsFeedbackOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => setIsCartOpen(true)} />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero py-16 md:py-24">
        <div className="absolute inset-0 bg-[url('https://via.placeholder.com/1920x600/2D3142/FFFFFF?text=Restaurant+Hero')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        
        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto text-center text-white space-y-6 animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Crafted with passion, served with love</span>
            </div>
            
            <h1 className="font-serif text-4xl md:text-6xl font-bold leading-tight">
              Experience Culinary
              <br />
              <span className="text-secondary">Excellence</span>
            </h1>
            
            <p className="text-white/80 text-lg max-w-xl mx-auto">
              From authentic Desi flavors to international cuisines, discover a menu 
              curated to delight your taste buds.
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-1 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Active Orders Banner */}
      {activeOrders.length > 0 && (
        <div className="bg-primary/5 border-b border-primary/20">
          <div className="container py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    You have {activeOrders.length} active order{activeOrders.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Track your order status in real-time
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {activeOrders.slice(0, 2).map(order => (
                  <Button
                    key={order.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTrackOrder(order)}
                    className="border-primary/30 hover:border-primary"
                  >
                    <Badge variant="secondary" className="mr-2 text-xs">
                      {order.status.replace('_', ' ')}
                    </Badge>
                    {order.orderNumber.slice(-7)}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ))}
                
                {activeOrders.length > 2 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="border-primary/30">
                        +{activeOrders.length - 2} More <ChevronDown className="w-4 h-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {activeOrders.slice(2).map(order => (
                        <DropdownMenuItem 
                          key={order.id} 
                          onClick={() => handleTrackOrder(order)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-medium">{order.orderNumber.slice(-7)}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Section */}
      <main className="container py-8 md:py-12">
        <div className="mb-8">
          <h2 className="font-serif text-3xl font-bold text-foreground mb-2">Our Menu</h2>
          <p className="text-muted-foreground">Explore our carefully crafted dishes</p>
        </div>
        
        {loadingMenu ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-muted h-64 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : menuItems.length > 0 ? (
          <MenuBrowser items={menuItems} categories={categories} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No menu items available</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-muted/30">
        <div className="container text-center text-muted-foreground text-sm">
          <p>© 2024 Savoria Restaurant. All rights reserved.</p>
          <p className="mt-1">Made with ❤️ for food lovers</p>
        </div>
      </footer>

      {/* Modals */}
      <CartModal
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => setIsCheckoutOpen(true)}
      />
      <CheckoutModal
        open={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
      {selectedOrder && (
        <>
          <OrderStatusTracker
            order={selectedOrder}
            open={isTrackingOpen}
            onClose={() => setIsTrackingOpen(false)}
            onLeaveFeedback={handleLeaveFeedback}
          />
          <FeedbackForm
            orderId={selectedOrder.id}
            orderNumber={selectedOrder.orderNumber}
            open={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
          />
        </>
      )}
    </div>
  );
}
