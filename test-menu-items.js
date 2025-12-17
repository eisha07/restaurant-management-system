#!/usr/bin/env node

/**
 * Test script to verify all menu items are fetched and images are accessible
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const protocol = url.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = protocol.request(options, (res) => {
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

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

function testImageUrl(url) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;
        const parsedUrl = new URL(url);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'HEAD',
            timeout: 3000
        };

        const req = protocol.request(options, (res) => {
            resolve({
                accessible: res.statusCode >= 200 && res.statusCode < 400,
                statusCode: res.statusCode
            });
        });

        req.on('error', () => resolve({ accessible: false, statusCode: 'ERROR' }));
        req.on('timeout', () => {
            req.destroy();
            resolve({ accessible: false, statusCode: 'TIMEOUT' });
        });

        req.end();
    });
}

async function testMenuFetching() {
    console.log('🍽️ Testing Menu Items Fetching and Image Rendering\n');
    console.log('Base URL:', BASE_URL);
    console.log('-------------------------------------------\n');

    try {
        // Test 1: Fetch all menu items
        console.log('📋 Test 1: Fetching all menu items...');
        const menuRes = await makeRequest('GET', '/api/menu');
        console.log('Status:', menuRes.status);
        console.log('Total items fetched:', Array.isArray(menuRes.data) ? menuRes.data.length : 0);

        if (Array.isArray(menuRes.data) && menuRes.data.length > 0) {
            console.log('\n✅ Menu items fetched successfully!\n');

            // Group by category
            const categories = {};
            menuRes.data.forEach(item => {
                if (!categories[item.category]) {
                    categories[item.category] = [];
                }
                categories[item.category].push(item);
            });

            console.log('📊 Items by Category:');
            Object.entries(categories).forEach(([category, items]) => {
                console.log(`   ${category}: ${items.length} items`);
            });

            // Test 2: Check image URLs
            console.log('\n📸 Test 2: Checking image accessibility...\n');
            
            let imageCheckResults = {
                accessible: 0,
                inaccessible: 0,
                timeout: 0
            };

            // Sample items to check (first 5 + 5 random)
            const itemsToCheck = menuRes.data.slice(0, 5);
            const randomIndices = new Set();
            while (randomIndices.size < Math.min(5, menuRes.data.length - 5)) {
                randomIndices.add(Math.floor(Math.random() * menuRes.data.length));
            }
            randomIndices.forEach(idx => {
                if (idx >= 5) {
                    itemsToCheck.push(menuRes.data[idx]);
                }
            });

            console.log(`Testing ${itemsToCheck.length} sample items:\n`);

            for (const item of itemsToCheck) {
                if (!item.image) {
                    console.log(`⚠️  ${item.name}: No image URL provided`);
                    continue;
                }

                const imageResult = await testImageUrl(item.image);
                const status = imageResult.accessible ? '✅' : '❌';
                const statusCode = imageResult.statusCode;
                
                console.log(`${status} ${item.name}`);
                console.log(`   URL: ${item.image}`);
                console.log(`   Status: ${statusCode}`);
                
                if (imageResult.accessible) {
                    imageCheckResults.accessible++;
                } else if (statusCode === 'TIMEOUT') {
                    imageCheckResults.timeout++;
                } else {
                    imageCheckResults.inaccessible++;
                }
                console.log('');
            }

            // Summary
            console.log('-------------------------------------------');
            console.log('📊 Image Accessibility Summary:');
            console.log(`   ✅ Accessible: ${imageCheckResults.accessible}`);
            console.log(`   ❌ Inaccessible: ${imageCheckResults.inaccessible}`);
            console.log(`   ⏱️  Timeout: ${imageCheckResults.timeout}`);

            // Test 3: Verify data structure
            console.log('\n-------------------------------------------');
            console.log('✔️ Test 3: Verifying data structure...\n');
            
            const firstItem = menuRes.data[0];
            const requiredFields = ['id', 'name', 'description', 'price', 'category', 'image', 'available', 'rating'];
            const missingFields = [];

            requiredFields.forEach(field => {
                if (firstItem[field] === undefined) {
                    missingFields.push(field);
                }
            });

            if (missingFields.length === 0) {
                console.log('✅ All required fields present in menu items:');
                requiredFields.forEach(field => {
                    const value = firstItem[field];
                    const displayValue = typeof value === 'string' ? value.substring(0, 50) : value;
                    console.log(`   • ${field}: ${displayValue}`);
                });
            } else {
                console.log('❌ Missing fields:', missingFields.join(', '));
            }

            // Test 4: Get items by category
            console.log('\n-------------------------------------------');
            console.log('📂 Test 4: Testing category-based fetching...\n');
            
            const categories_list = Object.keys(categories).slice(0, 2);
            for (const category of categories_list) {
                const categoryRes = await makeRequest('GET', `/api/menu?category=${encodeURIComponent(category)}`);
                console.log(`${category}: Fetched ${Array.isArray(categoryRes.data) ? categoryRes.data.length : 0} items`);
            }

        } else {
            console.log('⚠️ No menu items found!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    console.log('\n-------------------------------------------');
    console.log('✅ Test completed!');
}

// Wait for servers to be ready, then run tests
setTimeout(testMenuFetching, 1000);
