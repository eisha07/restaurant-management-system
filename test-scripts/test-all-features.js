// Comprehensive System Test Script
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = '';
let orderId = 0;

async function runTests() {
  console.log('=== RESTAURANT SYSTEM COMPREHENSIVE TEST ===\n');

  try {
    // TEST 1: Manager Login
    console.log('TEST 1: Manager Login');
    const loginResp = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'manager',
      password: 'admin123'
    });
    token = loginResp.data.token;
    console.log('✅ Login successful:', loginResp.data.manager.username);

    // TEST 2: Edit Menu Item
    console.log('\nTEST 2: Edit Menu Item');
    const editResp = await axios.put(`${BASE_URL}/manager/menu/1`, {
      name: 'Burger UPDATED',
      price: 25.99,
      description: 'Updated via automated test'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Edit successful:', editResp.status);

    // TEST 3: Get Menu Items
    console.log('\nTEST 3: Get Menu Items');
    const menuResp = await axios.get(`${BASE_URL}/menu`);
    console.log('✅ Menu loaded:', menuResp.data.length, 'items');
    console.log('   First item:', menuResp.data[0].name, '-', menuResp.data[0].price);

    // TEST 4: Create Customer Order
    console.log('\nTEST 4: Create Customer Order');
    const orderResp = await axios.post(`${BASE_URL}/orders`, {
      tableNumber: 5,
      customerSessionId: 'test-' + Date.now(),
      paymentMethod: 'cash',
      items: [
        { menuItemId: 1, quantity: 2, specialInstructions: 'Extra cheese' },
        { menuItemId: 2, quantity: 1 }
      ]
    });
    orderId = orderResp.data.id; // Changed from orderId to id
    console.log('✅ Order created: ID', orderId);

    // TEST 5: Get Pending Orders
    console.log('\nTEST 5: Manager - View Pending Orders');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const pendingResp = await axios.get(`${BASE_URL}/manager/orders/pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Pending orders:', pendingResp.data.length);

    // TEST 6: Approve Order
    console.log('\nTEST 6: Manager - Approve Order');
    const approveResp = await axios.put(`${BASE_URL}/manager/orders/${orderId}/approve`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Order approved:', approveResp.status);

    // TEST 7: Check Kitchen Orders
    console.log('\nTEST 7: Kitchen - View Active Orders');
    const kitchenResp = await axios.get(`${BASE_URL}/kitchen/orders/active`);
    console.log('✅ Kitchen orders:', kitchenResp.data.length || kitchenResp.data.data?.length || 0);

    // TEST 8: Reject an Order
    console.log('\nTEST 8: Manager - Reject Order');
    // Create another order first
    const orderResp2 = await axios.post(`${BASE_URL}/orders`, {
      tableNumber: 6,
      customerSessionId: 'test-reject-' + Date.now(),
      paymentMethod: 'card',
      items: [{ menuItemId: 4, quantity: 1 }]
    });
    const rejectOrderId = orderResp2.data.id; // Changed from orderId to id
    
    const rejectResp = await axios.put(`${BASE_URL}/manager/orders/${rejectOrderId}/reject`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Order rejected:', rejectResp.status);

    // TEST 9: Update Order Status (Kitchen)
    console.log('\nTEST 9: Kitchen - Update Order to Preparing');
    const prepareResp = await axios.put(`${BASE_URL}/kitchen/orders/${orderId}/status`, {
      status_code: 'preparing'
    });
    console.log('✅ Order status updated:', prepareResp.status);

    // TEST 10: Complete Order
    console.log('\nTEST 10: Kitchen - Complete Order');
    const completeResp = await axios.put(`${BASE_URL}/kitchen/orders/${orderId}/status`, {
      status_code: 'ready'
    });
    console.log('✅ Order completed:', completeResp.status);

    console.log('\n=== ALL TESTS PASSED ✅ ===');
    console.log('\nSummary:');
    console.log('- Manager login: WORKING');
    console.log('- Edit menu items: WORKING');
    console.log('- Create orders: WORKING');
    console.log('- Approve orders: WORKING');
    console.log('- Reject orders: WORKING');
    console.log('- Kitchen operations: WORKING');
    console.log('- Real-time updates: Check browser for Socket.IO events');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
    process.exit(1);
  }
}

runTests();
