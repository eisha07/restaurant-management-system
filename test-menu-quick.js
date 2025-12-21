#!/usr/bin/env node
/**
 * Quick Menu Test - Verify menu items are loaded
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const client = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
});

async function testMenu() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║       MENU ITEMS TEST                  ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    console.log('📡 Fetching menu items from:', `${API_BASE}/menu`);
    const response = await client.get('/menu');
    const items = response.data;

    if (!Array.isArray(items)) {
      throw new Error('Response is not an array');
    }

    console.log(`\n✅ Success! Loaded ${items.length} menu items\n`);
    console.log('Sample items:\n');

    items.slice(0, 5).forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.name}`);
      console.log(`   Price: $${item.price}`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Available: ${item.available ? '✓' : '✗'}`);
      console.log();
    });

    if (items.length > 5) {
      console.log(`... and ${items.length - 5} more items\n`);
    }

    console.log(`📊 Statistics:`);
    console.log(`   Total Items: ${items.length}`);
    
    const categories = [...new Set(items.map(i => i.category))];
    console.log(`   Categories: ${categories.length}`);
    categories.forEach(cat => {
      const count = items.filter(i => i.category === cat).length;
      console.log(`      - ${cat}: ${count} items`);
    });

    // Validate images point to our local assets (no placeholders)
    const badImages = items
      .filter(i => !i.image || /placeholder\.com/i.test(i.image) || !/\/images\//i.test(i.image));

    if (badImages.length) {
      console.error('❌ Some items have missing/placeholder images:');
      badImages.slice(0, 5).forEach(i => console.error(` - ${i.name}: ${i.image}`));
      throw new Error(`Found ${badImages.length} items without proper /images/ URLs`);
    }

    console.log(`\n✅ MENU LOADED SUCCESSFULLY with valid images!\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testMenu();
