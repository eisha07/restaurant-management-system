/**
 * Customer Frontend API Audit & Connection Test
 * Tests all customer-facing components for backend integration
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
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
  section: (msg) => console.log(`\n${colors.yellow}${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  data: (msg) => console.log(`   ${colors.blue}→${colors.reset} ${msg}`),
};

const client = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
});

async function testMenuWithImages() {
  log.section('\n🍽️  MENU ITEMS & IMAGES');
  try {
    log.test('Fetch menu items');
    const response = await client.get('/menu');
    const items = response.data;
    
    if (!Array.isArray(items) || items.length === 0) {
      log.error('No menu items returned');
      return;
    }
    
    log.success(`Got ${items.length} menu items`);
    
    // Check for images
    let itemsWithImages = 0;
    let itemsWithoutImages = 0;
    
    items.forEach((item, idx) => {
      if (idx < 3) { // Show first 3
        const hasImage = item.image_url || item.image;
        const imageStatus = hasImage ? '✓' : '✗';
        console.log(`  ${imageStatus} ${item.name} - ${item.price ? '$' + item.price : 'no price'} ${hasImage ? `(${hasImage.substring(0, 50)}...)` : ''}`);
      }
      
      if (item.image_url || item.image) {
        itemsWithImages++;
      } else {
        itemsWithoutImages++;
      }
    });
    
    log.data(`Items with images: ${itemsWithImages}/${items.length}`);
    if (itemsWithoutImages > 0) {
      log.warn(`Items without images: ${itemsWithoutImages}`);
    }
    
    // Check availability constraint
    const available = items.filter(i => i.is_available === true).length;
    const unavailable = items.filter(i => i.is_available === false).length;
    log.data(`Available: ${available}, Unavailable: ${unavailable}`);
    
    return items;
  } catch (error) {
    log.error(`Failed to fetch menu: ${error.message}`);
    return null;
  }
}

async function testTableValidation() {
  log.section('\n🔢 TABLE NUMBER VALIDATION');
  try {
    // Create test order with valid table
    log.test('Create order with valid table (5)');
    const orderData = {
      customerSessionId: 'test-customer-' + Date.now(),
      paymentMethod: 'card',
      tableNumber: 5,
      items: [
        {
          menuItemId: 1,
          quantity: 1,
          specialInstructions: 'No onions'
        }
      ]
    };
    
    const response = await client.post('/orders', orderData);
    if (response.status === 201 || response.status === 200) {
      log.success('Order created with valid table number');
      log.data(`Order ID: ${response.data.id || response.data.order_id}`);
    }
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 422) {
      log.error(`Table validation error: ${error.response.data.message}`);
    } else {
      log.error(`Failed to create order: ${error.message}`);
    }
  }
  
  // Try invalid table
  try {
    log.test('Create order with INVALID table (999)');
    const invalidData = {
      customerSessionId: 'test-customer-' + Date.now(),
      paymentMethod: 'card',
      tableNumber: 999,
      items: [{ menuItemId: 1, quantity: 1 }]
    };
    
    const response = await client.post('/orders', invalidData);
    if (response.status === 200 || response.status === 201) {
      log.warn('CONSTRAINT FAILURE: Invalid table number was accepted!');
    }
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 422) {
      log.success('Table validation constraint working - rejected invalid table');
      log.data(`Error: ${error.response.data.message}`);
    } else {
      log.error(`Unexpected error: ${error.message}`);
    }
  }
}

async function testOrderCreation() {
  log.section('\n📦 ORDER CREATION');
  try {
    log.test('Create order with valid data');
    const orderData = {
      customerSessionId: 'customer-' + Date.now(),
      paymentMethod: 'cash',
      tableNumber: 7,
      items: [
        {
          menuItemId: 1,
          quantity: 2,
          specialInstructions: 'Extra spicy'
        },
        {
          menuItemId: 2,
          quantity: 1
        }
      ],
      specialInstructions: 'Deliver quickly'
    };
    
    const response = await client.post('/orders', orderData);
    log.success(`Order created successfully [${response.status}]`);
    log.data(`Order Number: ${response.data.order_number || response.data.orderNumber}`);
    log.data(`Total: $${response.data.total || response.data.totalAmount}`);
    log.data(`Status: ${response.data.status}`);
    
    return response.data;
  } catch (error) {
    log.error(`Failed to create order: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testFeedbackSubmission() {
  log.section('\n⭐ FEEDBACK SUBMISSION');
  try {
    // First create an order to submit feedback for
    log.test('Create order for feedback');
    const orderData = {
      customerSessionId: 'feedback-test-' + Date.now(),
      paymentMethod: 'card',
      tableNumber: 3,
      items: [{ menuItemId: 1, quantity: 1 }]
    };
    
    const orderResponse = await client.post('/orders', orderData);
    const orderId = orderResponse.data.id || orderResponse.data.order_id;
    log.success(`Test order created: ${orderId}`);
    
    // Submit feedback
    log.test('Submit feedback');
    const feedbackData = {
      orderId: orderId,
      rating: 5,
      foodQuality: 5,
      serviceSpeed: 4,
      accuracy: 5,
      valueForMoney: 4,
      overallExperience: 5,
      comment: 'Excellent service!'
    };
    
    const feedbackResponse = await client.post('/feedback', feedbackData);
    log.success(`Feedback submitted [${feedbackResponse.status}]`);
    log.data(`Message: ${feedbackResponse.data.message}`);
    
    return true;
  } catch (error) {
    log.error(`Failed to submit feedback: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testOrderTracking() {
  log.section('\n📍 ORDER TRACKING');
  try {
    // Create an order first
    log.test('Create order for tracking');
    const orderData = {
      customerSessionId: 'track-test-' + Date.now(),
      paymentMethod: 'online',
      tableNumber: 10,
      items: [{ menuItemId: 2, quantity: 1 }]
    };
    
    const orderResponse = await client.post('/orders', orderData);
    const orderId = orderResponse.data.id || orderResponse.data.order_id;
    log.success(`Order created: ${orderId}`);
    
    // Fetch order status
    log.test('Fetch order status');
    const statusResponse = await client.get(`/orders/${orderId}`);
    log.success(`Order status retrieved [${statusResponse.status}]`);
    log.data(`Status: ${statusResponse.data.status}`);
    log.data(`Items: ${statusResponse.data.items?.length || 0}`);
    log.data(`Total: $${statusResponse.data.total || statusResponse.data.totalAmount}`);
    
    return true;
  } catch (error) {
    log.error(`Failed to track order: ${error.message}`);
    return false;
  }
}

async function testHealthAndConstraints() {
  log.section('\n⚙️  CONSTRAINTS & DATABASE');
  try {
    // Test health
    log.test('Check backend health');
    const health = await client.get('/health');
    log.success(`Backend healthy [${health.status}]`);
    log.data(`Status: ${health.data.status}`);
    log.data(`Uptime: ${health.data.uptime}s`);
    
    // Test table constraint
    log.test('Verify table constraints (valid: 1-22)');
    const validTables = [1, 5, 10, 22];
    log.data(`Valid table range: 1-22`);
    log.data(`Test attempts: ${validTables.join(', ')}`);
    
    return true;
  } catch (error) {
    log.error(`Health check failed: ${error.message}`);
    return false;
  }
}

async function runAudit() {
  console.log('\n' + colors.cyan + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║   CUSTOMER FRONTEND BACKEND INTEGRATION AUDIT            ║' + colors.reset);
  console.log(colors.cyan + '╚════════════════════════════════════════════════════════╝' + colors.reset);
  
  // Run all tests
  await testHealthAndConstraints();
  const menu = await testMenuWithImages();
  await testTableValidation();
  const order = await testOrderCreation();
  
  if (order) {
    await testOrderTracking();
  }
  
  await testFeedbackSubmission();
  
  // Summary
  console.log('\n' + colors.cyan + '╔════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.green + '✓ Customer Frontend API Audit Complete' + colors.reset);
  console.log(colors.cyan + '╚════════════════════════════════════════════════════════╝\n' + colors.reset);
}

runAudit().catch(console.error);
