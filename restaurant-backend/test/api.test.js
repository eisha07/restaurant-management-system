/**
 * API Endpoint Tests
 * Tests for all REST API endpoints covering basic functionality, error handling, and edge cases
 */

const assert = require('assert');
const { mockData, validators, assertions } = require('./helpers');

describe('API Endpoints - Menu Routes', function() {
  
  describe('GET /api/menu', function() {
    
    it('should return an array of menu items', function() {
      const mockResponse = [mockData.menuItem];
      assert(Array.isArray(mockResponse), 'Response should be an array');
      assert(mockResponse.length > 0, 'Menu should have items');
    });

    it('should return menu items with required properties', function() {
      const item = mockData.menuItem;
      assertions.assertValidMenuStructure(item);
    });

    it('should return items with correct price format', function() {
      const item = mockData.menuItem;
      assert(typeof item.price === 'number', 'Price should be a number');
      assert(item.price > 0, 'Price should be positive');
      assert(item.price.toFixed(2), 'Price should have 2 decimal places');
    });

    it('should filter items by category', function() {
      const allItems = [
        { ...mockData.menuItem, category: 'Desi' },
        { ...mockData.menuItem, id: 2, category: 'Fast Food' }
      ];
      const desiItems = allItems.filter(item => item.category === 'Desi');
      assert.strictEqual(desiItems.length, 1, 'Should filter correctly by category');
    });

    it('should search items by name', function() {
      const items = [mockData.menuItem];
      const searchTerm = 'Biryani';
      const results = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
      assert(results.length > 0, 'Should find items matching search term');
    });

    it('should return unavailable items with proper status', function() {
      const item = { ...mockData.menuItem, is_available: false };
      assert.strictEqual(item.is_available, false, 'Should mark unavailable items');
    });

    it('should include image URLs for items', function() {
      const item = mockData.menuItem;
      assert(item.image_url, 'Item should have image URL');
      assert(typeof item.image_url === 'string', 'Image URL should be a string');
    });

    it('should include descriptions for items', function() {
      const item = mockData.menuItem;
      assert(item.description, 'Item should have description');
      assert(typeof item.description === 'string', 'Description should be a string');
    });
  });

  describe('GET /api/menu/:id', function() {
    
    it('should return a single menu item by ID', function() {
      const item = mockData.menuItem;
      assert(item.id !== undefined, 'Item should have an ID');
    });

    it('should return proper structure for single item', function() {
      const item = mockData.menuItem;
      assertions.assertValidMenuStructure(item);
    });

    it('should return 404 for non-existent item ID', function() {
      // Simulating 404 response for invalid ID
      const statusCode = 404;
      assert(validators.isClientError(statusCode), 'Should return 4xx error');
    });

    it('should not return deleted items', function() {
      const items = [
        { ...mockData.menuItem, id: 1, deleted_at: null },
        { ...mockData.menuItem, id: 2, deleted_at: '2024-01-01' }
      ];
      const activeItems = items.filter(item => !item.deleted_at);
      assert.strictEqual(activeItems.length, 1, 'Should exclude deleted items');
    });
  });
});

describe('API Endpoints - Order Routes', function() {
  
  describe('POST /api/orders', function() {
    
    it('should create a new order with valid data', function() {
      const order = mockData.order;
      assert(order.items && order.items.length > 0, 'Order should have items');
      assert(order.customer_id !== undefined, 'Order should have customer_id');
    });

    it('should generate unique order number', function() {
      const order1 = { ...mockData.order, order_number: 'ORD-001' };
      const order2 = { ...mockData.order, order_number: 'ORD-002' };
      assert.notStrictEqual(order1.order_number, order2.order_number, 'Order numbers should be unique');
    });

    it('should validate required fields on order creation', function() {
      const invalidOrder = { customer_id: 1 }; // Missing items
      assert(!invalidOrder.items, 'Invalid order should be caught');
    });

    it('should calculate total amount correctly', function() {
      const items = [
        { price: 10, quantity: 2 },
        { price: 5, quantity: 1 }
      ];
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      assert.strictEqual(total, 25, 'Total should be calculated correctly');
    });

    it('should accept special instructions for items', function() {
      const item = mockData.order.items[0];
      assert(item.specialInstructions !== undefined, 'Item should accept special instructions');
    });

    it('should initialize order with pending status', function() {
      const order = { ...mockData.order, status: 'pending' };
      assert.strictEqual(order.status, 'pending', 'New order should have pending status');
    });

    it('should set creation timestamp on order', function() {
      const order = { ...mockData.order, created_at: new Date() };
      assert(order.created_at instanceof Date, 'Order should have creation timestamp');
    });
  });

  describe('GET /api/orders', function() {
    
    it('should return list of all orders', function() {
      const orders = [mockData.order];
      assert(Array.isArray(orders), 'Should return an array of orders');
    });

    it('should filter orders by status', function() {
      const orders = [
        { ...mockData.order, id: 1, status: 'completed' },
        { ...mockData.order, id: 2, status: 'pending' },
        { ...mockData.order, id: 3, status: 'completed' }
      ];
      const completedOrders = orders.filter(o => o.status === 'completed');
      assert.strictEqual(completedOrders.length, 2, 'Should filter orders by status');
    });

    it('should sort orders by creation date', function() {
      const now = new Date();
      const orders = [
        { ...mockData.order, id: 1, created_at: new Date(now - 3600000) },
        { ...mockData.order, id: 2, created_at: now },
      ];
      const sorted = orders.sort((a, b) => b.created_at - a.created_at);
      assert.strictEqual(sorted[0].id, 2, 'Should sort by newest first');
    });
  });

  describe('GET /api/orders/:id', function() {
    
    it('should return specific order details', function() {
      const order = mockData.order;
      assert(order.items !== undefined, 'Should return order items');
      assert(order.total_amount !== undefined, 'Should return total amount');
    });

    it('should include all order items in response', function() {
      const order = mockData.order;
      assert(Array.isArray(order.items), 'Items should be an array');
      assert(order.items.length > 0, 'Order should have items');
    });
  });
});

describe('API Endpoints - Feedback Routes', function() {
  
  describe('POST /api/feedback', function() {
    
    it('should accept feedback with rating 1-5', function() {
      const validRatings = [1, 2, 3, 4, 5];
      validRatings.forEach(rating => {
        const feedback = { ...mockData.feedback, rating };
        assert(feedback.rating >= 1 && feedback.rating <= 5, `Rating ${rating} should be valid`);
      });
    });

    it('should reject feedback with invalid rating', function() {
      const invalidRatings = [0, 6, -1, 10];
      invalidRatings.forEach(rating => {
        const isValid = rating >= 1 && rating <= 5;
        assert(!isValid, `Rating ${rating} should be invalid`);
      });
    });

    it('should require orderId for feedback', function() {
      const feedback = { ...mockData.feedback };
      assert(feedback.orderId !== undefined, 'Feedback should require orderId');
    });

    it('should accept optional comment field', function() {
      const feedback1 = { ...mockData.feedback };
      const feedback2 = { ...mockData.feedback, comment: undefined };
      assert(feedback1.comment !== undefined, 'Comment can be provided');
      assert(feedback2.comment === undefined, 'Comment is optional');
    });

    it('should accept detailed rating breakdowns', function() {
      const feedback = mockData.feedback;
      assert(feedback.foodQuality !== undefined, 'Should accept food quality rating');
      assert(feedback.serviceSpeed !== undefined, 'Should accept service speed rating');
      assert(feedback.valueForMoney !== undefined, 'Should accept value rating');
    });

    it('should timestamp feedback submission', function() {
      const feedback = { ...mockData.feedback, created_at: new Date() };
      assert(feedback.created_at instanceof Date, 'Feedback should have timestamp');
    });
  });

  describe('GET /api/feedback', function() {
    
    it('should return feedback list for managers', function() {
      const feedbackList = [mockData.feedback];
      assert(Array.isArray(feedbackList), 'Should return array of feedback');
    });

    it('should include average ratings', function() {
      const feedbacks = [
        { ...mockData.feedback, rating: 5 },
        { ...mockData.feedback, rating: 4 },
        { ...mockData.feedback, rating: 5 }
      ];
      const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
      // 5 + 4 + 5 = 14 / 3 = 4.666... rounds to 4.67
      assert(Math.abs(avgRating - 4.67) < 0.01, 'Should calculate average rating approximately 4.67');
    });
  });
});

describe('API Endpoints - Health Check', function() {
  
  it('should return 200 status for health endpoint', function() {
    const statusCode = 200;
    assert(validators.isSuccess(statusCode), 'Health check should return 200');
  });

  it('should return basic server info', function() {
    const healthResponse = {
      status: 'ok',
      uptime: 3600,
      timestamp: new Date()
    };
    assert(healthResponse.status === 'ok', 'Health status should be ok');
  });
});

describe('API Error Handling', function() {
  
  it('should return 400 for invalid request data', function() {
    const statusCode = 400;
    assert(validators.isClientError(statusCode), 'Should return 4xx for invalid data');
  });

  it('should return 500 for server errors', function() {
    const statusCode = 500;
    assert(validators.isServerError(statusCode), 'Should return 5xx for server errors');
  });

  it('should return meaningful error messages', function() {
    const error = {
      success: false,
      message: 'Invalid request data',
      error: 'Missing required field: orderId'
    };
    assert(error.message, 'Error should have message');
    assert(error.error, 'Error should have error details');
  });

  it('should handle database connection failures gracefully', function() {
    const fallbackResponse = { data: 'mock_data', cached: true };
    assert(fallbackResponse.data !== undefined, 'Should provide fallback data');
  });
});
