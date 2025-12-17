#!/usr/bin/env node

/**
 * Diagnostic Test for Order Issues
 * Checks: 1) Order creation, 2) Manager visibility, 3) Status names in DB
 */

const db = require('./config/database');

async function diagnoseOrderIssues() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║        🔍 DIAGNOSING ORDER VISIBILITY ISSUES          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Check 1: Status names in database
        console.log('CHECK 1️⃣ : Order Status Names in Database');
        console.log('─'.repeat(55));
        
        const statuses = await db.sequelize.query(
            'SELECT status_id, code, name FROM order_statuses ORDER BY status_id',
            { type: db.sequelize.QueryTypes.SELECT }
        );
        
        console.log('Order Statuses:');
        statuses.forEach(s => {
            console.log(`   ID: ${s.status_id}, Code: "${s.code}", Name: "${s.name}"`);
        });
        console.log('');

        // Check 2: Recent orders
        console.log('CHECK 2️⃣ : Recent Orders in Database');
        console.log('─'.repeat(55));
        
        const recentOrders = await db.sequelize.query(`
            SELECT 
                o.order_id,
                o.order_number,
                os.name as status,
                o.created_at
            FROM orders o
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            ORDER BY o.order_id DESC
            LIMIT 5
        `, { type: db.sequelize.QueryTypes.SELECT });

        console.log(`Total Recent Orders: ${recentOrders.length}`);
        recentOrders.forEach(order => {
            console.log(`   Order ${order.order_id}: "${order.order_number}" - Status: "${order.status}"`);
        });
        console.log('');

        // Check 3: Pending approval orders
        console.log('CHECK 3️⃣ : Orders with "Pending Approval" Status');
        console.log('─'.repeat(55));
        
        const pendingApproval = await db.sequelize.query(`
            SELECT 
                o.order_id,
                o.order_number,
                os.name as status
            FROM orders o
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            WHERE os.name = 'Pending Approval'
            ORDER BY o.created_at DESC
        `, { type: db.sequelize.QueryTypes.SELECT });

        console.log(`Orders with "Pending Approval": ${pendingApproval.length}`);
        pendingApproval.forEach(order => {
            console.log(`   ✓ Order ${order.order_id}: ${order.order_number}`);
        });
        console.log('');

        // Check 4: All orders regardless of status
        console.log('CHECK 4️⃣ : ALL Orders (Any Status)');
        console.log('─'.repeat(55));
        
        const allOrders = await db.sequelize.query(`
            SELECT 
                o.order_id,
                o.order_number,
                os.name as status,
                o.created_at
            FROM orders o
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            ORDER BY o.created_at DESC
        `, { type: db.sequelize.QueryTypes.SELECT });

        console.log(`Total Orders in Database: ${allOrders.length}`);
        allOrders.slice(0, 10).forEach(order => {
            console.log(`   • ${order.order_number} - Status: "${order.status}"`);
        });
        console.log('');

        // Check 5: Order items
        console.log('CHECK 5️⃣ : Latest Order Details');
        console.log('─'.repeat(55));
        
        if (recentOrders.length > 0) {
            const latestOrderId = recentOrders[0].order_id;
            const items = await db.sequelize.query(`
                SELECT 
                    order_item_id,
                    menu_item_id,
                    item_name,
                    quantity,
                    item_price
                FROM order_items
                WHERE order_id = $1
            `, { 
                bind: [latestOrderId],
                type: db.sequelize.QueryTypes.SELECT 
            });

            console.log(`Latest Order (ID: ${latestOrderId}): ${recentOrders[0].order_number}`);
            console.log(`Status: ${recentOrders[0].status}`);
            console.log(`Items in order: ${items.length}`);
            items.forEach(item => {
                console.log(`   • ${item.item_name} x${item.quantity} @ $${item.item_price}`);
            });
        }
        console.log('');

        // Summary
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║                  DIAGNOSIS SUMMARY                    ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        
        if (pendingApproval.length === 0 && allOrders.length > 0) {
            console.log('║ ⚠️  ISSUE: No orders with "Pending Approval" status   ║');
            console.log('║ Orders exist but none in manager view                ║');
            console.log('║                                                    ║');
            console.log('║ SOLUTION: Check status name in database             ║');
        } else if (pendingApproval.length > 0) {
            console.log(`║ ✅ GOOD: ${pendingApproval.length} orders ready for manager      ║`);
        } else if (allOrders.length === 0) {
            console.log('║ ⚠️  ISSUE: No orders in database                     ║');
            console.log('║ Check order creation endpoint                       ║');
        }
        
        console.log('╚════════════════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('❌ Diagnosis Error:', error.message);
        console.error(error.stack);
    }

    process.exit(0);
}

diagnoseOrderIssues();
