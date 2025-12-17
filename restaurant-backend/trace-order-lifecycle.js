#!/usr/bin/env node

/**
 * Full Order Lifecycle Trace Test
 * Tests: 1) Create order, 2) Check DB immediately, 3) Verify managers see it pending
 */

const db = require('./config/database');
const axios = require('axios');

async function traceOrderLifecycle() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║       🔬 ORDER LIFECYCLE TRACE TEST                  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Step 1: Get current count of orders
        console.log('STEP 1️⃣: Get current order count');
        console.log('─'.repeat(55));
        
        const countBefore = await db.sequelize.query(`
            SELECT COUNT(*) as total FROM orders
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        console.log(`Orders before: ${countBefore[0].total}\n`);

        // Step 2: Try to create an order via API
        console.log('STEP 2️⃣: Create test order via API');
        console.log('─'.repeat(55));
        
        const testOrder = {
            customerSessionId: `trace-test-${Date.now()}`,
            paymentMethod: 'credit_card',
            items: [
                {
                    menuItemId: 1,
                    quantity: 1,
                    specialInstructions: 'Trace test'
                }
            ]
        };
        
        console.log('Request payload:', JSON.stringify(testOrder, null, 2));
        
        let createdOrderId = null;
        try {
            const response = await axios.post('http://localhost:5000/api/orders', testOrder, {
                timeout: 5000
            });
            
            console.log('\n✅ API Response Status:', response.status);
            console.log('Order ID:', response.data.id);
            console.log('Order Number:', response.data.order_number);
            console.log('Response Status:', response.data.status_name);
            createdOrderId = response.data.id;
        } catch (error) {
            console.log('\n⚠️ API Call Failed (backend may not be running)');
            console.log('Error:', error.message);
            console.log('\nContinuing with database check of existing orders...\n');
        }
        
        // Step 3: Check all recent orders in database
        console.log('\nSTEP 3️⃣: Check orders in database');
        console.log('─'.repeat(55));
        
        const allOrders = await db.sequelize.query(`
            SELECT 
                o.order_id,
                o.order_number,
                o.order_status_id,
                os.name as status_name,
                os.code as status_code,
                o.created_at
            FROM orders o
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            ORDER BY o.order_id DESC
            LIMIT 3
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        console.log(`Recent ${allOrders.length} orders in database:`);
        allOrders.forEach(o => {
            const marker = o.order_id === createdOrderId ? ' ← JUST CREATED' : '';
            console.log(`   ID: ${o.order_id} | ${o.order_number.padEnd(20)} | Status: "${o.status_name}" (ID: ${o.order_status_id})${marker}`);
        });
        console.log('');

        // Step 4: Get pending approval orders (what manager sees)
        console.log('STEP 4️⃣: Get "Pending Approval" orders (manager view)');
        console.log('─'.repeat(55));
        
        const pendingApproval = await db.sequelize.query(`
            SELECT 
                o.order_id,
                o.order_number,
                os.name as status_name,
                o.created_at
            FROM orders o
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            WHERE os.name = 'Pending Approval'
            ORDER BY o.order_id DESC
            LIMIT 5
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        console.log(`Pending Approval orders: ${pendingApproval.length}`);
        if (pendingApproval.length > 0) {
            pendingApproval.forEach(o => {
                const marker = o.order_id === createdOrderId ? ' ← JUST CREATED' : '';
                console.log(`   ✓ ${o.order_number}${marker}`);
            });
        } else {
            console.log('   (none)');
        }
        console.log('');

        // Step 5: Check all status names and their IDs
        console.log('STEP 5️⃣: All status codes in database');
        console.log('─'.repeat(55));
        
        const statuses = await db.sequelize.query(`
            SELECT status_id, code, name FROM order_statuses ORDER BY status_id
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        statuses.forEach(s => {
            console.log(`   ID: ${s.status_id} | Code: "${s.code}".padEnd(18) | Name: "${s.name}"`);
        });
        console.log('');

        // Step 6: Summary
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║                  ANALYSIS SUMMARY                     ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        
        if (createdOrderId) {
            const createdOrder = allOrders.find(o => o.order_id === createdOrderId);
            if (createdOrder) {
                console.log(`║ Created Order: ${createdOrder.order_number.padEnd(34)} ║`);
                console.log(`║ Status: ${createdOrder.status_name.padEnd(48)} ║`);
                
                if (createdOrder.status_name === 'Pending Approval') {
                    console.log('║ ✅ CORRECT: New orders set to "Pending Approval"  ║');
                } else {
                    console.log(`║ ⚠️ ISSUE: Should be "Pending Approval"            ║`);
                    console.log(`║ But is: "${createdOrder.status_name}"                       ║`);
                }
            }
        }
        
        if (pendingApproval.length === 0 && allOrders.length > 0) {
            console.log('║ ⚠️ NO pending orders in manager view               ║');
            console.log('║ But orders exist in database                       ║');
        } else if (pendingApproval.length > 0) {
            console.log(`║ ✅ ${pendingApproval.length} orders visible to manager              ║`);
        }
        
        console.log('╚════════════════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('❌ Test Error:', error.message);
        console.error(error.stack);
    }

    process.exit(0);
}

traceOrderLifecycle();
