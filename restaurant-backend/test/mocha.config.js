/**
 * Mocha Configuration for Restaurant Management System Tests
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Configure mocha options
module.exports = {
  require: [],
  timeout: 10000,
  slow: 5000,
  ui: 'bdd',
  recursive: true,
  exit: true
};
