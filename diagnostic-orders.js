#!/usr/bin/env node

/**
 * Diagnostic Test for Order Approval/Rejection Issues
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, path, data = null, token = null) {
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

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body, headers: res.headers });
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

async function diagnosticTest() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🔍 ORDER APPROVAL/REJECTION DIAGNOSTIC TEST            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        // Step 1: Create a test order
        console.log('STEP 1: Create Test Order');
        console.log('─'.repeat(60));

        const orderRes = await makeRequest('POST', '/api/orders', {
            customerSessionId: 'diag-session-' + Date.now(),
            paymentMethod: 'Cash',
            items: [
                { menuItemId: 1, quantity: 1, specialInstructions: 'Test order' }
            ]
        });

        console.log(`Status: ${orderRes.status}`);
        console.log(`Response:`, JSON.stringify(orderRes.data, null, 2));

        if (orderRes.status !== 201 && orderRes.status !== 200) {
            throw new Error(`Failed to create order: ${orderRes.status}`);
        }

        const orderId = orderRes.data.orderId || orderRes.data.order_id;
        console.log(`✅ Order Created: ID ${orderId}\n`);

        // Step 2: Fetch pending orders (without token - dev mode)
        console.log('STEP 2: Fetch Pending Orders (Dev Mode - No Token)');
        console.log('─'.repeat(60));

        const pendingRes = await makeRequest('GET', '/api/manager/orders/pending');

        console.log(`Status: ${pendingRes.status}`);
        console.log(`Response Count: ${pendingRes.data.count}`);
        console.log(`Orders Found: ${pendingRes.data.orders?.length || 0}`);

        if (pendingRes.data.orders && pendingRes.data.orders.length > 0) {
            console.log(`\nPending Orders:`);
            pendingRes.data.orders.forEach((o, i) => {
                console.log(`  ${i + 1}. Order ${o.id} - ${o.status}`);
            });
        } else {
            console.log('⚠️  No pending orders found!');
        }
        console.log('');

        // Step 3: Try to approve with GET first (to see what happens)
        console.log('STEP 3: Try Approve Order (PUT method)');
        console.log('─'.repeat(60));

        const approveRes = await makeRequest('PUT', `/api/manager/orders/${orderId}/approve`, {
            expectedCompletion: 30
        });

        console.log(`Status: ${approveRes.status}`);
        console.log(`Response:`, JSON.stringify(approveRes.data, null, 2));

        if (approveRes.status === 200) {
            console.log('✅ Order Approved Successfully\n');
        } else {
            console.log(`❌ Approval Failed with status ${approveRes.status}\n`);
        }

        // Step 4: Check order status after approval
        console.log('STEP 4: Check Order Status After Approval');
        console.log('─'.repeat(60));

        const checkRes = await makeRequest('GET', `/api/manager/orders/${orderId}`);

        console.log(`Status: ${checkRes.status}`);
        console.log(`Order Status:`, JSON.stringify(checkRes.data, null, 2));
        console.log('');

        // Step 5: Check database directly
        console.log('STEP 5: Database Query Check');
        console.log('─'.repeat(60));

        const db = require('./restaurant-backend/config/database');
        const dbResult = await db.sequelize.query(
            'SELECT order_id, order_number, order_status_id, kitchen_status_id FROM orders WHERE order_id = $1',
            { bind: [orderId], type: db.sequelize.QueryTypes.SELECT }
        );

        console.log('Database Order Record:');
        console.log(JSON.stringify(dbResult, null, 2));
        console.log('');

        // Step 6: Check status tables
        console.log('STEP 6: Order Status ID Mapping');
        console.log('─'.repeat(60));

        const statusRes = await db.sequelize.query(
            'SELECT status_id, name FROM order_statuses ORDER BY status_id',
            { type: db.sequelize.QueryTypes.SELECT }
        );

        console.log('Order Statuses in Database:');
        statusRes.forEach(s => {
            console.log(`  ${s.status_id}: ${s.name}`);
        });
        console.log('');

        const kitchenStatusRes = await db.sequelize.query(
            'SELECT status_id, name FROM kitchen_statuses ORDER BY status_id',
            { type: db.sequelize.QueryTypes.SELECT }
        );

        console.log('Kitchen Statuses in Database:');
        kitchenStatusRes.forEach(s => {
            console.log(`  ${s.status_id}: ${s.name}`);
        });
        console.log('');

        console.log('═'.repeat(60));
        console.log('DIAGNOSTIC COMPLETE');
        console.log('═'.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }

    process.exit(0);
}

diagnosticTest();
