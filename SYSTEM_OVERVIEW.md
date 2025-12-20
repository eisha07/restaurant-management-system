# Restaurant Management System - Complete Architecture Overview

## 🏗️ System Architecture

This is a **full-stack monorepo application** consisting of:
- **Frontend**: React application with modern UI components (CRA or Vite-based)
- **Backend**: Express.js REST API with PostgreSQL database
- **Real-time Communication**: Socket.IO for live updates
- **Multi-role System**: Customer, Manager, and Kitchen staff interfaces

---

## 📊 High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER BROWSER (Port 3000)                 │
├─────────────────────────────────────────────────────────────────┤
│  React App (src/app.js)                                         │
│  ├─ Customer Interface (/customer/*)                            │
│  ├─ Manager Login (/manager/login)                              │
│  └─ Kitchen Display (/kitchen/display)                          │
│                                                                  │
│  Services (src/services/api.js)                                 │
│  └─ Axios HTTP Client (Base: /api)                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP Requests (Port 3000 → 5000)
                       │ Socket.IO Connection
┌──────────────────────▼──────────────────────────────────────────┐
│              EXPRESS SERVER (Port 5000)                          │
├─────────────────────────────────────────────────────────────────┤
│  server.js - Main Entry Point                                   │
│  ├─ CORS Configuration (origins: localhost:3000/3001/5173)      │
│  ├─ Socket.IO Setup (global.io)                                 │
│  └─ Route Mounting:                                             │
│     ├─ /api/menu → menuRoutes.js                                │
│     ├─ /api/orders → orderRoutes.js                             │
│     ├─ /api/feedback → feedbackRoutes.js                        │
│     ├─ /api/qr → qrRoutes.js                                    │
│     ├─ /api/auth → authRoutes.js                                │
│     ├─ /api/manager → managerDashboard.js                       │
│     ├─ /api/kitchen → kitchenRoutes.js                          │
│     └─ /api/db → databaseRoutes.js (admin only)                 │
│                                                                  │
│  Middleware:                                                     │
│  ├─ CORS Handler                                                │
│  ├─ JSON Parser                                                 │
│  ├─ Request Logging                                             │
│  └─ Error Handler                                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ SQL Queries
                       │ Mock Fallback on DB Failure
┌──────────────────────▼──────────────────────────────────────────┐
│         POSTGRESQL DATABASE (Port 5432)                          │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                         │
│  ├─ menu_items & menu_categories                                │
│  ├─ orders & order_items                                        │
│  ├─ customers & restaurant_tables                               │
│  ├─ feedback                                                     │
│  ├─ managers                                                     │
│  ├─ order_statuses & kitchen_statuses                           │
│  └─ payment_methods & payment_statuses                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Main Entry Points

### **Backend**
**File**: [restaurant-backend/server.js](restaurant-backend/server.js)

**Responsibilities**:
- Initialize Express server on port 5000
- Configure Socket.IO for real-time communication
- Set up CORS to allow frontend requests
- Mount all API route handlers
- Provide health check endpoints

**Key Endpoints**:
- `GET /` - API info and available endpoints
- `GET /api/health` - Server status and uptime
- `GET /api/test` - Simple API test
- `GET /api/menu/test` - Test menu endpoint

### **Frontend**
**File**: [src/app.js](src/app.js)

**Responsibilities**:
- Set up React Router with three main sections
- Provide Authentication Context to all components
- Route between customer, manager, and kitchen interfaces

**Route Structure**:
```
/ 
├─ /customer/* → CustomerApp (Menu, Orders, Feedback)
├─ /manager/login → Auth (Login page)
├─ /manager/dashboard → ManagerDashboard (Protected)
└─ /kitchen/display → KitchenDisplay (Live order updates)
```

---

## 📱 Frontend Layer (`src/`)

### **Component Structure**

#### **Authentication** (`src/components/auth/`)
- **Auth.js** - Manager login form
- **ProtectedRoute.js** - Route guard for authenticated manager endpoints

#### **Customer Interface** (`src/components/customer/`)
- Menu browsing with search/filter
- Shopping cart management
- Order checkout with payment methods
- Order status tracking
- Feedback submission

#### **Manager Dashboard** (`src/components/manager/`)
- View all orders and their status
- Approve/reject pending orders
- Monitor order progress
- View customer feedback
- Analytics dashboard

#### **Kitchen Display** (`src/components/kitchen/`)
- Real-time order list
- Update order status
- Prioritize urgent orders
- Live updates via Socket.IO

#### **Shared Components** (`src/components/shared/`)
- Reusable UI components
- Buttons, modals, headers, navigation

### **Context & State Management**

**File**: [src/contexts/AuthContext.js](src/contexts/AuthContext.js)

**Purpose**: Manage authentication state globally
- Stores manager token and profile
- Verifies token on app load
- Provides login/logout functions
- Used by `ProtectedRoute` to guard pages

```javascript
// Usage in components:
const { manager, token, login, logout, loading } = useAuth();
```

### **API Service Layer**

**File**: [src/services/api.js](src/services/api.js)

**Features**:
- Axios HTTP client configured with:
  - Base URL: `window.origin/api` (auto-proxies to backend)
  - Timeout: 10 seconds
  - Request/response logging
  
- **Offline Resilience**: If backend is down (ERR_NETWORK), returns mock data
  
- **Exported APIs**:
  ```javascript
  - orderApi.create(data)        // POST /api/orders
  - orderApi.getAll()            // GET /api/orders
  - orderApi.getById(id)         // GET /api/orders/:id
  - orderApi.updateStatus(...)   // PUT /api/orders/:id/status
  
  - menuApi.getAll()             // GET /api/menu
  - menuApi.getById(id)          // GET /api/menu/items/:id
  
  - feedbackApi.create(data)     // POST /api/feedback
  - feedbackApi.getAll()         // GET /api/feedback
  
  - qrApi.generate(data)         // POST /api/qr/generate
  
  - healthApi.check()            // GET /api/health
  ```

---

## 🖥️ Backend Layer (`restaurant-backend/`)

### **Database Configuration**

**File**: [restaurant-backend/config/database.js](restaurant-backend/config/database.js)

**Setup**:
- Uses Sequelize ORM with PostgreSQL
- Environment variables from `.env`:
  - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`
  - `JWT_SECRET`, `MANAGER_PASSWORD`
  
- Features:
  - Connection pooling (max 5 connections)
  - Query timeout: 5 seconds
  - SSL support for remote databases
  - SQL logging for debugging

### **API Routes**

#### 1. **Menu Routes** (`restaurant-backend/routes/menuRoutes.js`)

**Endpoints**:
- `GET /api/menu` - Get all menu items (with search support)
- `GET /api/menu/items/:id` - Get specific menu item
- `POST /api/menu` - Add new menu item (admin)
- `PUT /api/menu/:id` - Update menu item (admin)
- `DELETE /api/menu/:id` - Delete menu item (admin)
- `GET /api/menu/categories` - Get all categories

**Features**:
- Fallback to mock data if database is down
- Search filtering by name/description
- Category-based organization
- Stock availability tracking
- Rating system

**Resilience**:
- Database query timeout: 3 seconds
- On timeout → uses mockMenuItems array
- Prevents hanging requests

#### 2. **Order Routes** (`restaurant-backend/routes/orderRoutes.js`)

**Endpoints**:
- `GET /api/orders` - Get all orders (manager dashboard)
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/approve` - Manager approves order
- `PUT /api/orders/:id/reject` - Manager rejects order
- `PUT /api/orders/:id/complete` - Mark as completed

**Order Lifecycle**:
```
Created → Pending Approval → (Approved/Rejected)
         ↓
    In Progress (Kitchen)
         ↓
      Ready for Pickup
         ↓
      Completed
```

**Request Format** (POST):
```json
{
  "customerSessionId": "session_123",
  "paymentMethod": "cash",
  "items": [
    {
      "menuItemId": 1,
      "quantity": 2,
      "specialInstructions": "No onions"
    }
  ]
}
```

#### 3. **Authentication Routes** (`restaurant-backend/routes/authRoutes.js`)

**Endpoints**:
- `POST /api/auth/manager-login` - Simple password login (dev)
- `POST /api/auth/manager/login` - Database-backed login
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/refresh` - Refresh expired token

**Security**:
- JWT token generation (24-hour expiration)
- Token verification on protected routes
- Password hashing (bcrypt)
- Token stored in localStorage on client

#### 4. **Manager Dashboard Routes** (`restaurant-backend/routes/managerDashboard.js`)

**Endpoints**:
- `GET /api/manager/orders` - All orders with aggregations
- `GET /api/manager/dashboard/stats` - Dashboard metrics
- `GET /api/manager/orders/pending` - Orders needing approval
- `GET /api/manager/revenue` - Revenue analytics

#### 5. **Kitchen Routes** (`restaurant-backend/routes/kitchenRoutes.js`)

**Endpoints**:
- `GET /api/kitchen/orders` - Orders for kitchen staff
- `PUT /api/kitchen/orders/:id/status` - Update preparation status
- `POST /api/kitchen/socket` - Connect for real-time updates

**Socket Events** (via Socket.IO):
- `order:new` - New order received
- `order:updated` - Order status changed
- `order:completed` - Order ready for pickup

#### 6. **Feedback Routes** (`restaurant-backend/routes/feedbackRoutes.js`)

**Endpoints**:
- `GET /api/feedback` - Get all feedback (paginated)
- `POST /api/feedback` - Submit feedback
- `PUT /api/feedback/:id` - Update feedback (admin)
- `DELETE /api/feedback/:id` - Delete feedback (admin)

**Request Format**:
```json
{
  "orderId": 1,
  "rating": 5,
  "comment": "Excellent service!"
}
```

#### 7. **QR Code Routes** (`restaurant-backend/routes/qrRoutes.js`)

**Endpoints**:
- `POST /api/qr/generate` - Generate QR code data URL
- `GET /api/qr/menu/:tableId` - Get table-specific QR code

**Purpose**: Generate QR codes that link to:
- Customer ordering page
- Kitchen display
- Feedback collection

#### 8. **Database Admin Routes** (`restaurant-backend/routes/databaseRoutes.js`)

**Endpoints** (dev/admin only):
- `GET /api/db/test-db` - Test database connectivity
- `POST /api/db/reset` - Reset database (dev only)
- `GET /api/db/tables` - View database tables
- `POST /api/db/seed` - Seed test data

---

### **Authentication Middleware**

**File**: [restaurant-backend/middleware/auth.js](restaurant-backend/middleware/auth.js)

```javascript
const { authenticateManager } = require('../middleware/auth');

// Usage:
router.put('/api/orders/:id/approve', authenticateManager, (req, res) => {
  // Only authenticated managers can access
});
```

**Checks**:
- Verifies JWT token from Authorization header
- Decodes and validates token signature
- Attaches user data to `req.user`

---

## 🔌 Real-Time Communication (Socket.IO)

**Configured in**: [restaurant-backend/server.js](restaurant-backend/server.js#L12)

**Setup**:
```javascript
const io = socketIO(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  }
});
global.io = io; // Make accessible throughout backend
```

**Events**:

**Kitchen Events** (emitted by backend):
- `kitchen:order-new` - New order received
- `kitchen:order-status-update` - Order status changed
- `kitchen:order-complete` - Order ready

**Manager Events**:
- `manager:order-approved` - Manager approved an order
- `manager:feedback-new` - New customer feedback

**Customer Events**:
- `order:status-update` - Order status changed
- `order:ready` - Order ready for pickup

**Frontend Usage**:
```javascript
// src/services/socket.js
import io from 'socket.io-client';

const socket = io(window.location.origin, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});

socket.on('order:status-update', (data) => {
  console.log('Order updated:', data);
});
```

---

## 🗄️ Database Schema

**Key Tables**:

### Users & Access
```
managers
├─ manager_id (PK)
├─ username
├─ password_hash
├─ email
├─ full_name
└─ role

customers
├─ customer_id (PK)
└─ session_id
```

### Menu System
```
menu_categories
├─ category_id (PK)
└─ name (e.g., "Desi", "Fast Food")

menu_items
├─ item_id (PK)
├─ name
├─ description
├─ price
├─ image_url
├─ category_id (FK)
└─ is_available
```

### Orders
```
orders
├─ order_id (PK)
├─ order_number (e.g., "ORD-001234")
├─ customer_id (FK)
├─ table_id (FK)
├─ order_status_id (FK)
├─ payment_method_id (FK)
├─ payment_status_id (FK)
├─ kitchen_status_id (FK)
├─ total_amount
├─ created_at
├─ approved_at
└─ expected_completion

order_items
├─ order_item_id (PK)
├─ order_id (FK)
├─ menu_item_id (FK)
├─ quantity
└─ special_instructions

order_statuses (Lookup)
├─ pending_approval
├─ approved
├─ rejected
├─ in_progress
├─ ready
└─ completed
```

### Feedback
```
feedback
├─ feedback_id (PK)
├─ order_id (FK)
├─ rating (1-5)
├─ comment
└─ created_at
```

---

## 🚀 Development Workflow

### **Starting the System**

**Backend**:
```bash
cd restaurant-backend
npm install
npm run dev  # Starts on port 5000 with nodemon
```

**Frontend** (CRA):
```bash
npm install
npm start    # Starts on port 3000
```

**Frontend** (Vite):
```bash
cd frontend
npm install
npm run dev  # Starts on port 5173
```

**Proxy Configuration**:
- Root `package.json` has `"proxy": "http://localhost:5000"`
- Frontend `/api/*` requests automatically forward to backend

### **Environment Variables**

**.env** (in `restaurant-backend/`):
```env
PORT=5000
DB_HOST=localhost
DB_NAME=restaurant_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your_secret_key
MANAGER_PASSWORD=admin123
NODE_ENV=development
```

---

## 🔄 Example Request Flow

### **Customer Orders a Meal**

```
1. Customer opens app → /customer/menu
   └─ Frontend fetches: GET /api/menu

2. API Layer (src/services/api.js)
   └─ Creates Axios request to http://localhost:5000/api/menu

3. Backend (restaurant-backend/server.js)
   └─ Routes to /api/menu → menuRoutes.js

4. Menu Route Handler
   └─ Queries database OR uses mockMenuItems if DB down

5. Response to Frontend
   └─ JSON array of menu items with prices, images

6. Frontend renders Menu component with items

7. Customer adds items to cart & checks out

8. Frontend sends: POST /api/orders
   ├─ Request Body: { items: [...], paymentMethod: 'cash' }
   └─ OrderRoute Handler creates order in database

9. Order created with status: "pending_approval"

10. Manager Dashboard receives Socket.IO event: "order:new"
    └─ Manager approves the order

11. Kitchen receives Socket.IO event: "order:approved"
    ├─ Kitchen display updates
    └─ Chef updates status: "in_progress" → "ready"

12. Customer receives Socket.IO event: "order:status-update"
    └─ Frontend shows: "Order ready for pickup!"
```

---

## 🛡️ Error Handling & Resilience

### **Network Resilience**
- **Frontend API Client**: 10-second timeout
- **Backend DB Queries**: 3-5 second timeout
- **Mock Fallback**: If DB/network fails, use cached mockMenuItems
- **Graceful Degradation**: Show cached data instead of error

### **Database Resilience**
- Connection pooling prevents connection exhaustion
- Failed queries don't crash server
- Mock data serves as fallback
- Health check endpoint for monitoring

### **Request Timeouts**
- Prevents hanging requests from blocking threads
- Falls back to mock data in development
- Returns 500 error with descriptive message

---

## 📊 Key Architectural Patterns

### **Pattern 1: Monorepo Structure**
- Single GitHub repo with `/frontend` and `/restaurant-backend`
- Shared development setup
- Proxy in root `package.json` for easy local development

### **Pattern 2: API-First Design**
- Backend exposes REST JSON APIs
- Frontend consumes via Axios service layer
- Decoupled frontend/backend for flexibility

### **Pattern 3: Real-Time Updates**
- Socket.IO for live notifications
- Global `io` object in backend for broadcasting
- Frontend connects on mount, listens to events

### **Pattern 4: Defensive Programming**
- Every database query has fallback mock data
- Timeout protection on all external calls
- Try-catch blocks throughout

### **Pattern 5: Role-Based Access Control**
- JWT tokens for authentication
- Middleware checks role before allowing actions
- Public routes (menu, orders POST) have no auth
- Protected routes (approve, reject) require manager token

---

## 📈 Data Flow Diagrams

### **Login Flow**
```
Manager Browser
    ↓
Auth Component (/manager/login)
    ↓
POST /api/auth/manager-login {password}
    ↓
authRoutes.js validates password
    ↓
Generate JWT token
    ↓
Frontend stores in localStorage
    ↓
AuthContext updates state
    ↓
Redirect to /manager/dashboard
```

### **Order Update Flow**
```
Kitchen Staff clicks "Ready"
    ↓
PUT /api/kitchen/orders/:id/status {status: "ready"}
    ↓
kitchenRoutes.js updates database
    ↓
Emits Socket.IO event "order:status-update"
    ↓
Manager Dashboard receives update → refreshes
    ↓
Customer receives update → shows "Ready for pickup"
```

---

## 🧪 Testing

**Test Files**: `restaurant-backend/test/`
- `api.test.js` - API endpoint tests
- `auth-security.test.js` - Authentication tests
- `business.test.js` - Business logic tests
- `integration.test.js` - End-to-end tests

**Run Tests**:
```bash
cd restaurant-backend
npm test
```

---

## ⚠️ Important Gotchas

1. **Duplicate package.json**: Root and `src/` both have package.json. Use root for CRA scripts.

2. **DB Down Handling**: Don't worry if database is unreachable - mock data will serve instead.

3. **QR Code Module**: If `/api/qr/*` returns 501, install qrcode: `npm install qrcode`

4. **CORS Origins**: Backend only allows specific origins. Add new ones in `server.js` CORS config.

5. **Socket.IO Connection**: Frontend must connect on component mount, remember to clean up listeners.

6. **Token Expiration**: JWT tokens expire after 24 hours. Implement refresh endpoint for long sessions.

7. **Development Only Auth**: `manager-login` endpoint in dev mode just checks password, not database.

---

## 📞 Summary of Key Files

| File | Purpose | Key Functions |
|------|---------|---|
| [restaurant-backend/server.js](restaurant-backend/server.js) | Main backend entry point | Initialize Express, Socket.IO, routes |
| [src/app.js](src/app.js) | Main frontend entry point | React Router setup, Authentication |
| [src/services/api.js](src/services/api.js) | HTTP client | Axios config, API methods, mock fallback |
| [restaurant-backend/routes/menuRoutes.js](restaurant-backend/routes/menuRoutes.js) | Menu management | Get/create/update menu items |
| [restaurant-backend/routes/orderRoutes.js](restaurant-backend/routes/orderRoutes.js) | Order management | Create/read/update orders |
| [restaurant-backend/routes/authRoutes.js](restaurant-backend/routes/authRoutes.js) | Authentication | Manager login, token verification |
| [restaurant-backend/config/database.js](restaurant-backend/config/database.js) | Database setup | Sequelize config, connection pool |
| [src/contexts/AuthContext.js](src/contexts/AuthContext.js) | Auth state | Global auth state, login/logout |

---

This document provides a complete overview of how your restaurant management system works. Each component plays a specific role, and together they create a resilient, real-time ordering system.
