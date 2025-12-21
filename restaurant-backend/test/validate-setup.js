#!/usr/bin/env node

/**
 * Test Configuration Validation Script
 * Verifies that all test files and dependencies are correctly set up
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Restaurant Management System - Test Configuration Validator\n');
console.log('=' .repeat(60));

let allChecks = true;

// Check 1: Test directory exists
console.log('\n✓ Checking test directory structure...');
const testDir = path.join(__dirname);
const requiredFiles = [
  'mocha.config.js',
  'helpers.js',
  'api.test.js',
  'business.test.js',
  'auth-security.test.js',
  'integration.test.js',
  'README.md',
  'TEST_SUMMARY.md',
  'QUICK_START.md'
];

requiredFiles.forEach(file => {
  const filePath = path.join(testDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${file} exists`);
  } else {
    console.log(`  ✗ ${file} MISSING`);
    allChecks = false;
  }
});

// Check 2: Verify package.json has test scripts
console.log('\n✓ Checking package.json test scripts...');
try {
  const packagePath = path.join(testDir, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (pkg.scripts.test) {
    console.log(`  ✓ "test" script: ${pkg.scripts.test}`);
  } else {
    console.log('  ✗ "test" script not found');
    allChecks = false;
  }
  
  if (pkg.scripts['test:watch']) {
    console.log(`  ✓ "test:watch" script found`);
  } else {
    console.log('  ✗ "test:watch" script not found');
    allChecks = false;
  }
  
  if (pkg.scripts['test:coverage']) {
    console.log(`  ✓ "test:coverage" script found`);
  } else {
    console.log('  ✗ "test:coverage" script not found');
    allChecks = false;
  }
} catch (error) {
  console.log(`  ✗ Error reading package.json: ${error.message}`);
  allChecks = false;
}

// Check 3: Verify test dev dependencies
console.log('\n✓ Checking dev dependencies...');
try {
  const packagePath = path.join(testDir, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredDeps = ['mocha', 'chai', 'nyc', 'sinon'];
  requiredDeps.forEach(dep => {
    if (pkg.devDependencies[dep]) {
      console.log(`  ✓ ${dep}: ${pkg.devDependencies[dep]}`);
    } else {
      console.log(`  ✗ ${dep} not found in devDependencies`);
      allChecks = false;
    }
  });
} catch (error) {
  console.log(`  ✗ Error reading package.json: ${error.message}`);
  allChecks = false;
}

// Check 4: Count test cases
console.log('\n✓ Counting test cases...');
try {
  let testCount = 0;
  
  ['api.test.js', 'business.test.js', 'auth-security.test.js', 'integration.test.js'].forEach(file => {
    const content = fs.readFileSync(path.join(testDir, file), 'utf8');
    const matches = content.match(/it\(/g);
    const count = matches ? matches.length : 0;
    testCount += count;
    console.log(`  ✓ ${file}: ${count} tests`);
  });
  
  console.log(`\n  📊 Total: ${testCount} verifiable tests`);
  
  if (testCount < 40) {
    console.log(`  ⚠ Warning: Expected 40+ tests, found ${testCount}`);
  }
} catch (error) {
  console.log(`  ✗ Error counting tests: ${error.message}`);
  allChecks = false;
}

// Check 5: Verify nyc configuration
console.log('\n✓ Checking coverage configuration...');
const nycPath = path.join(testDir, '..', '.nycrc.json');
if (fs.existsSync(nycPath)) {
  console.log('  ✓ .nycrc.json exists');
} else {
  console.log('  ✗ .nycrc.json not found');
  allChecks = false;
}

// Check 6: Verify mock data
console.log('\n✓ Checking mock data...');
try {
  const helperContent = fs.readFileSync(path.join(testDir, 'helpers.js'), 'utf8');
  const mockDataObjects = ['menuItem', 'order', 'customer', 'feedback', 'payment', 'table'];
  
  mockDataObjects.forEach(obj => {
    if (helperContent.includes(`${obj}:`)) {
      console.log(`  ✓ Mock data: ${obj}`);
    } else {
      console.log(`  ✗ Mock data: ${obj} not found`);
      allChecks = false;
    }
  });
} catch (error) {
  console.log(`  ✗ Error reading helpers.js: ${error.message}`);
  allChecks = false;
}

// Final summary
console.log('\n' + '='.repeat(60));
if (allChecks) {
  console.log('\n✅ All checks passed! Test suite is ready to use.\n');
  console.log('Quick start:');
  console.log('  1. cd restaurant-backend');
  console.log('  2. npm install');
  console.log('  3. npm test\n');
} else {
  console.log('\n⚠️  Some checks failed. Please review the issues above.\n');
}
console.log('=' .repeat(60) + '\n');

process.exit(allChecks ? 0 : 1);
