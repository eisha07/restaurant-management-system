import { useState, useEffect } from 'react';
import { mockOrders } from '@/data/mockData';
import { Order, MenuItem } from '@/types';
import { MenuBrowser } from '@/components/customer/MenuBrowser';
import { CartModal } from '@/components/customer/CartModal';
import { CheckoutModal } from '@/components/customer/CheckoutModal';
import { OrderStatusTracker } from '@/components/customer/OrderStatusTracker';
import { FeedbackForm } from '@/components/customer/FeedbackForm';
import { Header } from '@/components/shared/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ClipboardList, ChevronRight } from 'lucide-react';
import { menuApi } from '@/services/api';

export default function CustomerPage() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

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

  // Simulate active orders (in real app, this would come from context/API)
  const activeOrders = mockOrders.filter(o => 
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
