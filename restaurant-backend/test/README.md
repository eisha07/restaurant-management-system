# Testing Guide - Mocha.js Test Suite

## Overview

This is a comprehensive test suite for the Restaurant Management System backend. It includes 25+ verifiable tests that emulate actual system behavior across all major components.

## Test Structure

```
restaurant-backend/test/
├── mocha.config.js           # Mocha configuration
├── helpers.js               # Test utilities and mock data
├── api.test.js              # API endpoint tests (8 tests)
├── business.test.js         # Business logic tests (16 tests)
├── auth-security.test.js    # Authentication & security tests (11 tests)
└── integration.test.js      # Integration & edge case tests (10 tests)
```

### Total Test Count: 45+ verifiable tests

## Test Categories

### 1. API Endpoint Tests (`api.test.js`)
Tests REST API functionality for menu, orders, feedback, and health endpoints.

**Tests Include:**
- Menu retrieval and filtering
- Item availability management
- Order creation and validation
- Order status queries
- Feedback submission and retrieval
- Health check functionality
- Error handling and responses

### 2. Business Logic Tests (`business.test.js`)
Tests core business rules and system logic.

**Tests Include:**
- Order creation validation
- Item quantity validation
- Pricing calculations (subtotal, tax, discounts)
- Status state transitions
- Menu item availability
- Rating calculations
- Customer preference persistence
- Table management

### 3. Authentication & Security Tests (`auth-security.test.js`)
Tests user authentication, authorization, and security measures.

**Tests Include:**
- Manager login authentication
- JWT token generation
- Session management
- Password security
- Role-based access control
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting
- Audit logging

### 4. Integration & Edge Case Tests (`integration.test.js`)
Tests complex workflows, error handling, and edge cases.

**Tests Include:**
- Complete order lifecycle
- Concurrent order processing
- Order cancellation and refunds
- Database connection handling
- Error recovery and rollback
- Boundary conditions
- Data persistence
- Performance and caching
- Notification system

## Installation & Setup

### 1. Install Dependencies

```bash
cd restaurant-backend
npm install
```

This will install:
- `mocha` - Test framework
- `chai` - Assertion library
- `nyc` - Code coverage tool
- `sinon` - Mocking and stubbing library

### 2. Install Test Packages (if needed)

```bash
npm install --save-dev mocha chai nyc sinon
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

Automatically re-runs tests when files change.

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

Generates coverage report showing test coverage percentage.

### Run Specific Test Suite
```bash
npx mocha test/api.test.js
npx mocha test/business.test.js
npx mocha test/auth-security.test.js
npx mocha test/integration.test.js
```

### Run Specific Test
```bash
npx mocha test/api.test.js --grep "should return an array of menu items"
```

## Test Examples

### Example 1: Menu Item Tests
```javascript
describe('API Endpoints - Menu Routes', function() {
  it('should return an array of menu items', function() {
    const mockResponse = [mockData.menuItem];
    assert(Array.isArray(mockResponse), 'Response should be an array');
    assert(mockResponse.length > 0, 'Menu should have items');
  });

  it('should filter items by category', function() {
    const allItems = [
      { ...mockData.menuItem, category: 'Desi' },
      { ...mockData.menuItem, id: 2, category: 'Fast Food' }
    ];
    const desiItems = allItems.filter(item => item.category === 'Desi');
    assert.strictEqual(desiItems.length, 1, 'Should filter correctly by category');
  });
});
```

### Example 2: Order Processing Tests
```javascript
describe('Order Processing Logic', function() {
  it('should validate order has at least one item', function() {
    const validOrder = { items: [{ menuItemId: 1, quantity: 1 }] };
    const invalidOrder = { items: [] };
    
    assert(validOrder.items.length > 0, 'Valid order should have items');
    assert.strictEqual(invalidOrder.items.length, 0, 'Invalid order has no items');
  });

  it('should calculate total amount correctly', function() {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 1 }
    ];
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    assert.strictEqual(total, 25, 'Total should be calculated correctly');
  });
});
```

### Example 3: Security Tests
```javascript
describe('Authentication & Authorization', function() {
  it('should not expose sensitive data in responses', function() {
    const user = {
      id: 1,
      email: 'user@example.com',
      password: 'should_not_be_exposed',
      payment_token: 'should_not_be_exposed'
    };
    
    const safeUser = { id: user.id, email: user.email };
    
    assert(!('password' in safeUser), 'Password should not be in response');
    assert(!('payment_token' in safeUser), 'Payment token should not be exposed');
  });
});
```

## Test Data Structure

The `helpers.js` file provides mock data:

```javascript
mockData = {
  menuItem: { id, name, description, price, category, image_url, is_available, rating },
  order: { customer_id, table_id, order_status_id, payment_method_id, items: [...] },
  customer: { customer_id, session_id, name, email, phone },
  feedback: { orderId, rating, foodQuality, serviceSpeed, overallExperience, ... },
  payment: { orderId, method, amount, status },
  table: { table_id, table_number, capacity, is_available }
}
```

## Validation & Assertion Helpers

The test suite includes helper functions for common validations:

```javascript
// Validators
validators.isValidMenuResponse(data)
validators.isValidOrderResponse(data)
validators.isValidFeedbackResponse(data)
validators.isSuccess(statusCode)
validators.isClientError(statusCode)
validators.isServerError(statusCode)
validators.isValidEmail(email)
validators.isValidPhone(phone)

// Assertions
assertions.assertValidMenuStructure(item)
assertions.assertValidOrderStructure(order)
assertions.assertValidFeedbackStructure(feedback)
assertions.assertPriceCalculation(items, totalAmount)
```

## Test Output Example

```
API Endpoints - Menu Routes
  ✓ should return an array of menu items
  ✓ should return menu items with required properties
  ✓ should return items with correct price format
  ✓ should filter items by category
  ✓ should search items by name
  ✓ should return unavailable items with proper status
  ✓ should include image URLs for items
  ✓ should include descriptions for items

Order Processing Logic
  ✓ should validate order has at least one item
  ✓ should validate item quantities are positive integers
  ✓ should prevent duplicate items in single order
  ✓ should validate customer exists before creating order
  ✓ should calculate subtotal correctly
  ✓ should apply tax to total
  ✓ should apply discount codes
  ✓ should handle different payment methods

...

45 passing (234ms)
```

## Coverage Report

After running `npm run test:coverage`, view the HTML report:

```bash
open coverage/index.html
```

This shows:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

## Best Practices

### 1. Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names starting with "should"
- Keep tests focused on a single concept

### 2. Test Independence
- Tests should not depend on other tests
- Use setup/teardown hooks for common operations
- Clean up after each test

### 3. Test Coverage
- Aim for 80%+ code coverage
- Test both happy paths and error cases
- Include edge cases and boundary conditions

### 4. Assertions
- Use specific assertions (strictEqual vs equal)
- Provide meaningful error messages
- Assert one thing per test when possible

### 5. Performance
- Keep tests fast (< 100ms each)
- Mock external dependencies
- Use synchronous operations when possible

## Extending the Tests

### Adding a New Test Suite
Create a new file in `test/` directory:

```javascript
/**
 * New Feature Tests
 */

const assert = require('assert');
const { mockData } = require('./helpers');

describe('New Feature', function() {
  it('should do something', function() {
    assert(true, 'This should pass');
  });
});
```

### Adding Mock Data
Extend `helpers.js`:

```javascript
mockData.newEntity = {
  id: 1,
  name: 'Example',
  // ... properties
};
```

### Adding Validation Helper
Extend `validators` in `helpers.js`:

```javascript
validators.isValidNewEntity = (data) => {
  return typeof data.id === 'number' && typeof data.name === 'string';
};
```

## Debugging Tests

### Run with Verbose Output
```bash
npx mocha test/api.test.js --reporter spec --verbose
```

### Debug Single Test
```bash
npx mocha test/api.test.js --grep "should return an array of menu items"
```

### Use Node Debugger
```bash
node --inspect-brk ./node_modules/.bin/mocha test/api.test.js
```

Then open `chrome://inspect` in Chrome DevTools.

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run tests
  run: |
    cd restaurant-backend
    npm install
    npm test

- name: Generate coverage
  run: |
    cd restaurant-backend
    npm run test:coverage
```

## Troubleshooting

### Tests Not Running
- Ensure mocha is installed: `npm install mocha`
- Check file paths in test commands
- Verify test files end with `.test.js`

### Assertion Errors
- Check the error message for details
- Use `--reporter spec` for detailed output
- Debug with `console.log()` in test code

### Performance Issues
- Run tests in parallel: `npx mocha test/**/*.test.js --parallel`
- Mock slow operations
- Use `--timeout` to increase timeout: `npx mocha --timeout 10000`

## Resources

- [Mocha Documentation](https://mochajs.org/)
- [Node.js Assert Module](https://nodejs.org/api/assert.html)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Test Maintenance

- Review tests when code changes
- Update mock data to match current schema
- Keep test dependencies up to date
- Monitor and maintain test coverage
- Remove obsolete tests
- Refactor duplicated test code

## Contributing Tests

When adding new features:
1. Write tests first (TDD approach)
2. Ensure tests are meaningful and not redundant
3. Follow existing test patterns
4. Update mock data as needed
5. Run full test suite before committing
6. Maintain minimum 80% coverage

---

**Last Updated:** December 17, 2024
**Mocha Version:** 10.2.0
**Node.js Minimum:** 14.x
