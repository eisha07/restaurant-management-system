# 🍽️ Restaurant Management System - Quick Start Guide

## 📋 System Ready to Run!

Your restaurant management system is fully connected. The frontend is now integrated with the backend API, with real-time order updates for the manager dashboard.

## ⚡ Quick Start (Choose One)

### Option 1️⃣: Windows Users
**Just double-click this file:**
```
start-all.bat
```
Then open [http://localhost:5173](http://localhost:5173)

---

### Option 2️⃣: macOS/Linux Users
**Run this command:**
```bash
chmod +x start-all.sh
./start-all.sh
```
Then open [http://localhost:5173](http://localhost:5173)

---

### Option 3️⃣: All Platforms
**From project root:**
```bash
npm run start:all
```
Then open [http://localhost:5173](http://localhost:5173)

---

### Option 4️⃣: Manual (Development)
**Terminal 1 - Backend:**
```bash
cd restaurant-backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## 🎯 What's Connected?

### ✅ Customer Features
- 📋 **Menu Browser** - Live menu items from database
  - Uses: `menuApi.getAllItems()`
  - Endpoint: `GET /api/menu`

- 🛒 **Shopping Cart** - Add items and checkout
  - Uses: `orderApi.create()`
  - Endpoint: `POST /api/orders`

- 📍 **Order Tracking** - Real-time order status
  - Uses: Socket.IO `onOrderStatusUpdate()`
  - Updates in real-time as order progresses

- ⭐ **Feedback Form** - Rate completed orders
  - Uses: `feedbackApi.submit()`
  - Endpoint: `POST /api/feedback`

### ✅ Manager Features
- 📲 **Incoming Orders** - See new orders in REAL-TIME! ⭐
  - Uses: `managerApi.getPendingOrders()`
  - Real-time: Socket.IO `onNewOrder()`
  - **NEW ORDERS APPEAR AUTOMATICALLY!**

- ✅/❌ **Order Actions** - Approve or reject orders
  - Uses: `managerApi.approveOrder()` / `rejectOrder()`
  - Endpoints: `POST /api/manager/orders/:id/approve|reject`

- 📊 **Statistics Dashboard** - View real-time stats
  - Uses: `managerApi.getStatistics()`
  - Endpoint: `GET /api/manager/statistics`

### ✅ Kitchen Features
- 👨‍🍳 **Active Orders** - See orders to prepare
  - Uses: `kitchenApi.getActiveOrders()`
  - Real-time: Socket.IO `onKitchenOrderUpdate()`

- ✏️ **Update Status** - Mark items as ready
  - Uses: `kitchenApi.updateItemStatus()`
  - Endpoint: `PUT /api/kitchen/orders/:id/items/:itemId/status`

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| Frontend | [http://localhost:5173](http://localhost:5173) |
| Backend API | [http://localhost:5000/api](http://localhost:5000/api) |
| Health Check | [http://localhost:5000/api/health](http://localhost:5000/api/health) |
| Test Menu | [http://localhost:5000/api/menu](http://localhost:5000/api/menu) |

---

## 📂 Key Files Created

### API Services
```
frontend/src/services/
├── api.ts          ← REST API client with all endpoints
└── socket.ts       ← Real-time Socket.IO events
```

### Custom Hooks (Easy Reuse)
```
frontend/src/hooks/
├── useMenu.ts      ← Fetch menu items
└── useOrders.ts    ← Real-time order updates
```

### Components
```
frontend/src/components/
├── customer/MenuBrowser.tsx      ← Menu with live DB data
├── customer/CheckoutModal.tsx    ← Create orders
├── manager/OrdersDisplay.tsx     ← Real-time incoming orders ⭐
└── (Kitchen components in pages/)
```

---

## 🚀 First Test - Customer Journey

1. **Open [http://localhost:5173](http://localhost:5173)**
2. **Click "Customer"**
3. **See live menu items** (from database!)
4. **Add items to cart**
5. **Checkout** → Order is created
6. **Watch real-time updates** as order moves through system

---

## 🚀 Second Test - Manager Real-Time Orders

1. **In one browser: Open [http://localhost:5173/manager](http://localhost:5173/manager)**
2. **In another browser: Create an order as customer**
3. **Watch NEW ORDER appear instantly!** (No refresh needed)
4. **Click "Approve"** → Status updates
5. **Order moves through workflow**

---

## 🔧 Useful Commands

```bash
# Start everything (one command)
npm run start:all

# Start just backend
npm run backend

# Start just frontend
npm run frontend

# Install all dependencies
npm run install:all

# Verify setup
node verify-setup.js
```

---

## 🐛 Troubleshooting

### Menu not loading?
```bash
# Test the API directly
curl http://localhost:5000/api/menu
```

### Real-time orders not updating?
1. Check browser console for Socket.IO connection
2. Verify both frontend and backend are running
3. Check port 5000 is not blocked

### Port already in use?
```bash
# On Windows PowerShell:
Get-Process node | Stop-Process -Force

# On macOS/Linux:
pkill -f node
```

---

## 📖 Full Documentation

See **API_INTEGRATION_GUIDE.md** for:
- Complete API endpoint reference
- Architecture diagram
- Socket.IO real-time events explained
- Component-to-API mapping
- Example code snippets
- Environment setup

---

## 🎓 How It Works

### Traditional REST API Calls
```typescript
// Fetch menu items
const items = await menuApi.getAllItems();
// HTTP GET /api/menu
```

### Real-Time Socket.IO Updates
```typescript
// Subscribe to new orders
onNewOrder((order) => {
  console.log('New order arrived!', order);
});

// Backend automatically sends to all managers:
io.emit('new_order', orderData);
```

### Automatic UI Refresh
- Menu items render from database ✅
- New orders appear without page refresh ✅
- Order status updates live ✅
- No polling needed ✅

---

## ✨ Features Summary

| Feature | Status | Real-time |
|---------|--------|-----------|
| Browse Menu | ✅ From DB | No |
| Create Order | ✅ Instant | - |
| Track Order | ✅ Live | Yes ⭐ |
| Manager See Orders | ✅ Instant | Yes ⭐ |
| Approve/Reject | ✅ Works | - |
| Kitchen Display | ✅ Active | Yes ⭐ |
| Submit Feedback | ✅ Saves | - |
| Statistics | ✅ Real-time | Yes ⭐ |

---

## 💡 Pro Tips

1. **Open DevTools** (F12) → Network tab to see API calls
2. **Check Console** for real-time event logs
3. **Use multiple browsers** to test real-time features
4. **Check backend logs** if APIs fail
5. **Verify .env files** if database connection fails

---

## 🆘 Need Help?

1. Check **API_INTEGRATION_GUIDE.md** for detailed docs
2. Review **console errors** (F12)
3. Check **terminal output** for backend errors
4. Verify **database connection** with `http://localhost:5000/api/health`
5. Re-run `npm run install:all` if dependencies are missing

---

## 🎉 You're Ready!

Everything is connected and ready to use. Just run:

```bash
npm run start:all
```

Then open [http://localhost:5173](http://localhost:5173) and enjoy! 🚀

---

**Created:** December 2024
**Frontend:** React 18 + Vite + TypeScript
**Backend:** Express.js + Socket.IO + PostgreSQL
**Real-time:** Socket.IO ⚡
