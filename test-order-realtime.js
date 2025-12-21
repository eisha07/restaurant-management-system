#!/usr/bin/env node
/**
 * Test script to verify:
 * 1. Orders are being created and saved to database
 * 2. Real-time Socket.IO updates are working
 * 3. Manager dashboard receives updates
 */

const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function testOrderCreation() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     🧪 ORDER CREATION & REAL-TIME TEST                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Test 1: Create an order
  console.log('📝 Test 1: Creating a new order...');
  try {
    const orderData = {
      customerSessionId: `test-session-${Date.now()}`,
      paymentMethod: 'card',
      tableNumber: 5,
      items: [
        { menuItemId: 1, quantity: 2 },
        { menuItemId: 2, quantity: 1 }
      ]
    };

    const response = await axios.post(`${API_BASE}/orders`, orderData);
    console.log('✅ Order created successfully!');
    console.log('   Order ID:', response.data.id);
    console.log('   Order Number:', response.data.order_number);
    console.log('   Status:', response.data.status);
    console.log('   Total:', response.data.total_amount);
    
    const orderId = response.data.id;
    
    // Test 2: Verify order is in database
    console.log('\n📊 Test 2: Verifying order in database...');
    try {
      const pendingOrders = await axios.get(`${API_BASE}/manager/orders/pending`, {
        headers: {
          'Authorization': 'Bearer dev-token' // Dev mode bypass
        }
      });
      
      const foundOrder = pendingOrders.data.orders?.find(o => o.id === orderId) || 
                        pendingOrders.data.find(o => o.id === orderId);
      
      if (foundOrder) {
        console.log('✅ Order found in pending orders list!');
        console.log('   Order details:', JSON.stringify(foundOrder, null, 2));
      } else {
        console.log('⚠️  Order not found in pending list (may need authentication)');
        console.log('   Total pending orders:', pendingOrders.data.orders?.length || pendingOrders.data.length);
      }
    } catch (err) {
      console.log('⚠️  Could not verify in database (auth may be required):', err.message);
    }

    // Test 3: Test Socket.IO real-time updates
    console.log('\n🔌 Test 3: Testing Socket.IO real-time updates...');
    return new Promise((resolve) => {
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: false
      });

      let orderReceived = false;
      let updateReceived = false;

      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);
        
        // Join manager room
        socket.emit('join-manager');
        console.log('📡 Joined managers room');

        // Create another order to trigger real-time update
        setTimeout(async () => {
          console.log('\n📝 Creating second order to test real-time...');
          try {
            const orderData2 = {
              customerSessionId: `test-session-${Date.now()}-2`,
              paymentMethod: 'cash',
              tableNumber: 10,
              items: [{ menuItemId: 3, quantity: 1 }]
            };

            await axios.post(`${API_BASE}/orders`, orderData2);
            console.log('✅ Second order created');
          } catch (err) {
            console.log('⚠️  Could not create second order:', err.message);
          }
        }, 2000);
      });

      socket.on('new-order', (data) => {
        if (!orderReceived) {
          orderReceived = true;
          console.log('✅ Received "new-order" event via Socket.IO!');
          console.log('   Order data:', JSON.stringify(data, null, 2));
        }
      });

      socket.on('pending-orders-updated', (data) => {
        if (!updateReceived) {
          updateReceived = true;
          console.log('✅ Received "pending-orders-updated" event!');
          console.log('   Update data:', JSON.stringify(data, null, 2));
        }
      });

      socket.on('connect_error', (err) => {
        console.log('❌ Socket connection error:', err.message);
        resolve();
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        socket.disconnect();
        console.log('\n📊 Test Results:');
        console.log('   New order event received:', orderReceived ? '✅' : '❌');
        console.log('   Pending orders update received:', updateReceived ? '✅' : '❌');
        console.log('\n✅ Test completed!');
        resolve();
      }, 10000);
    });

  } catch (error) {
    console.error('❌ Order creation failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testOrderCreation().then(() => {
  console.log('\n');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});



