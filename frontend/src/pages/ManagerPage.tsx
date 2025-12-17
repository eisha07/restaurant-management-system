import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockOrders, mockStatistics, mockFeedback, menuItems } from '@/data/mockData';
import { StatisticsCharts } from '@/components/manager/StatisticsCharts';
import { ManagerLoginDialog } from '@/components/manager/ManagerLoginDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { managerApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { onNewOrder, subscribeToManagerDashboard, getSocket } from '@/services/socket';
import { usePersistentState } from '@/hooks/usePersistentState';
import {
  LayoutDashboard,
  ClipboardList,
  Menu as MenuIcon,
  BarChart3,
  MessageSquare,
  LogOut,
  Clock,
  DollarSign,
  TrendingUp,
  Star,
  Search,
  Check,
  X,
  ChevronRight,
  Utensils,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export default function ManagerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Use persistent state for orders - survives navigation and tab switches
  const [orders, setOrders] = usePersistentState('managerOrders', mockOrders, sessionStorage);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(mockStatistics);
  const [menuItemsList, setMenuItemsList] = useState(menuItems);
  const [feedbackList, setFeedbackList] = useState([]);

  const pendingOrders = orders.filter(o => o.status === 'pending_approval');

  // Check if already authenticated on mount and fetch pending orders
  useEffect(() => {
    const token = localStorage.getItem('managerToken');
    if (!token) {
      setShowLoginDialog(true);
    } else {
      setIsAuthenticated(true);
      
      // Fetch pending orders on mount
      const fetchPendingOrders = async () => {
        try {
          setLoading(true);
          const data = await managerApi.getPendingOrders();
          if (data && Array.isArray(data)) {
            setOrders(data);
            console.log('✅ Loaded', data.length, 'pending orders from API');
          }
        } catch (error) {
          console.error('Failed to fetch pending orders on mount:', error);
          // Keep mock orders as fallback if API fails
        } finally {
          setLoading(false);
        }
      };
      
      // Fetch statistics
      const fetchStatistics = async () => {
        try {
          const statsData = await managerApi.getStatistics();
          if (statsData) {
            setStats({
              todayOrders: statsData.totalOrders,
              todayRevenue: statsData.totalRevenue,
              averageOrderValue: statsData.averageOrderValue,
              averageRating: 4.5, // Will be updated from feedback
              totalOrders: statsData.totalOrders,
              topItems: mockStatistics.topItems // Keep mock for now
            });
            console.log('✅ Loaded statistics from API');
          }
        } catch (error) {
          console.error('Failed to fetch statistics on mount:', error);
          // Keep mock statistics as fallback
        }
      };
      
      // Fetch menu items
      const fetchMenu = async () => {
        try {
          const menuData = await managerApi.getMenuItems();
          if (menuData && Array.isArray(menuData)) {
            setMenuItemsList(menuData);
            console.log('✅ Loaded', menuData.length, 'menu items from API');
          }
        } catch (error) {
          console.error('Failed to fetch menu items:', error);
          // Keep mock menu as fallback
        }
      };

      // Fetch feedback
      const fetchFeedback = async () => {
        try {
          const feedbackData = await managerApi.getFeedback(1, 50);
          if (feedbackData && feedbackData.feedback && Array.isArray(feedbackData.feedback)) {
            setFeedbackList(feedbackData.feedback);
            console.log('✅ Loaded', feedbackData.feedback.length, 'feedback items from API');
          }
        } catch (error) {
          console.error('Failed to fetch feedback:', error);
          // Keep mock feedback as fallback
        }
      };

      fetchPendingOrders();
      fetchStatistics();
      fetchMenu();
      fetchFeedback();
      
      // Subscribe to manager dashboard for real-time order updates
      subscribeToManagerDashboard();
    }
  }, []);

  // Listen for new orders and real-time updates via Socket.IO
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    // Listen for new orders
    const unsubscribeNewOrder = onNewOrder((newOrder) => {
      console.log('📬 New order received:', newOrder);
      setOrders(prevOrders => [newOrder, ...prevOrders]);
      toast({
        title: 'New Order! 🔔',
        description: `Order #${newOrder.order_number} received`,
      });
    });

    // Listen for pending orders updates (approvals, rejections, etc.)
    const handleOrdersUpdate = (data: any) => {
      console.log('🔄 Orders updated:', data);
      // Refetch pending orders
      managerApi.getPendingOrders().then(data => {
        if (data && Array.isArray(data)) {
          setOrders(data);
        }
      }).catch(err => console.error('Failed to fetch pending orders:', err));
    };

    socket.on('pending-orders-updated', handleOrdersUpdate);

    return () => {
      unsubscribeNewOrder();
      socket.off('pending-orders-updated', handleOrdersUpdate);
    };
  }, [isAuthenticated, toast]);

  const handleLogin = (token: string) => {
    setIsAuthenticated(true);
    setShowLoginDialog(false);
    toast({
      title: 'Authenticated',
      description: 'Welcome to the manager dashboard',
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('managerToken');
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleApproveOrder = async (orderId: number) => {
    try {
      setLoading(true);
      await managerApi.approveOrder(orderId);
      // Update local state
      setOrders(orders.map(o => 
        o.id === orderId ? { ...o, status: 'approved' } : o
      ));
      toast({
        title: 'Order approved',
        description: `Order #${orderId} has been sent to kitchen`,
      });
    } catch (err) {
      console.error('Failed to approve order:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({
        title: 'Error',
        description: `Failed to approve order: ${errorMsg}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectOrder = async (orderId: number) => {
    try {
      setLoading(true);
      await managerApi.rejectOrder(orderId, 'Rejected by manager');
      // Update local state
      setOrders(orders.map(o => 
        o.id === orderId ? { ...o, status: 'cancelled' } : o
      ));
      toast({
        title: 'Order rejected',
        description: 'Customer has been notified',
      });
    } catch (err) {
      console.error('Failed to reject order:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({
        title: 'Error',
        description: `Failed to reject order: ${errorMsg}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenuItem = async (itemId: number) => {
    try {
      setLoading(true);
      await managerApi.deleteMenuItem(itemId);
      // Update local state
      setMenuItemsList(menuItemsList.filter(item => item.id !== itemId));
      toast({
        title: 'Item deleted',
        description: 'Menu item has been removed',
      });
    } catch (err) {
      console.error('Failed to delete menu item:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({
        title: 'Error',
        description: `Failed to delete item: ${errorMsg}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Show login dialog if not authenticated
  if (!isAuthenticated) {
    return <ManagerLoginDialog open={showLoginDialog} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border hidden lg:block">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <span className="font-serif text-xl font-semibold">Savoria</span>
          </Link>
        </div>

        <nav className="px-3 space-y-1">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'orders', label: 'Pending Orders', icon: ClipboardList, badge: pendingOrders.length },
            { id: 'menu', label: 'Menu Management', icon: MenuIcon },
            { id: 'statistics', label: 'Statistics', icon: BarChart3 },
            { id: 'feedback', label: 'Feedback', icon: MessageSquare },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.badge && (
                <Badge className="ml-auto bg-secondary text-secondary-foreground">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-3 right-3">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-6 h-16">
            <div>
              <h1 className="font-serif text-2xl font-bold">
                {activeTab === 'overview' && 'Dashboard'}
                {activeTab === 'orders' && 'Pending Orders'}
                {activeTab === 'menu' && 'Menu Management'}
                {activeTab === 'statistics' && 'Statistics'}
                {activeTab === 'feedback' && 'Customer Feedback'}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-9 w-64" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                  M
                </div>
                <span className="text-sm font-medium">Manager</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Today's Orders</p>
                        <p className="text-3xl font-bold text-foreground">{stats.todayOrders}</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <ClipboardList className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <p className="text-xs text-success mt-2">
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      +12% from yesterday
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Today's Revenue</p>
                        <p className="text-3xl font-bold text-foreground">${stats.todayRevenue}</p>
                      </div>
                      <div className="p-3 bg-success/10 rounded-lg">
                        <DollarSign className="w-6 h-6 text-success" />
                      </div>
                    </div>
                    <p className="text-xs text-success mt-2">
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      +8% from yesterday
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                        <p className="text-3xl font-bold text-foreground">${stats.averageOrderValue.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-secondary/10 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-secondary" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Based on {stats.totalOrders} total orders
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Rating</p>
                        <p className="text-3xl font-bold text-foreground">{stats.averageRating}</p>
                      </div>
                      <div className="p-3 bg-warning/10 rounded-lg">
                        <Star className="w-6 h-6 text-warning fill-warning" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      From customer feedback
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Pending Orders Preview */}
              {pendingOrders.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-warning" />
                      Pending Approval ({pendingOrders.length})
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('orders')}>
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingOrders.slice(0, 3).map(order => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="font-mono font-semibold text-sm">{order.orderNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              Table {order.tableNumber} • {order.items.length} items
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">${order.totalAmount.toFixed(2)}</span>
                            <Button 
                              size="sm" 
                              className="bg-success hover:bg-success/90"
                              onClick={() => handleApproveOrder(order.id)}
                              disabled={loading}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleRejectOrder(order.id)}
                              disabled={loading}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.topItems.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-4">
                        <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <div className="w-full bg-muted rounded-full h-2 mt-1">
                            <div
                              className="bg-gradient-primary h-2 rounded-full"
                              style={{ width: `${(item.count / stats.topItems[0].count) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-muted-foreground text-sm">{item.count} sold</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4 animate-fade-in">
              {pendingOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-medium">No pending orders</p>
                    <p className="text-muted-foreground">All orders have been processed</p>
                  </CardContent>
                </Card>
              ) : (
                pendingOrders.map(order => (
                  <Card key={order.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-mono font-bold text-lg">{order.orderNumber}</p>
                          <p className="text-muted-foreground">
                            Table {order.tableNumber} •{' '}
                            {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge className="status-pending">Pending Approval</Badge>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4 mb-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between py-1">
                            <span>
                              {item.quantity}x {item.name}
                              {item.specialInstructions && (
                                <span className="text-secondary text-sm ml-2">
                                  ({item.specialInstructions})
                                </span>
                              )}
                            </span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="border-t border-border mt-2 pt-2 flex justify-between font-semibold">
                          <span>Total</span>
                          <span>${order.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          className="flex-1 bg-success hover:bg-success/90"
                          onClick={() => handleApproveOrder(order.id)}
                          disabled={loading}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {loading ? 'Processing...' : 'Approve Order'}
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="flex-1"
                          onClick={() => handleRejectOrder(order.id)}
                          disabled={loading}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Menu Tab */}
          {activeTab === 'menu' && (
            <div className="animate-fade-in">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Menu Items ({menuItemsList.length})</CardTitle>
                  <Button className="bg-gradient-primary">+ Add Item</Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {menuItemsList.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${item.price.toFixed(2)}</p>
                            <Badge variant={item.available ? 'default' : 'secondary'}>
                              {item.available ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="sm">Edit</Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteMenuItem(item.id)}
                            disabled={loading}
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'statistics' && (
            <StatisticsCharts />
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <div className="space-y-4 animate-fade-in">
              {feedbackList.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-medium">No feedback yet</p>
                    <p className="text-muted-foreground">Customer feedback will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                feedbackList.map(feedback => (
                <Card key={feedback.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-mono text-sm text-muted-foreground">
                        Order #{feedback.orderId}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(feedback.submittedAt), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= feedback.overallExperience
                              ? 'text-warning fill-warning'
                              : 'text-muted'
                          }`}
                        />
                      ))}
                      <span className="ml-2 font-semibold">{feedback.overallExperience}/5</span>
                    </div>

                    {feedback.comment && (
                      <p className="text-muted-foreground italic">"{feedback.comment}"</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Food Quality</p>
                        <p className="font-semibold">{feedback.foodQuality}/5</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Service Speed</p>
                        <p className="font-semibold">{feedback.serviceSpeed}/5</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Accuracy</p>
                        <p className="font-semibold">{feedback.accuracy}/5</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Value</p>
                        <p className="font-semibold">{feedback.valueForMoney}/5</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
