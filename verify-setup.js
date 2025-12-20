#!/usr/bin/env node
/**
 * Setup Verification Script
 * Checks if all necessary dependencies and configurations are in place
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const projectRoot = __dirname;
const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

const log = (status, message) => {
  let color = colors.reset;
  let symbol = '';

  switch (status) {
    case 'pass':
      color = colors.green;
      symbol = '✓';
      checks.passed++;
      break;
    case 'fail':
      color = colors.red;
      symbol = '✗';
      checks.failed++;
      break;
    case 'warn':
      color = colors.yellow;
      symbol = '⚠';
      checks.warnings++;
      break;
    case 'info':
      color = colors.blue;
      symbol = 'ℹ';
      break;
  }

  console.log(`${color}${symbol}${colors.reset} ${message}`);
};

console.clear();
console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
console.log(`${colors.blue}Setup Verification${colors.reset}`);
console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);

// Check Node.js
log('info', 'Checking Node.js installation...');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  log('pass', `Node.js ${nodeVersion} is installed`);
} catch {
  log('fail', 'Node.js is not installed. Download from https://nodejs.org/');
}

// Check npm
log('info', 'Checking npm installation...');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  log('pass', `npm ${npmVersion} is installed`);
} catch {
  log('fail', 'npm is not installed');
}

// Check project directories
log('info', '\nChecking project structure...');
const dirs = ['frontend', 'restaurant-backend'];
dirs.forEach((dir) => {
  const dirPath = path.join(projectRoot, dir);
  if (fs.existsSync(dirPath)) {
    log('pass', `${dir}/ directory exists`);
  } else {
    log('fail', `${dir}/ directory not found`);
  }
});

// Check package.json files
log('info', '\nChecking package.json files...');
const packageJsons = [
  path.join(projectRoot, 'package.json'),
  path.join(projectRoot, 'frontend', 'package.json'),
  path.join(projectRoot, 'restaurant-backend', 'package.json'),
];

packageJsons.forEach((file) => {
  if (fs.existsSync(file)) {
    log('pass', `${path.relative(projectRoot, file)}`);
  } else {
    log('fail', `${path.relative(projectRoot, file)} not found`);
  }
});

// Check node_modules
log('info', '\nChecking dependencies installation...');
const nodeModules = [
  { path: path.join(projectRoot, 'restaurant-backend', 'node_modules'), name: 'Backend' },
  { path: path.join(projectRoot, 'frontend', 'node_modules'), name: 'Frontend' },
];

nodeModules.forEach(({ path: modPath, name }) => {
  if (fs.existsSync(modPath)) {
    log('pass', `${name} dependencies installed`);
  } else {
    log('warn', `${name} dependencies not installed. Run: npm run install:all`);
  }
});

// Check .env files
log('info', '\nChecking environment files...');
const envFiles = [
  { path: path.join(projectRoot, 'restaurant-backend', '.env'), name: 'Backend .env' },
  { path: path.join(projectRoot, 'frontend', '.env'), name: 'Frontend .env' },
];

envFiles.forEach(({ path: envPath, name }) => {
  if (fs.existsSync(envPath)) {
    log('pass', `${name} exists`);
  } else {
    log('warn', `${name} not found. Some features may not work.`);
  }
});

// Check startup scripts
log('info', '\nChecking startup scripts...');
const scripts = [
  { path: path.join(projectRoot, 'start-all.js'), name: 'start-all.js' },
  { path: path.join(projectRoot, 'start-all.bat'), name: 'start-all.bat' },
  { path: path.join(projectRoot, 'start-all.sh'), name: 'start-all.sh' },
];

scripts.forEach(({ path: scriptPath, name }) => {
  if (fs.existsSync(scriptPath)) {
    log('pass', `${name} exists`);
  } else {
    log('warn', `${name} not found`);
  }
});

// Check API service files
log('info', '\nChecking API integration files...');
const apiFiles = [
  path.join(projectRoot, 'frontend', 'src', 'services', 'api.ts'),
  path.join(projectRoot, 'frontend', 'src', 'services', 'socket.ts'),
  path.join(projectRoot, 'frontend', 'src', 'hooks', 'useMenu.ts'),
  path.join(projectRoot, 'frontend', 'src', 'hooks', 'useOrders.ts'),
];

apiFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    log('pass', `${path.relative(projectRoot, file)}`);
  } else {
    log('fail', `${path.relative(projectRoot, file)} not found`);
  }
});

// Check documentation
log('info', '\nChecking documentation...');
const docFiles = [
  path.join(projectRoot, 'API_INTEGRATION_GUIDE.md'),
  path.join(projectRoot, 'README.md'),
];

docFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    log('pass', `${path.basename(file)} exists`);
  } else {
    log('warn', `${path.basename(file)} not found`);
  }
});

// Summary
console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
console.log(`${colors.green}Passed: ${checks.passed}${colors.reset}`);
if (checks.warnings > 0) {
  console.log(`${colors.yellow}Warnings: ${checks.warnings}${colors.reset}`);
}
if (checks.failed > 0) {
  console.log(`${colors.red}Failed: ${checks.failed}${colors.reset}`);
}
console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);

if (checks.failed > 0) {
  log('fail', 'Please fix the above errors before running the application');
  process.exit(1);
}

if (checks.warnings > 0) {
  log('warn', 'Some optional components are missing. The app may not work fully.');
  console.log(`\nTo complete setup:\n`);
  console.log(`1. Install all dependencies:\n   npm run install:all\n`);
  console.log(`2. Start all services:\n   npm run start:all\n`);
}

log('info', '\n✅ Setup verification complete!');
log('info', '\nNext steps:');
log('info', '1. npm run install:all    (if not done)');
log('info', '2. npm run start:all      (to start frontend and backend)');
log('info', '3. Open http://localhost:5173 in your browser');
