# 🚀 Restaurant Management System - Complete API Integration Guide

## Overview

This guide explains how the frontend and backend are connected through API calls and real-time Socket.IO updates for real-time order management.

---

## Quick Start

### Start Everything with One Command

**Option 1: Using npm (from project root)**
```bash
npm run start:all
```

**Option 2: Windows Batch File (double-click)**
```bash
start-all.bat
```

**Option 3: macOS/Linux Shell Script**
```bash
chmod +x start-all.sh
./start-all.sh
```

**Option 4: Node Script**
```bash
node start-all.js
```

### Access the Application

- 🌐 **Frontend**: [http://localhost:5173](http://localhost:5173)
- 📡 **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
- 💚 **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React + Vite)                   │
│                   Port 5173                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Components:                                                │
│  - MenuBrowser (Customer) → menuApi.getAllItems()          │
│  - ManagerOrdersDisplay (Manager) → managerApi.getPending()│
│  - CartModal (Customer) → orderApi.create()                │
│  - KitchenPage (Kitchen) → kitchenApi.getActiveOrders()   │
│                                                             │
│  Real-time Listeners:                                       │
│  - onNewOrder()                                             │
│  - onOrderStatusUpdate()                                    │
│  - onItemStatusUpdate()                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
              ↓ HTTP + WebSocket (Socket.IO) ↓
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Express.js)                       │
│                   Port 5000                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  API Routes:                                                │
│  - GET /api/menu → Returns menu items from DB              │
│  - POST /api/orders → Creates new order                    │
│  - GET /api/manager/orders/pending → Manager pending orders│
│  - GET /api/kitchen/orders/active → Kitchen active orders  │
│  - PUT /api/orders/:id/status → Update order status        │
│                                                             │
│  Real-time Events (Socket.IO):                              │
│  - new_order (to manager)                                  │
│  - order_status_updated (broadcast)                        │
│  - kitchen_order_updated (to kitchen)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## API Integration Map

### 🛒 Customer Features

#### 1. Browse Menu
**File**: [`frontend/src/components/customer/MenuBrowser.tsx`](frontend/src/components/customer/MenuBrowser.tsx)
**API Call**: `menuApi.getAllItems()`
**Endpoint**: `GET /api/menu`
**Hook**: [`frontend/src/hooks/useMenu.ts`](frontend/src/hooks/useMenu.ts)

```tsx
import { useMenu } from '@/hooks/useMenu';

export function MenuBrowser() {
  const { items, loading, error } = useMenu();
  // items contains all menu items from database
}
```

#### 2. Create Order
**File**: [`frontend/src/components/customer/CheckoutModal.tsx`](frontend/src/components/customer/CheckoutModal.tsx)
**API Call**: `orderApi.create(orderData)`
**Endpoint**: `POST /api/orders`

```typescript
const order = await orderApi.create({
  customerSessionId: sessionId,
  paymentMethod: 'credit_card',
  items: [
    { menuItemId: 1, quantity: 2, specialInstructions: 'No onions' }
  ]
});
```

#### 3. Track Order Status
**File**: [`frontend/src/components/customer/OrderStatusTracker.tsx`](frontend/src/components/customer/OrderStatusTracker.tsx)
**Real-time**: `onOrderStatusUpdate(callback)`
**Service**: [`frontend/src/services/socket.ts`](frontend/src/services/socket.ts)

```tsx
import { useOrderUpdates } from '@/hooks/useOrders';

export function OrderStatusTracker() {
  const { order } = useOrderUpdates(orderId);
  // order updates in real-time via Socket.IO
}
```

#### 4. Submit Feedback
**File**: [`frontend/src/components/customer/FeedbackForm.tsx`](frontend/src/components/customer/FeedbackForm.tsx)
**API Call**: `feedbackApi.submit(feedbackData)`
**Endpoint**: `POST /api/feedback`

---

### 👨‍💼 Manager Features

#### 1. View Incoming Orders (Real-time)
**File**: [`frontend/src/components/manager/OrdersDisplay.tsx`](frontend/src/components/manager/OrdersDisplay.tsx)
**API Call**: `managerApi.getPendingOrders()` (initial load)
**Real-time**: `onNewOrder()`, `onOrderStatusUpdate()`
**Endpoints**: 
- `GET /api/manager/orders/pending`
- WebSocket: `new_order`, `order_status_updated`

```tsx
import { useManagerOrders } from '@/hooks/useOrders';

export function ManagerOrdersDisplay() {
  const { orders } = useManagerOrders(initialOrders);
  // New orders appear automatically via Socket.IO
}
```

#### 2. Approve/Reject Orders
**API Calls**: 
- `managerApi.approveOrder(orderId)` → `POST /api/manager/orders/:id/approve`
- `managerApi.rejectOrder(orderId, reason)` → `POST /api/manager/orders/:id/reject`

```typescript
await managerApi.approveOrder(123);
// Order status updates broadcast via Socket.IO
```

#### 3. View Statistics
**File**: [`frontend/src/components/manager/StatisticsCharts.tsx`](frontend/src/components/manager/StatisticsCharts.tsx)
**API Call**: `managerApi.getStatistics()`
**Endpoint**: `GET /api/manager/statistics`

```typescript
const stats = await managerApi.getStatistics();
// { totalOrders, totalRevenue, averageOrderValue, pendingOrders }
```

---

### 👨‍🍳 Kitchen Features

#### 1. View Active Orders (Real-time)
**File**: [`frontend/src/pages/KitchenPage.tsx`](frontend/src/pages/KitchenPage.tsx)
**API Call**: `kitchenApi.getActiveOrders()` (initial load)
**Real-time**: `onKitchenOrderUpdate()`
**Endpoints**:
- `GET /api/kitchen/orders/active`
- WebSocket: `kitchen_order_updated`

```tsx
import { useKitchenOrders } from '@/hooks/useOrders';

export function KitchenPage() {
  const { orders } = useKitchenOrders(initialOrders);
  // Orders update in real-time as they progress
}
```

#### 2. Update Item Status
**API Call**: `kitchenApi.updateItemStatus(orderId, itemId, status)`
**Endpoint**: `PUT /api/kitchen/orders/:id/items/:itemId/status`

```typescript
await kitchenApi.updateItemStatus(123, 45, 'ready');
// Status: 'pending' | 'preparing' | 'ready'
```

#### 3. Mark Order Ready
**API Call**: `kitchenApi.markOrderReady(orderId)`
**Endpoint**: `PUT /api/kitchen/orders/:id/ready`

---

## File Structure

### API Services
```
frontend/src/services/
├── api.ts           # REST API client (axios) with all endpoints
│   ├── menuApi
│   ├── orderApi
│   ├── managerApi
│   ├── kitchenApi
│   ├── feedbackApi
│   ├── qrApi
│   └── healthApi
└── socket.ts        # Socket.IO real-time events
    ├── onNewOrder()
    ├── onOrderStatusUpdate()
    ├── onKitchenOrderUpdate()
    └── subscribeToManagerDashboard()
```

### Custom Hooks
```
frontend/src/hooks/
├── useMenu.ts       # Menu fetching and searching
│   ├── useMenu()
│   ├── useMenuByCategory()
│   └── useMenuSearch()
└── useOrders.ts     # Real-time order updates
    ├── useManagerOrders()
    ├── useKitchenOrders()
    └── useOrderUpdates()
```

### Components
```
frontend/src/components/
├── customer/
│   ├── MenuBrowser.tsx           # Uses useMenu()
│   ├── MenuCard.tsx              # Single menu item
│   ├── CartModal.tsx             # Uses orderApi.create()
│   ├── CheckoutModal.tsx
│   ├── OrderStatusTracker.tsx    # Uses useOrderUpdates()
│   └── FeedbackForm.tsx          # Uses feedbackApi.submit()
├── manager/
│   ├── OrdersDisplay.tsx         # Uses useManagerOrders() ⭐
│   └── StatisticsCharts.tsx      # Uses managerApi.getStatistics()
└── kitchen/
    └── (uses components from pages/KitchenPage.tsx)
```

---

## Environment Configuration

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=restaurant_db
DB_USER=postgres
DB_PASSWORD=your_password
NODE_ENV=development
PORT=5000
```

---

## Real-time Features Explained

### Socket.IO Events

#### From Backend to Frontend (Broadcasting)

**New Order Arrives**
```javascript
// Backend: When a new order is created
io.emit('new_order', orderData);

// Frontend: Listening in manager dashboard
onNewOrder((order) => {
  setOrders(prev => [order, ...prev]);
  showNotification('New order!');
});
```

**Order Status Updates**
```javascript
// Backend: When order status changes
io.emit('order_status_updated', updatedOrder);

// Frontend: All pages listening
onOrderStatusUpdate((order) => {
  updateOrderInUI(order);
});
```

**Kitchen Item Status**
```javascript
// Backend: When kitchen updates item status
io.emit('item_status_updated', { orderId, itemId, status });

// Frontend: Kitchen display listening
onItemStatusUpdate((data) => {
  updateItemInKitchenDisplay(data);
});
```

#### From Frontend to Backend (Subscriptions)

**Subscribe to Manager Dashboard**
```typescript
subscribeToManagerDashboard();
// Backend will emit new_order and order_status_updated events

// Clean up on unmount:
unsubscribeFromManagerDashboard();
```

**Subscribe to Kitchen Display**
```typescript
subscribeToKitchenDisplay();
// Backend will emit kitchen-related events

// Clean up on unmount:
unsubscribeFromKitchenDisplay();
```

---

## Example: Complete User Journey

### Customer Ordering Flow

```
1. Customer loads app
   └─> MenuBrowser component mounts
   └─> useMenu() hook triggers menuApi.getAllItems()
   └─> GET /api/menu fetches items from database
   └─> Items render in UI

2. Customer selects items and adds to cart
   └─> CartContext stores items

3. Customer clicks checkout
   └─> CheckoutModal appears
   └─> Customer fills payment info
   └─> orderApi.create() called
   └─> POST /api/orders sends to backend
   └─> Backend creates order in database
   └─> Backend emits 'new_order' event via Socket.IO

4. Manager sees new order
   └─> ManagerOrdersDisplay component listening
   └─> onNewOrder() callback triggered
   └─> New order added to list in real-time
   └─> Badge shows "1 new order"

5. Manager approves order
   └─> managerApi.approveOrder() called
   └─> PUT /api/manager/orders/:id/approve
   └─> Backend updates order status
   └─> Backend emits 'order_status_updated'

6. Kitchen sees order
   └─> KitchenPage listening to kitchen events
   └─> onKitchenOrderUpdate() triggered
   └─> Order appears in kitchen display
   └─> Chef marks items as ready

7. Customer tracks order
   └─> OrderStatusTracker component mounted
   └─> useOrderUpdates() subscribes
   └─> Real-time updates from Socket.IO
   └─> Status changes as kitchen prepares
   └─> "Ready" notification when complete

8. Order completed
   └─> Customer submits feedback
   └─> feedbackApi.submit() called
   └─> POST /api/feedback
   └─> Feedback stored in database
```

---

## Troubleshooting

### Issue: "Backend connection failed"
**Solution**: 
1. Check backend is running: `npm run backend`
2. Verify port 5000 is not in use
3. Check `.env` file in `restaurant-backend/`

### Issue: "Menu not loading"
**Solution**:
1. Verify database connection
2. Check `GET /api/menu` in browser: [http://localhost:5000/api/menu](http://localhost:5000/api/menu)
3. Check `useMenu()` hook error handling

### Issue: "Real-time updates not working"
**Solution**:
1. Verify Socket.IO is connected: Check browser console
2. Check CORS settings in backend `server.js`
3. Ensure both frontend and backend can reach each other

### Issue: "Ports already in use"
**Solution**:
```bash
# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9

# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9

# On Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

## API Endpoint Summary

### Menu API
- `GET /api/menu` - Get all menu items
- `GET /api/menu/items/:id` - Get specific item
- `GET /api/menu/category/:category` - Get items by category
- `GET /api/menu/search?q=query` - Search items

### Order API
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/cancel` - Cancel order

### Manager API
- `GET /api/manager/orders/pending` - Get pending orders
- `GET /api/manager/orders` - Get all orders with filters
- `POST /api/manager/orders/:id/approve` - Approve order
- `POST /api/manager/orders/:id/reject` - Reject order
- `GET /api/manager/statistics` - Get dashboard stats

### Kitchen API
- `GET /api/kitchen/orders/active` - Get active orders
- `PUT /api/kitchen/orders/:id/items/:itemId/status` - Update item status
- `PUT /api/kitchen/orders/:id/ready` - Mark order ready
- `GET /api/kitchen/statistics` - Get kitchen stats

### Feedback API
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback` - Get all feedback (paginated)
- `GET /api/feedback/average` - Get average rating

---

## Next Steps

1. ✅ Install dependencies: `npm run install:all`
2. ✅ Start all services: `npm run start:all`
3. ✅ Test menu loading in customer view
4. ✅ Test order creation and real-time updates
5. ✅ Test manager notifications
6. ✅ Test kitchen display updates

For questions or issues, check the backend logs and browser console for error messages.
