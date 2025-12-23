#!/usr/bin/env node

/**
 * Simplified test to check menu items and image URLs
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

async function testMenu() {
    console.log('🍽️ Menu Items and Images Test\n');

    try {
        console.log('📋 Fetching all menu items...');
        const res = await makeRequest('GET', '/api/menu');
        
        console.log(`Status: ${res.status}`);
        console.log(`Total items: ${res.data.length}\n`);

        if (res.data.length > 0) {
            console.log('📊 Sample Items:\n');
            
            // Show first 5 items
            res.data.slice(0, 5).forEach((item, idx) => {
                console.log(`${idx + 1}. ${item.name}`);
                console.log(`   ID: ${item.id}`);
                console.log(`   Price: $${item.price}`);
                console.log(`   Category: ${item.category}`);
                console.log(`   Available: ${item.available}`);
                console.log(`   Rating: ${item.rating}`);
                console.log(`   Image URL: ${item.image ? item.image.substring(0, 70) : 'NO IMAGE'}${item.image?.length > 70 ? '...' : ''}`);
                console.log(`   Description: ${item.description.substring(0, 60)}...`);
                console.log('');
            });

            // Count by category
            const byCategory = {};
            res.data.forEach(item => {
                byCategory[item.category] = (byCategory[item.category] || 0) + 1;
            });

            console.log('📊 Distribution by Category:');
            Object.entries(byCategory).forEach(([cat, count]) => {
                console.log(`   ${cat}: ${count} items`);
            });

            // Check images
            console.log('\n🖼️ Image URL Analysis:');
            let hasImages = 0;
            let missingImages = 0;
            let placeholderImages = 0;

            res.data.forEach(item => {
                if (item.image) {
                    hasImages++;
                    if (item.image.includes('placeholder')) {
                        placeholderImages++;
                    }
                } else {
                    missingImages++;
                }
            });

            console.log(`   ✅ With images: ${hasImages}`);
            console.log(`   ❌ Missing images: ${missingImages}`);
            console.log(`   📋 Using placeholder: ${placeholderImages}`);

            console.log('\n✅ All menu items fetched successfully!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

testMenu();
