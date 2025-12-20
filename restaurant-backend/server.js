const express = require('express');
const cors = require('cors');
const http = require('http');
const net = require('net');
const socketIO = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 5000;
const BIND_ADDRESS = process.env.BIND_ADDRESS || '127.0.0.1';
let currentPort = PORT;
let hasRetriedPort = false;

// Socket.io configuration
const io = socketIO(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000', 'http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Make io globally accessible
global.io = io;

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Kitchen-Token']
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Middleware
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// Serve static images so DB values like "/images/whatever.jpg" resolve
app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')));


// Add request timeout to prevent hanging requests
// app.use((req, res, next) => {
//   req.setTimeout(30000); // 30 second timeout per request
//   res.setTimeout(30000);
//   next();
// });

// Handle preflight requests with a regular route
app.options('/', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Routes - with error handling
try {
  console.log('📦 Loading routes...');
  app.use('/api/menu', require('./routes/menuRoutes'));
  console.log('   ✓ Menu routes loaded');
  app.use('/api/orders', require('./routes/orderRoutes'));
  console.log('   ✓ Order routes loaded');
  app.use('/api/feedback', require('./routes/feedbackRoutes'));
  console.log('   ✓ Feedback routes loaded');
  app.use('/api/qr', require('./routes/qrRoutes'));
  console.log('   ✓ QR routes loaded');
  app.use('/api/db', require('./routes/databaseRoutes')); // Database admin routes
  console.log('   ✓ Database routes loaded');
  app.use('/api/auth', require('./routes/authRoutes')); // Auth routes for manager login
  console.log('   ✓ Auth routes loaded');
  app.use('/api/manager', require('./routes/managerDashboard')); // Manager dashboard routes
  console.log('   ✓ Manager routes loaded');
  app.use('/api/kitchen', require('./routes/kitchenRoutes')); // Kitchen display routes
  console.log('   ✓ Kitchen routes loaded');
  console.log('✅ All routes loaded successfully');
} catch (err) {
  console.error('❌ Error loading routes:', err.message);
  console.error(err.stack);
  console.warn('⚠️  Continuing despite route loading error...');
}


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

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    next(); // Pass to 404 handler
  }
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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Join manager room if they're a manager
  socket.on('join-manager', () => {
    socket.join('managers');
    console.log('   ✅ Manager joined room:', socket.id);
    console.log('   📊 Total managers in room:', io.sockets.adapter.rooms.get('managers')?.size || 0);
  });

  // Join kitchen room if they're in kitchen
  socket.on('join-kitchen', () => {
    socket.join('kitchen');
    console.log('   Kitchen joined room:', socket.id);
  });

  // Join customer room for order updates
  socket.on('join-customer', (data) => {
    const { orderId, sessionId } = data;
    if (orderId) {
      socket.join('order_' + orderId);
      console.log('   👤 Customer joined order room:', orderId);
    }
    if (sessionId) {
      socket.join('session_' + sessionId);
      console.log('   📱 Customer session joined:', sessionId);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Verify server is actually listening
server.on('listening', () => {
  const addr = server.address();
  currentPort = addr.port;
  console.log(`✅ Server is ACTUALLY LISTENING on ${addr.address}:${addr.port}`);
});

server.on('error', async (err) => {
  if (err.code === 'EADDRINUSE' && !hasRetriedPort) {
    hasRetriedPort = true;
    console.warn(`⚠️  Port ${currentPort} just became busy. Searching for another port...`);
    try {
      const nextPort = await findAvailablePort(currentPort + 1, BIND_ADDRESS);
      currentPort = nextPort;
      server.listen(nextPort, BIND_ADDRESS, () => {
        console.log(`✅ Recovered from port conflict. Now listening on ${BIND_ADDRESS}:${nextPort}`);
      });
      return;
    } catch (retryErr) {
      console.error('❌ Failed to recover from port conflict:', retryErr.message);
    }
  }

  console.error('❌ Server error:', err);
  console.error('Stack:', err.stack);
  // Don't exit - let server recover
});

server.on('clientError', (err, socket) => {
  console.error('❌ Client error:', err.message);
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

// Catch unhandled errors - log only, don't exit
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  // Don't exit - keep server running
});

// Start server with proper async initialization
const { testConnection } = require('./config/database');

// Find an available port, retrying sequentially to avoid hard failures when the preferred port is busy
const findAvailablePort = (startPort, bindAddress, maxAttempts = 5) => {
  return new Promise((resolve, reject) => {
    const tryPort = (port, attempt) => {
      const tester = net.createServer();

      tester.once('error', (err) => {
        tester.close();

        if (err.code === 'EADDRINUSE' && attempt < maxAttempts) {
          const nextPort = port + 1;
          console.warn(`⚠️  Port ${port} in use, trying ${nextPort}...`);
          setTimeout(() => tryPort(nextPort, attempt + 1), 150);
        } else {
          reject(err);
        }
      });

      tester.once('listening', () => {
        tester.close(() => resolve(port));
      });

      tester.listen(port, bindAddress);
    };

    tryPort(startPort, 0);
  });
};

const startServer = async () => {
  try {
    // Test database connection first
    console.log('🔗 Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.warn('⚠️  WARNING: Database connection failed, but server will continue with mock data.');
    } else {
      console.log('✅ Database connection verified successfully.');
    }
    
    // Now start listening with port fallback if needed
    const portToUse = await findAvailablePort(PORT, BIND_ADDRESS);

    if (portToUse !== PORT) {
      console.warn(`⚠️  Requested port ${PORT} unavailable. Server will start on ${portToUse} instead.`);
    }

    currentPort = portToUse;

    // Use a Promise to ensure server starts before function returns
    await new Promise((resolve, reject) => {
      server.listen(portToUse, BIND_ADDRESS, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`
  🚀 Server running on port ${portToUse} (bound to ${BIND_ADDRESS})
  📍 Environment: ${process.env.NODE_ENV || 'development'}
  🔗 Local URL: http://localhost:${portToUse}
  📊 API Health: http://localhost:${portToUse}/api/health
  🧪 API Test: http://localhost:${portToUse}/api/test
  📋 Menu Test: http://localhost:${portToUse}/api/menu/test
  🔌 Socket.io: ws://localhost:${portToUse}
  `);
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('❌ Fatal error during startup:', error.message);
    console.error('Stack:', error.stack);
    console.warn('⚠️  Server may not be fully functional');
  }
};

// Start the server
startServer().catch(err => {
  console.error('❌ Startup failed:', err.message);
  console.error('Stack:', err.stack);
  console.warn('⚠️  Server initialization had issues but may still be running');
});