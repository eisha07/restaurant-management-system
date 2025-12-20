const express = require('express');
const router = express.Router();

// Import all route modules
const healthRoutes = require('./healthRoutes');
const databaseRoutes = require('./databaseRoutes');
const menuRoutes = require('./menuRoutes');
const orderRoutes = require('./orderRoutes');
const feedbackRoutes = require('./feedbackRoutes');

// Root route - API information
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Restaurant Management System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      database: '/api/tables',
      menu: '/api/menu',
      orders: '/api/orders',
      feedback: '/api/feedback'
    }
  });
});

// Use route modules
router.use('/', healthRoutes);          // Mount health routes at root
router.use('/api', databaseRoutes);     // Mount database routes at /api
router.use('/api/menu', menuRoutes);    // Mount menu routes at /api/menu
router.use('/api/orders', orderRoutes); // Mount order routes at /api/orders
router.use('/api/orders', feedbackRoutes)

module.exports = router;