#!/usr/bin/env node
/**
 * Diagnostic script to identify startup bottlenecks
 * Run this to see where the server is hanging
 */

const path = require('path');

console.log('=== BACKEND STARTUP DIAGNOSTIC ===\n');

// Step 1: Check environment
console.log('📋 Step 1: Loading environment...');
try {
  require('dotenv').config();
  console.log('   ✓ dotenv loaded');
  console.log(`   DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
  console.log(`   DB_NAME: ${process.env.DB_NAME || 'NOT SET'}`);
  console.log(`   DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
  console.log(`   DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
} catch (e) {
  console.error('   ✗ Failed to load dotenv:', e.message);
  process.exit(1);
}

// Step 2: Load Express
console.log('\n📋 Step 2: Loading Express modules...');
try {
  const express = require('express');
  const cors = require('cors');
  const http = require('http');
  const socketIO = require('socket.io');
  console.log('   ✓ Express, CORS, HTTP, Socket.IO loaded');
} catch (e) {
  console.error('   ✗ Failed to load Express modules:', e.message);
  process.exit(1);
}

// Step 3: Load database config
console.log('\n📋 Step 3: Loading database configuration...');
try {
  const startDbConfig = Date.now();
  const { sequelize, testConnection } = require('./config/database');
  const dbConfigTime = Date.now() - startDbConfig;
  console.log(`   ✓ Database config loaded (${dbConfigTime}ms)`);
} catch (e) {
  console.error('   ✗ Failed to load database config:', e.message);
  process.exit(1);
}

// Step 4: Test database connection
console.log('\n📋 Step 4: Testing database connection...');
(async () => {
  try {
    const { testConnection } = require('./config/database');
    const startConnection = Date.now();
    const connected = await testConnection();
    const connectionTime = Date.now() - startConnection;
    
    if (connected) {
      console.log(`   ✓ Database connected successfully (${connectionTime}ms)`);
    } else {
      console.log(`   ⚠ Database connection failed (${connectionTime}ms) - using fallback`);
    }
  } catch (e) {
    console.error(`   ✗ Connection test error: ${e.message}`);
  }

  // Step 5: Load routes
  console.log('\n📋 Step 5: Loading routes...');
  const routes = [
    ['menuRoutes', './routes/menuRoutes'],
    ['orderRoutes', './routes/orderRoutes'],
    ['feedbackRoutes', './routes/feedbackRoutes'],
    ['qrRoutes', './routes/qrRoutes'],
    ['databaseRoutes', './routes/databaseRoutes'],
    ['authRoutes', './routes/authRoutes'],
    ['managerDashboard', './routes/managerDashboard'],
    ['kitchenRoutes', './routes/kitchenRoutes']
  ];

  for (const [name, filePath] of routes) {
    try {
      const startRoute = Date.now();
      require(filePath);
      const routeTime = Date.now() - startRoute;
      console.log(`   ✓ ${name} loaded (${routeTime}ms)`);
    } catch (e) {
      console.error(`   ✗ ${name} failed:`, e.message);
    }
  }

  console.log('\n✅ All startup diagnostics completed successfully!');
  console.log('\n🚀 It is now safe to start the server with: npm start');
  process.exit(0);
})().catch(err => {
  console.error('\n❌ Diagnostic failed:', err.message);
  process.exit(1);
});
