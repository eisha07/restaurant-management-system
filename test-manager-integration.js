#!/usr/bin/env node
/**
 * Manager Dashboard - Integration Tests
 * Tests: Auth, Menu CRUD, Orders (approve/reject), Statistics, Feedback
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

let managerToken = null;
let results = [];

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.green}\x1b[0m`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}\x1b[0m`),
  test: (msg) => console.log(`\n${colors.blue}🧪 ${msg}\x1b[0m`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}\x1b[0m`),
};

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  validateStatus: () => true, // Accept all status codes
});

async function test(name, fn) {
  try {
    log.test(name);
    await fn();
    log.success(`${name} ✓`);
    results.push({ name, passed: true });
    return true;
  } catch (err) {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message;
    log.error(`${name} ✗`);
    log.error(`  Error: ${msg}`);
    if (err.response) {
      log.error(`  Status: ${err.response.status}`);
      log.error(`  Response: ${JSON.stringify(err.response.data)}`);
    }
    results.push({ name, passed: false });
    return false;
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  MANAGER DASHBOARD INTEGRATION TESTS   ║');
  console.log('╚════════════════════════════════════════╝\n');

  // TEST 1: Authentication
  await test('1. Manager Authentication', async () => {
    try {
      const response = await client.post('/auth/manager-login', {
        password: 'admin123',
      });
      console.log('Response:', response.status, response.data);
      if (response.status !== 200) {
        throw new Error(`Auth failed: ${response.status} - ${JSON.stringify(response.data)}`);
      }
      managerToken = response.data.token;
      if (!managerToken) throw new Error('No token received');
      client.defaults.headers.common['Authorization'] = `Bearer ${managerToken}`;
      log.info(`Token: ${managerToken.substring(0, 20)}...`);
    } catch (err) {
      console.error('Auth error details:', err);
      throw err;
    }
  });

  if (!managerToken) {
    log.error('\n❌ Cannot proceed - Authentication failed');
    process.exit(1);
  }

  // TEST 2: Get Menu Items
  await test('2. Get Menu Items', async () => {
    const response = await client.get('/menu');
    const items = response.data;
    if (!Array.isArray(items)) throw new Error('Not an array');
    log.info(`Found ${items.length} items`);
  });

  // TEST 3: Add Menu Item
  let itemId = null;
  await test('3. Add Menu Item', async () => {
    const response = await client.post('/manager/menu', {
      name: `Test Paneer ${Date.now()}`,
      description: 'Test item',
      price: 450,
      category_id: 1,
      preparation_time_min: 20,
      is_available: true,
    });
    itemId = response.data.item_id || response.data.id;
    if (!itemId) throw new Error('No item ID');
    log.info(`Created item ID: ${itemId}`);
  });

  // TEST 4: Update Menu Item
  if (itemId) {
    await test('4. Update Menu Item', async () => {
      await client.put(`/manager/menu/${itemId}`, {
        name: `Updated ${Date.now()}`,
        price: 500,
      });
      log.info(`Updated item ID: ${itemId}`);
    });
  }

  // TEST 5: Delete Menu Item
  if (itemId) {
    await test('5. Delete Menu Item', async () => {
      await client.delete(`/manager/menu/${itemId}`);
      log.info(`Deleted item ID: ${itemId}`);
    });
  }

  // TEST 6: Get Pending Orders
  let orders = [];
  await test('6. Get Pending Orders', async () => {
    const response = await client.get('/manager/orders/pending');
    orders = response.data.orders || response.data;
    if (!Array.isArray(orders)) throw new Error('Not an array');
    log.info(`Found ${orders.length} pending orders`);
  });

  // TEST 7: Approve Order
  if (orders.length > 0) {
    await test('7. Approve Order', async () => {
      const orderId = orders[0].id;
      await client.put(`/manager/orders/${orderId}/approve`, {
        expectedCompletion: 25,
      });
      log.info(`Approved order ID: ${orderId}`);
    });
  }

  // TEST 8: Get All Orders
  await test('8. Get All Orders', async () => {
    const response = await client.get('/manager/orders/all');
    const allOrders = response.data.orders || response.data;
    if (!Array.isArray(allOrders)) throw new Error('Not an array');
    log.info(`Found ${allOrders.length} total orders`);
  });

  // TEST 9: Get Statistics
  await test('9. Get Dashboard Statistics', async () => {
    const response = await client.get('/manager/statistics');
    const stats = response.data;
    log.info(`Total Orders: ${stats.totalOrders || stats.count}`);
  });

  // TEST 10: Get Feedback
  await test('10. Get Customer Feedback', async () => {
    const response = await client.get('/manager/feedback');
    const feedback = response.data.feedback || response.data;
    if (!Array.isArray(feedback)) throw new Error('Not an array');
    log.info(`Found ${feedback.length} feedback entries`);
  });

  // Print Summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            TEST RESULTS               ║');
  console.log('╚════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}  ${r.name}`);
  });

  console.log(`\n${colors.cyan}Success Rate: ${passed}/${total} (${Math.round((passed/total)*100)}%)${colors.green}\x1b[0m`);

  if (passed === total) {
    console.log(`\n${colors.green}🎉 ALL TESTS PASSED!${colors.green}\x1b[0m`);
    console.log(`${colors.green}Manager Dashboard is fully integrated and working!${colors.green}\x1b[0m\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}⚠️  ${total - passed} test(s) failed${colors.red}\x1b[0m\n`);
    process.exit(1);
  }
}

console.log(`${colors.cyan}Connecting to API at: ${API_BASE}${colors.cyan}\x1b[0m\n`);

runTests().catch(err => {
  log.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
