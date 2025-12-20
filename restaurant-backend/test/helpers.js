/**
 * Test Helpers and Utilities
 */

const assert = require('assert');

/**
 * Mock data generators for testing
 */
const mockData = {
  // Menu item mock
  menuItem: {
    id: 1,
    name: 'Chicken Biryani',
    description: 'Aromatic basmati rice with chicken',
    price: 12.99,
    category: 'Desi',
    image_url: 'https://via.placeholder.com/800x600',
    is_available: true,
    rating: 4.5
  },

  // Order mock
  order: {
    customer_id: 1,
    table_id: 1,
    order_status_id: 1,
    payment_method_id: 1,
    payment_status_id: 1,
    total_amount: 50.00,
    items: [
      { menuItemId: 1, quantity: 2, specialInstructions: 'No onions' },
      { menuItemId: 2, quantity: 1 }
    ]
  },

  // Customer mock
  customer: {
    customer_id: 1,
    session_id: 'session_abc123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-1234'
  },

  // Feedback mock
  feedback: {
    orderId: 1,
    rating: 5,
    foodQuality: 5,
    serviceSpeed: 4,
    overallExperience: 5,
    accuracy: 5,
    valueForMoney: 4,
    comment: 'Excellent service and delicious food!'
  },

  // Payment mock
  payment: {
    orderId: 1,
    method: 'credit_card',
    amount: 50.00,
    status: 'completed'
  },

  // Table mock
  table: {
    table_id: 1,
    table_number: 'T1',
    capacity: 4,
    is_available: true
  }
};

/**
 * Validation helpers
 */
const validators = {
  // Validate response structure
  isValidMenuResponse: (data) => {
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return true; // Empty array is valid

    const item = data[0];
    return (
      typeof item.id === 'number' &&
      typeof item.name === 'string' &&
      typeof item.price === 'number' &&
      typeof item.is_available === 'boolean'
    );
  },

  // Validate order response
  isValidOrderResponse: (data) => {
    if (typeof data !== 'object') return false;
    return (
      data.id !== undefined &&
      typeof data.order_number === 'string' || data.order_number === null
    );
  },

  // Validate feedback response
  isValidFeedbackResponse: (data) => {
    if (typeof data !== 'object') return false;
    return (
      data.id !== undefined &&
      typeof data.rating === 'number' &&
      data.rating >= 1 &&
      data.rating <= 5
    );
  },

  // Validate HTTP status codes
  isSuccess: (statusCode) => statusCode >= 200 && statusCode < 300,
  isClientError: (statusCode) => statusCode >= 400 && statusCode < 500,
  isServerError: (statusCode) => statusCode >= 500 && statusCode < 600,

  // Validate email format
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  // Validate phone format
  isValidPhone: (phone) => /^\d{3}-\d{4}$/.test(phone),

  // Validate UUID/session format
  isValidSessionId: (id) => /^[a-zA-Z0-9_-]+$/.test(id)
};

/**
 * Assertion helpers
 */
const assertions = {
  // Assert response structure
  assertValidMenuStructure: (item) => {
    assert(item.id !== undefined, 'Menu item should have an id');
    assert(typeof item.name === 'string', 'Menu item name should be a string');
    assert(typeof item.price === 'number', 'Menu item price should be a number');
    assert(item.price > 0, 'Menu item price should be positive');
    assert(typeof item.is_available === 'boolean', 'Menu item should have availability status');
  },

  // Assert order structure
  assertValidOrderStructure: (order) => {
    assert(order.id !== undefined, 'Order should have an id');
    assert(typeof order.customer_id === 'number' || order.customer_id === null, 'Order should have customer_id');
    assert(order.status !== undefined, 'Order should have a status');
  },

  // Assert feedback structure
  assertValidFeedbackStructure: (feedback) => {
    assert(feedback.id !== undefined, 'Feedback should have an id');
    assert(typeof feedback.rating === 'number', 'Feedback rating should be a number');
    assert(feedback.rating >= 1 && feedback.rating <= 5, 'Rating should be between 1-5');
  },

  // Assert price calculation
  assertPriceCalculation: (items, totalAmount) => {
    const calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    assert.strictEqual(calculatedTotal, totalAmount, 'Price calculation mismatch');
  }
};

/**
 * Database test helpers
 */
const dbHelpers = {
  // Seed test data
  seedTestData: async (sequelize) => {
    try {
      console.log('Seeding test data...');
      return true;
    } catch (error) {
      console.error('Failed to seed test data:', error);
      return false;
    }
  },

  // Clear test data
  clearTestData: async (sequelize) => {
    try {
      console.log('Clearing test data...');
      return true;
    } catch (error) {
      console.error('Failed to clear test data:', error);
      return false;
    }
  },

  // Connect to test database
  connectTestDb: async (sequelize) => {
    try {
      await sequelize.authenticate();
      console.log('Test database connected');
      return true;
    } catch (error) {
      console.error('Failed to connect to test database:', error);
      return false;
    }
  }
};

module.exports = {
  mockData,
  validators,
  assertions,
  dbHelpers
};
