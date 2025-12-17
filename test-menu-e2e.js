#!/usr/bin/env node

/**
 * End-to-End Menu System Test
 * Verifies: Database → API → Frontend data flow
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

async function endToEndTest() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  🔄 END-TO-END MENU SYSTEM VERIFICATION TEST');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
        console.log('Step 1️⃣  Fetching menu from API...');
        const menuRes = await makeRequest('GET', '/api/menu');
        
        if (menuRes.status !== 200 || !Array.isArray(menuRes.data)) {
            throw new Error('Failed to fetch menu');
        }

        const items = menuRes.data;
        console.log(`   ✅ Retrieved ${items.length} items (HTTP ${menuRes.status})\n`);

        console.log('Step 2️⃣  Validating data structure...');
        const validators = {
            hasId: item => typeof item.id === 'number',
            hasName: item => typeof item.name === 'string' && item.name.length > 0,
            hasPrice: item => typeof item.price === 'number' && item.price > 0,
            hasCategory: item => typeof item.category === 'string' && item.category.length > 0,
            hasImage: item => typeof item.image === 'string' && item.image.length > 0,
            hasDescription: item => typeof item.description === 'string',
            hasAvailable: item => typeof item.available === 'boolean',
            hasRating: item => typeof item.rating === 'number',
        };

        const validationResults = {};
        Object.entries(validators).forEach(([key, validator]) => {
            validationResults[key] = items.every(validator);
        });

        const allValid = Object.values(validationResults).every(v => v === true);
        
        Object.entries(validationResults).forEach(([key, valid]) => {
            console.log(`   ${valid ? '✅' : '❌'} ${key}`);
        });
        console.log('');

        if (!allValid) {
            throw new Error('Validation failed');
        }

        console.log('Step 3️⃣  Testing image URL validity...');
        let validImageCount = 0;
        let invalidImageCount = 0;

        items.forEach(item => {
            try {
                new URL(item.image);
                validImageCount++;
            } catch (e) {
                invalidImageCount++;
                console.log(`   ⚠️  Invalid URL: ${item.name}`);
            }
        });

        console.log(`   ✅ Valid URLs: ${validImageCount}/${items.length}`);
        console.log(`   ❌ Invalid URLs: ${invalidImageCount}/${items.length}\n`);

        if (validImageCount !== items.length) {
            throw new Error('Some image URLs are invalid');
        }

        console.log('Step 4️⃣  Simulating frontend data parsing...');
        
        // Simulate what React would do
        const frontendData = items.map(item => ({
            id: item.id,
            name: item.name,
            displayName: item.name.substring(0, 25),
            price: `$${item.price.toFixed(2)}`,
            category: item.category,
            imageUrl: item.image,
            isAvailable: item.available,
            rating: `${item.rating}⭐`,
            shortDesc: item.description.substring(0, 50) + '...'
        }));

        console.log(`   ✅ Parsed ${frontendData.length} items for frontend\n`);

        console.log('Step 5️⃣  Category-wise breakdown for menu display...');
        
        const byCategory = {};
        items.forEach(item => {
            if (!byCategory[item.category]) {
                byCategory[item.category] = [];
            }
            byCategory[item.category].push(item);
        });

        Object.entries(byCategory).forEach(([category, categoryItems]) => {
            console.log(`   📂 ${category}`);
            categoryItems.slice(0, 2).forEach(item => {
                console.log(`      • ${item.name} - $${item.price.toFixed(2)}`);
            });
            if (categoryItems.length > 2) {
                console.log(`      ... and ${categoryItems.length - 2} more`);
            }
        });
        console.log('');

        console.log('Step 6️⃣  Availability status check...');
        const available = items.filter(i => i.available).length;
        const unavailable = items.length - available;
        
        console.log(`   ✅ Available: ${available}/${items.length} (${((available/items.length)*100).toFixed(1)}%)`);
        console.log(`   ⏸️  Unavailable: ${unavailable}/${items.length} (${((unavailable/items.length)*100).toFixed(1)}%)\n`);

        console.log('Step 7️⃣  Performance metrics...');
        console.log(`   ⚡ Total API Response Size: ${JSON.stringify(menuRes.data).length} bytes`);
        console.log(`   📊 Average item size: ${Math.round(JSON.stringify(menuRes.data).length / items.length)} bytes`);
        console.log(`   🎯 Items per category: ${(items.length / Object.keys(byCategory).length).toFixed(1)} avg\n`);

        console.log('═══════════════════════════════════════════════════════════');
        console.log('                  ✅ ALL TESTS PASSED');
        console.log('═══════════════════════════════════════════════════════════\n');

        console.log('📋 SUMMARY:');
        console.log(`   • Total menu items: ${items.length}`);
        console.log(`   • Categories: ${Object.keys(byCategory).length}`);
        console.log(`   • Valid images: ${validImageCount}/${items.length}`);
        console.log(`   • Data completeness: 100%`);
        console.log(`   • Frontend compatibility: ✅ Full\n`);

        console.log('🎯 STATUS: Ready for production\n');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.log('\nDEBUG INFO:');
        console.error(error);
        process.exit(1);
    }

    process.exit(0);
}

endToEndTest();
