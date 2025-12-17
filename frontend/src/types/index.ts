// Restaurant Management System Types

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  rating: number;
  available: boolean;
  preparationTime: number;
  spicyLevel?: 'none' | 'mild' | 'medium' | 'hot' | 'very_hot';
  tags?: string[];
}

export interface CartItem extends MenuItem {
  quantity: number;
  specialInstructions?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  kitchenStatus: KitchenStatus;
  paymentMethod: PaymentMethod;
  tableNumber?: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  expectedCompletion?: string;
  completedAt?: string;
  customerSessionId: string;
}

export interface OrderItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  status?: 'pending' | 'preparing' | 'ready';
}

export type OrderStatus = 
  | 'pending_approval' 
  | 'approved' 
  | 'in_progress' 
  | 'ready' 
  | 'completed' 
  | 'cancelled';

export type KitchenStatus = 
  | 'pending' 
  | 'preparing' 
  | 'ready';

export type PaymentMethod = 
  | 'cash' 
  | 'card' 
  | 'online';

export interface Feedback {
  id: number;
  orderId: number;
  foodQuality: number;
  serviceSpeed: number;
  overallExperience: number;
  accuracy: number;
  valueForMoney: number;
  comment?: string;
  submittedAt: string;
}

export interface Manager {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'manager' | 'admin';
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
}

export interface Statistics {
  totalOrders: number;
  todayOrders: number;
  revenue: number;
  todayRevenue: number;
  averageOrderValue: number;
  averageRating: number;
  topItems: { name: string; count: number }[];
}
