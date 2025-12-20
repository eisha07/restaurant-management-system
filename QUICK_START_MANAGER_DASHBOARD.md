# 🚀 Manager Dashboard - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Start Backend
```bash
cd restaurant-backend
npm run dev
```
**Expected**: Server runs on port 5000

### Step 2: Start Frontend  
```bash
cd ..
npm start
```
**Expected**: Frontend runs on port 3000

### Step 3: Login as Manager
- URL: `http://localhost:3000/manager/login`
- Username: `manager1`
- Password: (from auth system)

### Step 4: Test Dashboard
- ✅ Click "Pending Orders" → Should load orders
- ✅ Select an order → Click "Approve" → Order moves to "All Orders"
- ✅ View "Statistics" → Should show today's metrics
- ✅ Click "Feedback" → Should show customer ratings

---

## 🔧 How Each Function Works

### When Manager Clicks "Approve Order"

```
Click "Approve" Button
    ↓
Calls: onApprove(orderId, expectedCompletion)
    ↓
API Call: PUT /api/manager/orders/1/approve
Body: { expectedCompletion: 25 }
    ↓
Backend Query:
UPDATE orders SET 
  order_status_id = (SELECT status_id FROM order_statuses WHERE code='approved'),
  kitchen_status_id = (SELECT status_id FROM kitchen_statuses WHERE code='in_progress'),
  approved_at = NOW(),
  expected_completion = NOW() + 25 minutes
WHERE order_id = 1
    ↓
Frontend Updates:
- Order removed from "Pending" tab
- Order added to "All Orders" tab
- Details panel closes
- Success message shown
```

### When Manager Adds Menu Item

```
Fill Form:
- Name: "Paneer Butter Masala"
- Price: 380.00
- Category: "Curries"
- Prep Time: 20
Click "Save"
    ↓
API Call: POST /api/manager/menu
Body: { name, price, category_id, prep_time, ... }
    ↓
Backend Query:
INSERT INTO menu_items (name, price, category_id, ...) 
VALUES ('Paneer Butter Masala', 380.00, 2, ...)
RETURNING item_id
    ↓
Frontend Updates:
- Menu reloads
- New item appears in category
- Form clears
- Success message shown
```

---

## 📊 Key API Endpoints

| Method | Endpoint | Purpose | Parameters |
|--------|----------|---------|------------|
| GET | `/api/manager/orders/pending` | Load pending orders | None |
| GET | `/api/manager/orders/all` | Load all active orders | None |
| PUT | `/api/manager/orders/:id/approve` | Approve order | `{ expectedCompletion: 25 }` |
| PUT | `/api/manager/orders/:id/reject` | Reject order | `{ reason: "string" }` |
| GET | `/api/manager/statistics` | Get stats | None |
| GET | `/api/manager/menu` | Get menu items | None |
| POST | `/api/manager/menu` | Add menu item | `{ name, price, category_id, ... }` |
| PUT | `/api/manager/menu/:id` | Update menu item | `{ name, price, ... }` |
| DELETE | `/api/manager/menu/:id` | Delete menu item | None |
| GET | `/api/manager/feedback` | Get all feedback | None |
| GET | `/api/manager/tables` | Get all tables | None |
| PUT | `/api/manager/tables/:id/availability` | Toggle table | `{ is_available: boolean }` |

---

## 🗄️ Database Schema Quick Reference

```
ORDERS TABLE (main transaction table)
├─ order_id (PK)
├─ order_number (unique)
├─ customer_id (FK → customers)
├─ table_id (FK → restaurant_tables)
├─ order_status_id (FK → order_statuses)
├─ kitchen_status_id (FK → kitchen_statuses)
├─ payment_status_id (FK → payment_statuses)
├─ special_instructions (text)
├─ approved_at, expected_completion, completed_at (timestamps)
└─ created_at, updated_at

ORDER_ITEMS TABLE (line items)
├─ order_item_id (PK)
├─ order_id (FK → orders) [CASCADE DELETE]
├─ menu_item_id (FK → menu_items)
├─ item_name, item_price, quantity
├─ special_instructions
└─ item_status

MENU_ITEMS TABLE (catalog)
├─ item_id (PK)
├─ category_id (FK → menu_categories)
├─ name, description, price
├─ is_available, is_featured
├─ preparation_time_min, spicy_level, calories
└─ dietary_tags

[Plus 12 other tables for statuses, categories, feedback, etc.]
```

---

## 🔍 Debugging Tips

### Issue: "404 Order not found"
```
Check:
1. Order ID is integer
2. Order exists: SELECT * FROM orders WHERE order_id = 1
3. Status code exists: SELECT * FROM order_statuses WHERE code = 'pending'
```

### Issue: "Slow queries"
```
Fix:
1. Check indexes created: \d restaurant_backend/db/schema-3nf.sql
2. Verify JOINs use foreign keys
3. Run: EXPLAIN ANALYZE [query]
```

### Issue: "Token expired"
```
Solution:
1. Logout and login again
2. New token stored in localStorage['manager_token']
3. Included in all API calls automatically
```

### Issue: "Socket.IO not updating"
```
Check:
1. Server has: global.io = io
2. Connection open: Check browser Network tab
3. Listeners registered: Check console for 'listening on' messages
```

---

## 📋 File Locations

```
Frontend Components:
src/components/manager/
├─ ManagerDashboard.jsx (main container)
├─ OrdersPanel.jsx (order approval/rejection)
├─ MenuManager.jsx (menu CRUD)
├─ Statistics.jsx (dashboard metrics)
├─ FeedbackView.jsx (ratings display)
└─ Sidebar.jsx (navigation)

Backend Routes:
restaurant-backend/routes/
├─ managerDashboard.js (original)
├─ managerDashboardV2.js (NEW - complete integration)
├─ authRoutes.js (login/token)
└─ ... (other routes)

Database:
restaurant-backend/db/
├─ schema-3nf.sql (tables, views, indexes)
├─ seed-data-3nf.sql (sample data)
├─ database-helpers.js (query functions)
└─ db-setup-script.js (automated setup)

Configuration:
src/services/api.js (API service with managerApi object)
restaurant-backend/config/database.js (DB connection)
```

---

## ✅ Verification Checklist

Run this to verify everything works:

```bash
# 1. Check backend is running
curl http://localhost:5000/api/health

# 2. Check frontend is running
curl http://localhost:3000

# 3. Test pending orders endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/manager/orders/pending

# 4. Check database connection
npm run db:test  # in restaurant-backend

# 5. Verify schema exists
psql -d restaurant_db -c "\dt"  # shows all tables
```

---

## 🎮 Manual Testing Flow

### Test 1: Order Approval
```
1. Go to http://localhost:3000/manager
2. Login with credentials
3. Click "Pending Orders" tab
4. Select any pending order
5. Enter "25" for completion time
6. Click "Approve Order"
7. ✅ Order should move to "All Orders" tab
8. ✅ Status should change to "Approved"
9. ✅ Kitchen should receive notification
```

### Test 2: Menu Management
```
1. Click "Menu Management"
2. Click "Add New Item"
3. Fill form:
   - Name: Test Dish
   - Price: 100
   - Category: Appetizers
   - Prep Time: 15
4. Click "Save"
5. ✅ Item appears in menu
6. ✅ Can edit or delete item
```

### Test 3: Statistics
```
1. Go to dashboard home
2. ✅ Statistics cards should show:
   - Total Orders (> 0 if data exists)
   - Total Revenue (> 0)
   - Pending Orders count
   - Completed Orders count
```

---

## 🔐 Authentication Flow

```
Manager enters credentials
    ↓
POST /api/auth/login
    ↓
Backend validates against managers table
    ↓
Returns: { token: "eyJhbGc..." }
    ↓
Frontend stores: localStorage['manager_token'] = token
    ↓
All subsequent requests include:
Headers: { Authorization: `Bearer ${token}` }
    ↓
Backend validates token before processing request
    ↓
401 Unauthorized if token invalid/expired
```

---

## 🚀 Deployment Checklist

Before going to production:

- [ ] Update `process.env.NODE_ENV = 'production'`
- [ ] Set strong database password in `.env`
- [ ] Configure CORS for production domain
- [ ] Enable HTTPS/SSL
- [ ] Set JWT_SECRET to strong value
- [ ] Configure email notifications
- [ ] Setup database backups
- [ ] Monitor error logs
- [ ] Test with production data volume
- [ ] Verify all endpoints working
- [ ] Check socket.io connections stable

---

## 📞 Common Questions

**Q: Can I modify an order status directly?**
A: Yes, use `PUT /api/manager/orders/:id/status` with the status code.

**Q: What happens if I delete a menu item used in orders?**
A: Backend prevents deletion and shows error "Cannot delete item used in existing orders."

**Q: How are order totals calculated?**
A: Sum of (order_items.item_price × quantity) for each item in the order.

**Q: Can multiple managers modify the same order?**
A: Yes, last update wins. Consider adding optimistic locking if needed.

**Q: Are all queries parameterized to prevent SQL injection?**
A: Yes, all queries use parameterized statements with `?` placeholders.

---

## 📚 Additional Resources

- **Full API Documentation**: See `MANAGER_INTEGRATION_COMPLETE.md`
- **Function Execution Flow**: See `MANAGER_FUNCTION_EXECUTION_REFERENCE.js`
- **Validation Checklist**: See `MANAGER_VALIDATION_CHECKLIST.md`
- **Database Schema**: See `restaurant-backend/db/SCHEMA_INSTALLATION_GUIDE.md`

---

## ✨ Features Summary

| Feature | Status |
|---------|--------|
| View Pending Orders | ✅ |
| Approve Orders | ✅ |
| Reject Orders | ✅ |
| View All Orders | ✅ |
| Update Order Status | ✅ |
| Dashboard Statistics | ✅ |
| Menu Item CRUD | ✅ |
| Customer Feedback | ✅ |
| Average Ratings | ✅ |
| Table Management | ✅ |
| Real-time Updates | ✅ |
| Authentication | ✅ |
| Error Handling | ✅ |
| Database Integration | ✅ |

---

**Status**: 🟢 Ready to Use

**Last Updated**: December 18, 2025

**Integration**: Complete ✅

