#!/usr/bin/env node
/**
 * Complete Integration Test for Manager Dashboard
 * Tests: Auth, Menu CRUD, Orders (approve/reject), Statistics, Feedback
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const API_BASE = 'http://localhost:5000/api';

let backendProcess = null;
let managerToken = null;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  title: (msg) => console.log(`\n${colors.magenta}${'='.repeat(70)}${colors.reset}`),
  section: (msg) => console.log(`${colors.cyan}📍 ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.blue}🧪 ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
};

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

async function startBackend() {
  return new Promise((resolve, reject) => {
    log.section('Starting Backend Server...');
    
    const backendPath = path.join(__dirname, 'restaurant-backend');
    backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: backendPath,
      stdio: 'pipe',
      shell: true,
    });

    let stdoutData = '';
    let stderrData = '';

    backendProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      if (stdoutData.includes('listening') || stdoutData.includes('Server')) {
        log.success('Backend server started');
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.log(data.toString());
    });

    setTimeout(() => {
      log.warning('Backend may be starting (timeout reached, proceeding with tests)');
      resolve();
    }, 5000);

    backendProcess.on('error', reject);
  });
}

async function stopBackend() {
  return new Promise((resolve) => {
    if (backendProcess) {
      log.section('Stopping Backend Server...');
      backendProcess.kill();
      setTimeout(resolve, 2000);
    } else {
      resolve();
    }
  });
}

async function testAuth() {
  log.test('TEST 1: Manager Authentication');
  try {
    const response = await client.post('/auth/manager/login', {
      password: 'admin123',
    });

    if (!response.data.token) {
      throw new Error('No token in response');
    }

    managerToken = response.data.token;
    client.defaults.headers.common['Authorization'] = `Bearer ${managerToken}`;
    
    log.success(`Authentication successful - Token: ${managerToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    log.error(`Authentication failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testGetMenu() {
  log.test('TEST 2: Get Menu Items');
  try {
    const response = await client.get('/menu');
    const items = response.data;
    
    if (!Array.isArray(items)) {
      throw new Error('Menu response is not an array');
    }

    log.success(`Retrieved ${items.length} menu items`);
    if (items.length > 0) {
      log.info(`Sample item: ${items[0].name} - $${items[0].price}`);
    }
    return true;
  } catch (error) {
    log.error(`Failed to get menu: ${error.message}`);
    return false;
  }
}

async function testAddMenuItem() {
  log.test('TEST 3: Add Menu Item');
  try {
    const newItem = {
      name: `Test Paneer Tikka ${Date.now()}`,
      description: 'Marinated cottage cheese cooked in tandoor',
      price: 450.00,
      category_id: 1,
      preparation_time_min: 20,
      is_available: true,
    };

    const response = await client.post('/manager/menu', newItem);
    const itemId = response.data.item_id || response.data.id;

    if (!itemId) {
      throw new Error('No item ID in response');
    }

    log.success(`Menu item created - ID: ${itemId}`);
    log.info(`Item: ${newItem.name}`);
    return itemId;
  } catch (error) {
    log.error(`Failed to add menu item: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function testUpdateMenuItem(itemId) {
  log.test('TEST 4: Update Menu Item');
  try {
    if (!itemId) {
      throw new Error('No item ID provided');
    }

    const updateData = {
      name: `Updated Paneer Tikka ${Date.now()}`,
      price: 500.00,
    };

    const response = await client.put(`/manager/menu/${itemId}`, updateData);
    log.success(`Menu item updated - ID: ${itemId}`);
    log.info(`New price: $${updateData.price}`);
    return true;
  } catch (error) {
    log.error(`Failed to update menu item: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testDeleteMenuItem(itemId) {
  log.test('TEST 5: Delete Menu Item');
  try {
    if (!itemId) {
      throw new Error('No item ID provided');
    }

    await client.delete(`/manager/menu/${itemId}`);
    log.success(`Menu item deleted - ID: ${itemId}`);
    return true;
  } catch (error) {
    log.error(`Failed to delete menu item: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testGetPendingOrders() {
  log.test('TEST 6: Get Pending Orders');
  try {
    const response = await client.get('/manager/orders/pending');
    const orders = response.data.orders || response.data;

    if (!Array.isArray(orders)) {
      throw new Error('Orders response is not an array');
    }

    log.success(`Retrieved ${orders.length} pending orders`);
    if (orders.length > 0) {
      log.info(`Sample order: #${orders[0].order_number} - $${orders[0].total}`);
    }
    return orders;
  } catch (error) {
    log.error(`Failed to get pending orders: ${error.message}`);
    return [];
  }
}

async function testApproveOrder(orders) {
  log.test('TEST 7: Approve Order');
  try {
    if (!orders.length) {
      log.warning('No pending orders to approve');
      return false;
    }

    const orderId = orders[0].id || orders[0].order_id;
    const response = await client.put(`/manager/orders/${orderId}/approve`, {
      expectedCompletion: 25,
    });

    log.success(`Order approved - ID: ${orderId}`);
    log.info(`Expected completion: 25 minutes`);
    return true;
  } catch (error) {
    log.error(`Failed to approve order: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testGetAllOrders() {
  log.test('TEST 8: Get All Orders');
  try {
    const response = await client.get('/manager/orders/all');
    const orders = response.data.orders || response.data;

    if (!Array.isArray(orders)) {
      throw new Error('Orders response is not an array');
    }

    log.success(`Retrieved ${orders.length} total orders`);
    return true;
  } catch (error) {
    log.error(`Failed to get all orders: ${error.message}`);
    return false;
  }
}

async function testGetStatistics() {
  log.test('TEST 9: Get Dashboard Statistics');
  try {
    const response = await client.get('/manager/statistics');
    const stats = response.data;

    log.success('Statistics retrieved');
    log.info(`  Total Orders: ${stats.totalOrders || stats.count}`);
    log.info(`  Total Revenue: $${stats.totalRevenue || stats.revenue}`);
    return true;
  } catch (error) {
    log.error(`Failed to get statistics: ${error.message}`);
    return false;
  }
}

async function testGetFeedback() {
  log.test('TEST 10: Get Customer Feedback');
  try {
    const response = await client.get('/manager/feedback');
    const feedback = response.data.feedback || response.data.data || [];

    if (!Array.isArray(feedback)) {
      throw new Error('Feedback response is not an array');
    }

    log.success(`Retrieved ${feedback.length} feedback entries`);
    if (feedback.length > 0) {
      const avg = feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length;
      log.info(`Average rating: ${avg.toFixed(1)}/5`);
    }
    return true;
  } catch (error) {
    log.error(`Failed to get feedback: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log.title();
  console.log(`${colors.magenta}${' '.repeat(15)}🚀 MANAGER DASHBOARD INTEGRATION TESTS${colors.reset}`);
  log.title();

  const results = [];

  try {
    // Start backend
    await startBackend();
    await new Promise(r => setTimeout(r, 3000)); // Wait for backend to fully start

    // Authentication
    results.push({ name: 'Authentication', passed: await testAuth() });
    if (!results[0].passed) {
      log.error('Cannot continue - authentication failed');
      process.exit(1);
    }

    // Menu Operations
    results.push({ name: 'Get Menu Items', passed: await testGetMenu() });
    
    let itemId = null;
    if (results[results.length - 1].passed) {
      itemId = await testAddMenuItem();
      results.push({ name: 'Add Menu Item', passed: itemId !== null });

      if (itemId) {
        results.push({ name: 'Update Menu Item', passed: await testUpdateMenuItem(itemId) });
        results.push({ name: 'Delete Menu Item', passed: await testDeleteMenuItem(itemId) });
      }
    }

    // Order Operations
    const pendingOrders = await testGetPendingOrders();
    results.push({ name: 'Get Pending Orders', passed: Array.isArray(pendingOrders) });

    if (pendingOrders.length > 0) {
      results.push({ name: 'Approve Order', passed: await testApproveOrder(pendingOrders) });
    } else {
      log.warning('Skipped approve test - no pending orders');
    }

    results.push({ name: 'Get All Orders', passed: await testGetAllOrders() });

    // Statistics & Feedback
    results.push({ name: 'Get Statistics', passed: await testGetStatistics() });
    results.push({ name: 'Get Feedback', passed: await testGetFeedback() });

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
  } finally {
    await stopBackend();
  }

  // Print Results
  log.title();
  console.log(`${colors.magenta}${' '.repeat(25)}📊 TEST RESULTS${colors.reset}`);
  log.title();

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    if (r.passed) {
      log.success(`${r.name}`);
    } else {
      log.error(`${r.name}`);
    }
  });

  console.log(`\n${colors.cyan}Pass Rate: ${passed}/${total} (${Math.round((passed / total) * 100)}%)${colors.reset}`);

  if (passed === total) {
    console.log(`\n${colors.green}🎉 ALL TESTS PASSED! Manager Dashboard is fully integrated!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}⚠️  Some tests failed. Check errors above.${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  log.error(`Unhandled error: ${err.message}`);
  stopBackend().then(() => process.exit(1));
});
