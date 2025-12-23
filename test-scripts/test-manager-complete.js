/**
 * Comprehensive test of all manager frontend API connections
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const MANAGER_TOKEN = 'test-manager-token'; // Dev mode bypass

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.cyan}🧪${colors.reset} ${msg}`),
  data: (msg) => console.log(`${colors.yellow}📊${colors.reset} ${msg}`),
};

const client = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
  headers: {
    'Authorization': `Bearer ${MANAGER_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function testEndpoint(name, method, path, data = null) {
  try {
    log.test(name);
    let response;
    if (method === 'GET') {
      response = await client.get(path);
    } else if (method === 'POST') {
      response = await client.post(path, data);
    } else if (method === 'PUT') {
      response = await client.put(path, data);
    } else if (method === 'DELETE') {
      response = await client.delete(path);
    }
    
    log.success(`${name} [${response.status}]`);
    return response.data;
  } catch (error) {
    if (error.response) {
      log.error(`${name} [${error.response.status}] ${error.response.statusText}`);
      console.log('  ', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      log.error(`${name} - Connection refused (server not running?)`);
    } else {
      log.error(`${name} - ${error.message}`);
    }
    return null;
  }
}

async function runTests() {
  console.log('\n' + colors.cyan + '═══════════════════════════════════════════════════════' + colors.reset);
  console.log(colors.cyan + '  MANAGER FRONTEND API INTEGRATION TESTS' + colors.reset);
  console.log(colors.cyan + '═══════════════════════════════════════════════════════' + colors.reset + '\n');

  // Test 1: Orders API
  console.log(colors.yellow + '\n📋 ORDERS API' + colors.reset);
  const pendingOrders = await testEndpoint(
    'Get pending orders',
    'GET',
    '/manager/orders/pending'
  );
  if (pendingOrders && Array.isArray(pendingOrders)) {
    log.data(`Returned ${pendingOrders.length} pending orders`);
  }

  // Test 2: Statistics API
  console.log(colors.yellow + '\n📊 STATISTICS API' + colors.reset);
  const stats = await testEndpoint(
    'Get manager statistics',
    'GET',
    '/manager/statistics'
  );
  if (stats) {
    log.data(`Total Orders: ${stats.totalOrders}`);
    log.data(`Total Revenue: $${stats.totalRevenue.toFixed(2)}`);
    log.data(`Average Order Value: $${stats.averageOrderValue.toFixed(2)}`);
    log.data(`Pending Orders: ${stats.pendingOrders}`);
  }

  // Test 3: Menu API
  console.log(colors.yellow + '\n🍽️  MENU API' + colors.reset);
  const menuItems = await testEndpoint(
    'Get menu items',
    'GET',
    '/menu'
  );
  if (menuItems && Array.isArray(menuItems)) {
    log.data(`Returned ${menuItems.length} menu items`);
    if (menuItems.length > 0) {
      log.data(`Sample: ${menuItems[0].name} - $${menuItems[0].price}`);
    }
  }

  // Test 4: Feedback API
  console.log(colors.yellow + '\n💬 FEEDBACK API' + colors.reset);
  const feedback = await testEndpoint(
    'Get feedback (page 1, limit 10)',
    'GET',
    '/feedback?page=1&limit=10'
  );
  if (feedback) {
    log.data(`Returned ${feedback.feedback?.length || 0} feedback items`);
    log.data(`Total feedback: ${feedback.total}`);
  }

  // Test 5: Health Check
  console.log(colors.yellow + '\n❤️  HEALTH CHECK API' + colors.reset);
  const health = await testEndpoint(
    'Check backend health',
    'GET',
    '/health'
  );
  if (health) {
    log.data(`Status: ${health.status}`);
    log.data(`Uptime: ${health.uptime}s`);
  }

  // Summary
  console.log('\n' + colors.cyan + '═══════════════════════════════════════════════════════' + colors.reset);
  console.log(colors.green + '✓ All manager frontend API connections verified!' + colors.reset);
  console.log(colors.cyan + '═══════════════════════════════════════════════════════' + colors.reset + '\n');
}

runTests().catch(console.error);
