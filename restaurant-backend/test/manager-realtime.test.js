const assert = require('assert');
const axios = require('axios');
const { authenticateManager } = require('../middleware/auth');

const BASE_URL = process.env.API_BASE || 'http://127.0.0.1:5000';

// Helper to build a mock res object for middleware testing
const createMockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return {
      json: (body) => {
        res.body = body;
        return res;
      }
    };
  };
  return res;
};

describe('Manager auth + images + realtime contracts', function () {
  this.timeout(15000);

  it('requires auth in production for manager routes (no header -> 401)', async function () {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await authenticateManager(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, 'next() should not be called without auth in prod');
    assert.strictEqual(res.statusCode, 401, 'Should return 401 when auth header is missing in prod');

    process.env.NODE_ENV = originalEnv;
  });

  it('returns menu items with real image URLs (no placeholder.com)', async function () {
    let response;
    try {
      response = await axios.get(`${BASE_URL}/api/menu`, { timeout: 5000, validateStatus: () => true });
    } catch (err) {
      this.skip();
      return;
    }

    assert(Array.isArray(response.data), 'Menu response should be an array');
    assert(response.data.length > 0, 'Menu should not be empty');

    const withImages = response.data.filter((item) => item.image);
    assert(withImages.length > 0, 'At least one item should include an image');

    const placeholders = withImages.filter((item) => String(item.image).includes('placeholder.com'));
    assert.strictEqual(placeholders.length, 0, 'Menu items should not return placeholder.com URLs');
  });

  it.skip('emits realtime updates to manager and kitchen on order approval', function () {
    // TODO: Implement with socket.io-client once a seeded DB and active server are available.
    // Steps to enable:
    // 1) Seed DB with at least one pending order.
    // 2) Connect two socket clients, join "managers" and "kitchen" rooms.
    // 3) Approve the pending order via /api/manager/orders/:id/approve.
    // 4) Assert both clients receive the order-approved event with the same orderId.
  });
});
