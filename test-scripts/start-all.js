#!/usr/bin/env node
/**
 * Unified Startup Script
 * Starts both Frontend and Backend servers with a single command
 * 
 * Usage:
 *   On Windows: node start-all.js
 *   On macOS/Linux: node start-all.js
 * 
 * Requirements:
 *   - Node.js installed
 *   - npm dependencies installed in both frontend and restaurant-backend folders
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';
const projectRoot = __dirname;
const backendPath = path.join(projectRoot, 'restaurant-backend');
const frontendPath = path.join(projectRoot, 'frontend');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = (color, prefix, message) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(
    `${color}[${timestamp}] ${prefix}${colors.reset} ${message}`
  );
};

const processes = [];
let isShuttingDown = false;

// Handle graceful shutdown
const shutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log(colors.yellow, '🛑', 'Shutting down servers...');

  processes.forEach((proc, index) => {
    log(colors.yellow, '⏹️', `Stopping process ${index + 1}...`);
    proc.kill('SIGTERM');
  });

  setTimeout(() => {
    log(colors.yellow, '⏹️', 'Force killing processes...');
    processes.forEach((proc) => {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    });
    process.exit(0);
  }, 5000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start Backend
const startBackend = () => {
  return new Promise((resolve) => {
    log(colors.blue, '📦', 'Starting Backend Server...');
    log(colors.cyan, 'ℹ️', `Backend path: ${backendPath}`);
    log(colors.cyan, 'ℹ️', 'Backend will run on: http://localhost:5000');

    const backendCmd = isWindows ? 'npm.cmd' : 'npm';
    const backend = spawn(backendCmd, ['run', 'dev'], {
      cwd: backendPath,
      stdio: 'inherit',
      shell: true,
    });

    backend.on('error', (err) => {
      log(colors.red, '❌', `Backend error: ${err.message}`);
    });

    backend.on('exit', (code) => {
      if (!isShuttingDown) {
        log(colors.red, '❌', `Backend exited with code ${code}`);
      }
    });

    processes.push(backend);
    setTimeout(() => resolve(), 3000); // Give backend time to start
  });
};

// Start Frontend
const startFrontend = () => {
  log(colors.blue, '⚛️', 'Starting Frontend Server...');
  log(colors.cyan, 'ℹ️', `Frontend path: ${frontendPath}`);
  log(colors.cyan, 'ℹ️', 'Frontend will run on: http://localhost:5173');

  const frontendCmd = isWindows ? 'npm.cmd' : 'npm';
  const frontend = spawn(frontendCmd, ['run', 'dev'], {
    cwd: frontendPath,
    stdio: 'inherit',
    shell: true,
  });

  frontend.on('error', (err) => {
    log(colors.red, '❌', `Frontend error: ${err.message}`);
  });

  frontend.on('exit', (code) => {
    if (!isShuttingDown) {
      log(colors.red, '❌', `Frontend exited with code ${code}`);
    }
  });

  processes.push(frontend);
};

// Main startup sequence
const startAll = async () => {
  console.clear();
  log(colors.green, '🚀', '================================');
  log(colors.green, '🚀', 'Restaurant Management System');
  log(colors.green, '🚀', '================================\n');

  try {
    // Start backend first
    await startBackend();

    // Start frontend
    startFrontend();

    log(colors.green, '✅', '================================');
    log(colors.green, '✅', 'Both servers started successfully!');
    log(colors.green, '✅', '================================\n');

    log(colors.cyan, 'ℹ️', 'Backend API: http://localhost:5000/api');
    log(colors.cyan, 'ℹ️', 'Frontend: http://localhost:5173');
    log(colors.cyan, 'ℹ️', 'Health Check: http://localhost:5000/api/health\n');

    log(colors.yellow, '⚠️', 'Press Ctrl+C to stop all servers');
    log(colors.yellow, '⚠️', 'Check the output above for any errors\n');
  } catch (err) {
    log(colors.red, '❌', `Failed to start servers: ${err.message}`);
    process.exit(1);
  }
};

// Check if dependencies are installed
const checkDependencies = () => {
  const fs = require('fs');

  const backendNodeModules = path.join(backendPath, 'node_modules');
  const frontendNodeModules = path.join(frontendPath, 'node_modules');

  const missingDeps = [];

  if (!fs.existsSync(backendNodeModules)) {
    missingDeps.push('backend');
  }

  if (!fs.existsSync(frontendNodeModules)) {
    missingDeps.push('frontend');
  }

  if (missingDeps.length > 0) {
    log(colors.red, '❌', '================================');
    log(colors.red, '❌', 'Missing node_modules!');
    log(colors.red, '❌', '================================\n');

    missingDeps.forEach((dep) => {
      const depPath = dep === 'backend' ? backendPath : frontendPath;
      log(colors.yellow, '⚠️', `To install ${dep} dependencies:`);
      log(colors.cyan, 'ℹ️', `cd ${depPath}`);
      log(colors.cyan, 'ℹ️', 'npm install\n');
    });

    process.exit(1);
  }
};

// Start the application
checkDependencies();
startAll();
