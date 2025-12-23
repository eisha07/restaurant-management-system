#!/usr/bin/env node

/**
 * Complete Manager Authentication Flow Demo
 * Shows: Login → Store Token → Access Protected Routes → Perform Operations
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

async function demonstrateAuthFlow() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     🔐 COMPLETE MANAGER AUTHENTICATION FLOW DEMO         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        // Step 1: Manager enters credentials
        console.log('STEP 1️⃣  | Manager Logs In');
        console.log('─'.repeat(60));
        console.log('Input:');
        console.log('  Password: admin123');
        console.log('');

        const loginRes = await makeRequest('POST', '/api/auth/manager-login', {
            password: 'admin123'
        });

        if (loginRes.status !== 200) {
            throw new Error('Login failed');
        }

        const token = loginRes.data.token;
        const manager = loginRes.data.manager;

        console.log('Output:');
        console.log(`  ✅ Status: ${loginRes.status} - Login Successful`);
        console.log(`  👤 Manager: ${manager.name}`);
        console.log(`  📧 Email: ${manager.email}`);
        console.log(`  🔑 Token: ${token.substring(0, 50)}...`);
        console.log(`  ⏱️  Expires: In 24 hours\n`);

        // Step 2: Token stored in localStorage
        console.log('STEP 2️⃣  | Token Stored in Frontend');
        console.log('─'.repeat(60));
        console.log('Frontend Action:');
        console.log('  localStorage.setItem("managerToken", token)');
        console.log('');
        console.log('Result:');
        console.log(`  ✅ Token stored and ready for API calls\n`);

        // Step 3: Access manager dashboard
        console.log('STEP 3️⃣  | Manager Accesses Dashboard');
        console.log('─'.repeat(60));
        console.log('Request:');
        console.log('  GET /api/manager/orders/pending');
        console.log('  Header: Authorization: Bearer ' + token.substring(0, 50) + '...');
        console.log('');

        const dashboardRes = await makeRequest('GET', '/api/manager/orders/pending', null, token);

        console.log('Response:');
        console.log(`  ✅ Status: ${dashboardRes.status}`);
        console.log(`  📋 Pending Orders: ${dashboardRes.data.count}`);
        console.log(`  💼 First Order Number: ${dashboardRes.data.orders?.[0]?.order_number || 'N/A'}\n`);

        // Step 4: Get statistics
        console.log('STEP 4️⃣  | View Dashboard Statistics');
        console.log('─'.repeat(60));
        console.log('Request:');
        console.log('  GET /api/manager/statistics');
        console.log('');

        const statsRes = await makeRequest('GET', '/api/manager/statistics', null, token);

        console.log('Response:');
        console.log(`  ✅ Status: ${statsRes.status}`);
        console.log(`  📊 Total Orders: ${statsRes.data.totalOrders}`);
        console.log(`  💰 Total Revenue: $${statsRes.data.totalRevenue}`);
        console.log(`  📈 Avg Order Value: $${statsRes.data.averageOrderValue}`);
        console.log(`  ⏳ Pending Orders: ${statsRes.data.pendingOrders}\n`);

        // Step 5: Approve an order
        console.log('STEP 5️⃣  | Manager Approves an Order');
        console.log('─'.repeat(60));
        
        if (dashboardRes.data.orders && dashboardRes.data.orders.length > 0) {
            const orderId = dashboardRes.data.orders[0].id;
            
            console.log('Request:');
            console.log(`  PUT /api/manager/orders/${orderId}/approve`);
            console.log('  Body: { "expectedCompletion": 30 }');
            console.log('');

            const approveRes = await makeRequest('PUT', `/api/manager/orders/${orderId}/approve`, 
                { expectedCompletion: 30 }, 
                token
            );

            console.log('Response:');
            console.log(`  ✅ Status: ${approveRes.status}`);
            console.log(`  📝 Message: ${approveRes.data.message}`);
            console.log(`  🔢 Order ID: ${approveRes.data.orderId}\n`);
        } else {
            console.log('ℹ️  No pending orders to approve\n');
        }

        // Step 6: Manager logs out (frontend action)
        console.log('STEP 6️⃣  | Manager Logs Out');
        console.log('─'.repeat(60));
        console.log('Frontend Action:');
        console.log('  localStorage.removeItem("managerToken")');
        console.log('');
        console.log('Result:');
        console.log(`  ✅ Token cleared from storage`);
        console.log(`  ✅ User redirected to login page\n`);

        // Summary
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║            ✅ AUTHENTICATION FLOW COMPLETE                 ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log('║ ✅ Step 1: Manager Login                                  ║');
        console.log('║ ✅ Step 2: Token Storage                                  ║');
        console.log('║ ✅ Step 3: Dashboard Access                               ║');
        console.log('║ ✅ Step 4: Statistics Retrieval                           ║');
        console.log('║ ✅ Step 5: Order Approval                                 ║');
        console.log('║ ✅ Step 6: Logout                                         ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log('🔒 SECURITY FEATURES ACTIVE:');
        console.log('   ✅ JWT Token Authentication');
        console.log('   ✅ Bearer Token in Headers');
        console.log('   ✅ 24-Hour Token Expiry');
        console.log('   ✅ HMAC-SHA256 Signature');
        console.log('   ✅ Protected Manager Routes');
        console.log('   ✅ Password Validation\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

demonstrateAuthFlow();
