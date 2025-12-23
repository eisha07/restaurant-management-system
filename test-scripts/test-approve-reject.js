#!/usr/bin/env node

/**
 * Test script to verify approve/reject order functionality
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

async function testApproveReject() {
    console.log('🧪 Testing Approve/Reject Order Functionality\n');
    console.log('Base URL:', BASE_URL);
    console.log('-------------------------------------------\n');

    try {
        // Test 1: Get pending orders
        console.log('📋 Test 1: Fetching pending orders...');
        const pendingRes = await makeRequest('GET', '/api/manager/orders/pending');
        console.log('Status:', pendingRes.status);
        console.log('Response:', JSON.stringify(pendingRes.data, null, 2));
        
        if (pendingRes.data.orders && pendingRes.data.orders.length > 0) {
            const orderId = pendingRes.data.orders[0].id;
            console.log(`\n✅ Found pending order: ${orderId}\n`);

            // Test 2: Approve order
            console.log('✏️ Test 2: Approving order...');
            const approveRes = await makeRequest('PUT', `/api/manager/orders/${orderId}/approve`, {
                expectedCompletion: 30
            });
            console.log('Status:', approveRes.status);
            console.log('Response:', JSON.stringify(approveRes.data, null, 2));

            // Test 3: Try approve with PATCH
            console.log('\n✏️ Test 3: Approving with PATCH method...');
            const approvePatchRes = await makeRequest('PATCH', `/api/manager/orders/${orderId}/approve`, {
                expectedCompletion: 30
            });
            console.log('Status:', approvePatchRes.status);
            console.log('Response:', JSON.stringify(approvePatchRes.data, null, 2));

            // Test 4: Reject order  
            console.log('\n✏️ Test 4: Rejecting order...');
            const rejectRes = await makeRequest('PUT', `/api/manager/orders/${orderId}/reject`, {
                reason: 'Out of ingredients'
            });
            console.log('Status:', rejectRes.status);
            console.log('Response:', JSON.stringify(rejectRes.data, null, 2));

        } else {
            console.log('ℹ️ No pending orders found. Creating a test order first...');
            
            // Create a test order
            const orderRes = await makeRequest('POST', '/api/orders', {
                customerSessionId: 'test-session-' + Date.now(),
                paymentMethod: 'Cash',
                items: [
                    { menuItemId: 1, quantity: 1 }
                ]
            });
            
            if (orderRes.status === 201 || orderRes.status === 200) {
                const newOrderId = orderRes.data.orderId || orderRes.data.order_id;
                console.log(`✅ Created test order: ${newOrderId}\n`);

                // Now test approve
                console.log('✏️ Testing approve on new order...');
                const approveRes = await makeRequest('PUT', `/api/manager/orders/${newOrderId}/approve`, {
                    expectedCompletion: 30
                });
                console.log('Status:', approveRes.status);
                console.log('Response:', JSON.stringify(approveRes.data, null, 2));
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    console.log('\n-------------------------------------------');
    console.log('✅ Test completed!');
}

// Wait a moment for servers to be ready, then run tests
setTimeout(testApproveReject, 2000);
