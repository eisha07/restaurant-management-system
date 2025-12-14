const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Kitchen-Token']
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Middleware
app.use(express.json());

// Add request timeout to prevent hanging requests
app.use((req, res, next) => {
  req.setTimeout(5000); // 5 second timeout per request
  res.setTimeout(5000);
  next();
});

// Handle preflight requests with a regular route
app.options('/', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Routes
app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/qr', require('./routes/qrRoutes'));
app.use('/api/db', require('./routes/databaseRoutes')); // Database admin routes
app.use('/api/auth', require('./routes/authRoutes')); // Auth routes for manager login
app.use('/api/manager', require('./routes/managerDashboard')); // Manager dashboard routes
app.use('/api/kitchen', require('./routes/kitchenRoutes')); // Kitchen display routes


// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Restaurant Management System API',
    version: '1.0',
    endpoints: [
      '/api/menu', 
      '/api/orders', 
      '/api/feedback', 
      '/api/qr', 
      '/api/db',
      '/api/auth',
      '/api/manager',
      '/api/kitchen'
    ]
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working correctly!',
    data: [
      { id: 1, name: 'Test Burger', price: 9.99, category: 'Fast Food' },
      { id: 2, name: 'Test Pizza', price: 12.99, category: 'Italian' }
    ]
  });
});

// Specific test endpoint for menu
app.get('/api/menu/test', (req, res) => {
  res.json({
    items: [
      {
        id: 1,
        name: 'Chicken Biryani',
        description: 'Aromatic basmati rice with tender chicken',
        price: 12.99,
        category: 'Desi',
        image_url: '/images/biryani.jpg',
        is_available: true,
        rating: 4.8
      },
      {
        id: 2,
        name: 'Beef Burger',
        description: 'Juicy beef patty with fresh vegetables',
        price: 8.99,
        category: 'Fast Food',
        image_url: '/images/burger.jpg',
        is_available: true,
        rating: 4.5
      }
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler - fix the wildcard syntax
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/test',
      'GET /api/menu/test',
      'GET /api/menu',
      'POST /api/orders',
      'POST /api/feedback',
      'GET /api/qr',
      'POST /api/auth/manager/login',
      'GET /api/auth/verify',
      'POST /api/auth/logout',
      'GET /api/manager/orders/pending',
      'GET /api/manager/orders/all',
      'PUT /api/manager/orders/:id/approve',
      'PUT /api/manager/orders/:id/reject',
      'PUT /api/manager/orders/:id/status',
      'GET /api/manager/menu',
      'POST /api/manager/menu',
      'PUT /api/manager/menu/:id',
      'DELETE /api/manager/menu/:id',
      'GET /api/manager/statistics',
      'GET /api/manager/feedback'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  🚀 Server running on port ${PORT}
  📍 Environment: ${process.env.NODE_ENV || 'development'}
  🔗 Local URL: http://localhost:${PORT}
  📊 API Health: http://localhost:${PORT}/api/health
  🧪 API Test: http://localhost:${PORT}/api/test
  📋 Menu Test: http://localhost:${PORT}/api/menu/test
  `);
});