const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let managerToken = 'test-token';

const log = {
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  test: (msg) => console.log(`\n🧪 ${msg}`),
  data: (data) => console.log(JSON.stringify(data, null, 2)),
  info: (msg) => console.log(`ℹ️  ${msg}`),
};

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

async function test(name, fn) {
  try {
    log.test(name);
    await fn();
    log.success(`${name} - PASSED`);
    return true;
  } catch (err) {
    log.error(`${name} - FAILED`);
    log.error(`Error: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

async function runTests() {
  let passed = 0, failed = 0;

  // Test 1: Authentication
  if (await test('TEST 1: Manager Login/Authentication', async () => {
    const response = await client.post('/auth/manager/login', {
      email: 'manager1@restaurant.com',
      password: 'password123',
    });
    managerToken = response.data.token;
    if (!response.data.token) throw new Error('No token received');
    log.info(`Token: ${response.data.token.substring(0, 20)}...`);
  })) passed++; else failed++;

  // Set token for remaining tests
  client.defaults.headers.common['Authorization'] = `Bearer ${managerToken}`;

  // Test 2: Get Menu Items
  if (await test('TEST 2: Get Menu Items', async () => {
    const response = await client.get('/manager/menu');
    if (!Array.isArray(response.data.items)) throw new Error('Not an array');
    log.info(`Found ${response.data.items.length} menu items`);
    if (response.data.items.length > 0) {
      log.data(response.data.items[0]);
    }
  })) passed++; else failed++;

  // Test 3: Add Menu Item
  let addedItemId = null;
  if (await test('TEST 3: Add Menu Item', async () => {
    const response = await client.post('/manager/menu', {
      name: 'Test Dish ' + Date.now(),
      description: 'Test Description',
      price: 299.99,
      category_id: 1,
      preparation_time_min: 15,
      is_available: true,
    });
    addedItemId = response.data.item_id || response.data.id;
    if (!addedItemId) throw new Error('No item ID returned');
    log.info(`Created item: ${addedItemId}`);
  })) passed++; else failed++;

  // Test 4: Edit Menu Item
  if (addedItemId && await test('TEST 4: Edit Menu Item', async () => {
    const response = await client.put(`/manager/menu/${addedItemId}`, {
      name: 'Updated Test Dish ' + Date.now(),
      price: 349.99,
      is_available: false,
    });
    log.info(`Updated item: ${addedItemId}`);
  })) passed++; else failed++;

  // Test 5: Delete Menu Item
  if (addedItemId && await test('TEST 5: Delete Menu Item', async () => {
    const response = await client.delete(`/manager/menu/${addedItemId}`);
    log.info(`Deleted item: ${addedItemId}`);
  })) passed++; else failed++;

  // Test 6: Get Pending Orders
  if (await test('TEST 6: Get Pending Orders', async () => {
    const response = await client.get('/manager/orders/pending');
    if (!Array.isArray(response.data.orders)) throw new Error('Not an array');
    log.info(`Found ${response.data.orders.length} pending orders`);
    if (response.data.orders.length > 0) {
      log.data(response.data.orders[0]);
    }
  })) passed++; else failed++;

  // Test 7: Get All Orders
  if (await test('TEST 7: Get All Orders', async () => {
    const response = await client.get('/manager/orders/all');
    if (!Array.isArray(response.data.orders)) throw new Error('Not an array');
    log.info(`Found ${response.data.orders.length} total orders`);
  })) passed++; else failed++;

  // Test 8: Get Statistics
  if (await test('TEST 8: Get Dashboard Statistics', async () => {
    const response = await client.get('/manager/statistics');
    log.data(response.data);
  })) passed++; else failed++;

  // Test 9: Get Feedback
  if (await test('TEST 9: Get Customer Feedback', async () => {
    const response = await client.get('/manager/feedback');
    if (!Array.isArray(response.data.feedback)) throw new Error('Not an array');
    log.info(`Found ${response.data.feedback.length} feedback entries`);
  })) passed++; else failed++;

  // Test 10: Get Tables
  if (await test('TEST 10: Get Restaurant Tables', async () => {
    const response = await client.get('/manager/tables');
    if (!Array.isArray(response.data.tables)) throw new Error('Not an array');
    log.info(`Found ${response.data.tables.length} tables`);
  })) passed++; else failed++;

  // Test 11: Approve Order (if pending exists)
  if (await test('TEST 11: Approve Order', async () => {
    const ordersRes = await client.get('/manager/orders/pending');
    if (ordersRes.data.orders.length === 0) throw new Error('No pending orders');
    const orderId = ordersRes.data.orders[0].id;
    const response = await client.put(`/manager/orders/${orderId}/approve`, {
      expectedCompletion: 25,
    });
    log.info(`Approved order: ${orderId}`);
  })) passed++; else failed++;

  // Test 12: Reject Order (if pending exists)
  if (await test('TEST 12: Reject Order', async () => {
    const ordersRes = await client.get('/manager/orders/pending');
    if (ordersRes.data.orders.length === 0) throw new Error('No pending orders to reject');
    const orderId = ordersRes.data.orders[0].id;
    const response = await client.put(`/manager/orders/${orderId}/reject`, {
      reason: 'Test rejection',
    });
    log.info(`Rejected order: ${orderId}`);
  })) passed++; else failed++;

  // Test 13: Get Ratings
  if (await test('TEST 13: Get Average Ratings', async () => {
    const response = await client.get('/manager/feedback/ratings');
    log.data(response.data);
  })) passed++; else failed++;

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`📊 TEST SUMMARY`);
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log('='.repeat(60) + '\n');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Manager Dashboard is working!');
  } else {
    console.log(`⚠️  ${failed} tests failed. Check the errors above.`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

console.log('🚀 Starting Manager Dashboard Tests...\n');
runTests().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
