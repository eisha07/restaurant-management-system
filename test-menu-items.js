#!/usr/bin/env node

// New menu items test: fetch /api/menu, assert shape, and ensure images use local /images assets.

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:5000/api';
const client = axios.create({ baseURL: API_BASE, timeout: 5000 });

const requiredFields = ['id', 'name', 'description', 'price', 'category', 'image', 'available'];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function run() {
  console.log('\n╔════════════════════════════════════╗');
  console.log('║     MENU ITEMS VALIDATION          ║');
  console.log('╚════════════════════════════════════╝\n');

  console.log('Base:', API_BASE);

  // Health check
  const health = await client.get('/health').catch(err => err.response || err);
  assert(health.status === 200, 'Health check failed');
  console.log('✅ Health check OK');

  // Fetch menu
  const res = await client.get('/menu');
  assert(Array.isArray(res.data), 'Menu response is not an array');
  assert(res.data.length > 0, 'Menu is empty');
  console.log(`✅ Fetched ${res.data.length} items`);

  // Validate each item
  const badShape = [];
  const badImages = [];
  for (const item of res.data) {
    for (const field of requiredFields) {
      if (item[field] === undefined || item[field] === null) {
        badShape.push({ name: item.name, field });
      }
    }
    const img = item.image || '';
    const hasImagesPath = /\/images\//i.test(img);
    const hasPlaceholder = /placeholder\.com/i.test(img);
    if (!hasImagesPath || hasPlaceholder) {
      badImages.push({ name: item.name, image: img });
    }
  }

  assert(badShape.length === 0, `Missing fields: ${JSON.stringify(badShape.slice(0, 5))}`);
  assert(badImages.length === 0, `Invalid images: ${JSON.stringify(badImages.slice(0, 5))}`);

  // Category coverage summary
  const categories = res.data.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});
  console.log('\n📊 Categories:');
  Object.entries(categories).forEach(([cat, count]) => console.log(` - ${cat}: ${count}`));

  // Sample output
  console.log('\nSample items:');
  res.data.slice(0, 5).forEach((i, idx) => {
    console.log(`${idx + 1}. ${i.name} | ${i.category} | $${i.price} | ${i.available ? 'available' : 'unavailable'}`);
    console.log(`   image: ${i.image}`);
  });

  console.log('\n✅ Menu items test passed with valid images and shape.');
}

run().catch(err => {
  console.error('\n❌ Menu items test failed');
  if (err.response) {
    console.error('Status:', err.response.status);
    console.error('Data:', err.response.data);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});
