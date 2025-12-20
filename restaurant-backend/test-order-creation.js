const axios = require('axios');

async function testOrderCreation() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║         🧪 TESTING ORDER CREATION & STATUS          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Create a test order
        const orderData = {
            customerSessionId: 'test-session-' + Date.now(),
            paymentMethod: 'credit_card',
            items: [
                {
                    menuItemId: 1,
                    quantity: 2,
                    specialInstructions: 'Test order for diagnostic'
                }
            ]
        };

        console.log('📤 Creating test order...');
        console.log('   Payload:', JSON.stringify(orderData, null, 2));

        const response = await axios.post('http://localhost:5000/api/orders', orderData);
        
        console.log('\n✅ Order created successfully!');
        console.log('   Order ID:', response.data.id);
        console.log('   Order Number:', response.data.order_number);
        console.log('   Status:', response.data.status_name);
        console.log('   Full response:', JSON.stringify(response.data, null, 2));

        // Now check the database to verify status
        console.log('\n🔍 Verifying status in database...');
        
        const db = require('./config/database');
        const dbCheck = await db.sequelize.query(`
            SELECT 
                o.order_id,
                o.order_number,
                os.name as status,
                os.code,
                o.order_status_id
            FROM orders o
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            WHERE o.order_id = $1
        `, {
            bind: [response.data.id],
            type: db.sequelize.QueryTypes.SELECT
        });

        if (dbCheck.length > 0) {
            const order = dbCheck[0];
            console.log('   ✅ Found in database:');
            console.log('      Order ID:', order.order_id);
            console.log('      Order Number:', order.order_number);
            console.log('      Status ID:', order.order_status_id);
            console.log('      Status Code:', order.code);
            console.log('      Status Name:', order.status);

            if (order.status === 'Pending Approval') {
                console.log('\n   ✅ CORRECT: Order is in "Pending Approval" status');
            } else {
                console.log('\n   ⚠️ ISSUE: Order should be "Pending Approval" but is "' + order.status + '"');
            }
        } else {
            console.log('   ❌ Order not found in database!');
        }

    } catch (error) {
        console.error('❌ Test Error:', error.message);
        if (error.response?.data) {
            console.error('Response:', error.response.data);
        }
    }

    process.exit(0);
}

testOrderCreation();
