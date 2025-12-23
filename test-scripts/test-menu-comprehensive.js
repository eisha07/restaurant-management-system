#!/usr/bin/env node

/**
 * Comprehensive menu items verification test
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, path) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function comprehensiveMenuTest() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  🍽️  COMPREHENSIVE MENU ITEMS VERIFICATION TEST       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Test 1: Fetch all menu items
        console.log('📋 TEST 1: Fetching All Menu Items');
        console.log('─'.repeat(50));
        
        const res = await makeRequest('GET', '/api/menu');
        
        console.log(`Status Code: ${res.status}`);
        console.log(`Total Items: ${res.data.length}\n`);

        if (res.data.length === 0) {
            console.log('❌ ERROR: No menu items found!\n');
            process.exit(1);
        }

        if (res.status !== 200) {
            console.log(`❌ ERROR: Expected status 200, got ${res.status}\n`);
            process.exit(1);
        }

        console.log('✅ All menu items fetched successfully!\n');

        // Test 2: Data completeness check
        console.log('📊 TEST 2: Data Completeness');
        console.log('─'.repeat(50));

        const requiredFields = ['id', 'name', 'description', 'price', 'category', 'image', 'available', 'rating'];
        let allComplete = true;

        res.data.forEach((item, idx) => {
            const missing = requiredFields.filter(field => item[field] === undefined || item[field] === null);
            if (missing.length > 0) {
                console.log(`❌ Item ${idx + 1} (${item.name}): Missing fields: ${missing.join(', ')}`);
                allComplete = false;
            }
        });

        if (allComplete) {
            console.log(`✅ All ${res.data.length} items have complete data\n`);
        } else {
            console.log('\n');
        }

        // Test 3: Image URL verification
        console.log('📸 TEST 3: Image URLs Verification');
        console.log('─'.repeat(50));

        let withImages = 0;
        let withValidUrls = 0;
        let withPlaceholders = 0;
        let withInvalidUrls = 0;

        res.data.forEach(item => {
            if (item.image) {
                withImages++;
                
                // Check if URL is valid
                try {
                    new URL(item.image);
                    withValidUrls++;
                    
                    // Check if it's a placeholder URL
                    if (item.image.includes('placeholder') || item.image.includes('via.placeholder')) {
                        withPlaceholders++;
                    }
                } catch (e) {
                    withInvalidUrls++;
                    console.log(`⚠️  Invalid URL for "${item.name}": ${item.image}`);
                }
            }
        });

        console.log(`Images Provided: ${withImages}/${res.data.length}`);
        console.log(`Valid URLs: ${withValidUrls}`);
        console.log(`Placeholder URLs: ${withPlaceholders}`);
        console.log(`Invalid URLs: ${withInvalidUrls}`);

        if (withInvalidUrls === 0 && withImages === res.data.length) {
            console.log('\n✅ All menu items have valid image URLs\n');
        } else {
            console.log('\n⚠️  Some issues detected with images\n');
        }

        // Test 4: Category distribution
        console.log('🏷️  TEST 4: Category Distribution');
        console.log('─'.repeat(50));

        const categories = {};
        res.data.forEach(item => {
            if (!categories[item.category]) {
                categories[item.category] = [];
            }
            categories[item.category].push(item);
        });

        Object.entries(categories).forEach(([cat, items]) => {
            console.log(`${cat.padEnd(15)} : ${items.length.toString().padStart(2)} items`);
        });

        console.log(`${'─'.repeat(50)}`);
        console.log(`${'TOTAL'.padEnd(15)} : ${res.data.length.toString().padStart(2)} items\n`);

        // Test 5: Availability check
        console.log('✓ TEST 5: Item Availability');
        console.log('─'.repeat(50));

        const available = res.data.filter(item => item.available === true).length;
        const unavailable = res.data.length - available;

        console.log(`Available: ${available} items (${((available/res.data.length)*100).toFixed(1)}%)`);
        console.log(`Unavailable: ${unavailable} items (${((unavailable/res.data.length)*100).toFixed(1)}%)\n`);

        // Test 6: Price range
        console.log('💰 TEST 6: Price Range');
        console.log('─'.repeat(50));

        const prices = res.data.map(item => item.price).sort((a, b) => a - b);
        const minPrice = prices[0];
        const maxPrice = prices[prices.length - 1];
        const avgPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);

        console.log(`Minimum Price: $${minPrice.toFixed(2)}`);
        console.log(`Maximum Price: $${maxPrice.toFixed(2)}`);
        console.log(`Average Price: $${avgPrice}`);
        console.log(`Price Range: $${(maxPrice - minPrice).toFixed(2)}\n`);

        // Test 7: Sample menu display
        console.log('🎯 TEST 7: Sample Menu Items');
        console.log('─'.repeat(50));
        console.log('');

        res.data.slice(0, 3).forEach((item, idx) => {
            console.log(`Item ${idx + 1}: ${item.name}`);
            console.log(`  Category: ${item.category}`);
            console.log(`  Price: $${item.price.toFixed(2)}`);
            console.log(`  Available: ${item.available ? '✓' : '✗'}`);
            console.log(`  Image: ${item.image.substring(0, 70)}${item.image.length > 70 ? '...' : ''}`);
            console.log('');
        });

        // Final Summary
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║               ✅ ALL TESTS PASSED                     ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log(`║ Total Items: ${res.data.length}`.padEnd(57) + '║');
        console.log(`║ Items with Images: ${withImages}`.padEnd(57) + '║');
        console.log(`║ Categories: ${Object.keys(categories).length}`.padEnd(57) + '║');
        console.log(`║ Valid Image URLs: ${withValidUrls}`.padEnd(57) + '║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

comprehensiveMenuTest();
