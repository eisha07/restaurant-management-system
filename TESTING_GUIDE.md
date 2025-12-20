# Testing Real-time Updates & Cart Persistence

## Quick Test Guide

### Setup
- Backend: http://localhost:5000/api (Node running on port 5000)
- Frontend: http://localhost:8080 (Vite running on port 8080)
- Database: Connected and synced

### Test 1: Real-time Manager Updates (Order Creation)

**Steps:**
1. Open http://localhost:8080 in one window (→ Click "Manager")
2. Open http://localhost:8080 in second window (→ Click "Customer")
3. In Customer window: Browse menu and add items to cart
4. In Customer window: Click "Proceed to Checkout" and submit order
5. **Watch Manager window** - New order should appear in pending orders list **immediately**

**Expected Behavior:**
- ✅ Order appears in manager dashboard without refreshing
- ✅ New order shows correct items, total, and status
- ✅ Real-time update happens within 1-2 seconds

**Socket.IO Events Verified:**
- Backend emits `new-order` to managers room
- Backend emits `pending-orders-updated` to trigger list refresh

---

### Test 2: Real-time Manager Updates (Order Approval/Rejection)

**Steps:**
1. Keep manager and customer windows open
2. In Manager window: Click order and select "Approve" (or "Reject")
3. **Watch Customer window** - Status should update **immediately**

**Expected Behavior:**
- ✅ Manager sees order removed from "Pending" list
- ✅ Customer sees order status change to "Approved" (or "Rejected")
- ✅ Updates happen in real-time without polling

**Socket.IO Events Verified:**
- Backend emits `order-approved`/`order-rejected` to customer
- Backend emits `pending-orders-updated` to managers

---

### Test 3: Cart Persistence After Close

**Steps:**
1. In Customer window: Browse menu and add items to cart
2. View cart (items should appear)
3. Click the "X" button to close the cart modal
4. **Wait** 2-3 seconds
5. Click on Cart/Orders icon again
6. **Verify** - Cart still shows the same items and total

**Expected Behavior:**
- ✅ Cart data persists in localStorage
- ✅ Order data retrieves from backend by session ID
- ✅ All items and totals match original order
- ✅ Works even after page refresh

**Fallback Behavior:**
- If closed and reopened within same session: Loads from localStorage
- If page refreshed: Loads from backend using session ID
- Customer session ID: Stored in localStorage and persists across refreshes

---

### Test 4: Full End-to-End Flow

**Complete Flow:**
1. Customer creates order → Manager sees it immediately ✅
2. Manager approves order → Customer sees status change ✅
3. Kitchen sees approved order → Updates status
4. Customer sees order moving through stages ✅
5. Customer closes cart → Reopens and sees same order ✅

---

## Troubleshooting

### Manager not seeing new orders?
- ✅ Check: Manager joined 'managers' room (join-manager emitted on load)
- ✅ Verify: Backend logs show "Broadcasting new order to managers"
- ✅ Check: Socket.IO connection is established (browser dev tools → Network → WS)

### Cart disappears after close?
- ✅ Check: Browser localStorage has session ID
- ✅ Verify: Order response includes all fields (id, items, total_amount)
- ✅ Check: Customer session ID is being stored properly

### Approval/Rejection takes time to reflect?
- ✅ Check: Socket.IO listener is active (dev console should show events)
- ✅ Verify: PATCH endpoint is being called (not PUT)
- ✅ Check: Manager room event listeners are registered

---

## Browser Console Commands (for debugging)

```javascript
// Check Socket.IO connection
console.log(io);  // Should show connected socket

// Check localStorage
localStorage.getItem('session_id');        // Should return session ID
localStorage.getItem('authToken');         // For manager auth

// Check recent API calls
// (View in Network tab of Dev Tools)
```

---

## Success Criteria - All Tests Passed ✅

- [ ] New orders appear in manager dashboard in real-time
- [ ] Manager actions (approve/reject) trigger customer updates
- [ ] Cart persists after closing modal
- [ ] Cart shows same items after page refresh
- [ ] All Socket.IO events fire correctly
- [ ] No console errors related to Socket.IO or API calls
- [ ] Database queries complete successfully
- [ ] Response times are acceptable (<1s for most operations)
