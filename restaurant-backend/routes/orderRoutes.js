const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

// =============================================
// GET ROUTES (Viewing orders)
// =============================================

// GET /api/orders - List all orders (for Manager Dashboard)
router.get('/', async (req, res) => {
    try {
        const orders = await sequelize.query(`
            SELECT 
                o.order_id as id,
                o.order_number,
                c.customer_id,
                c.name as customer_name,
                rt.table_number,
                os.name as status,
                pm.name as payment_method,
                ps.name as payment_status,
                TO_CHAR(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
                o.approved_at,
                o.expected_completion
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN payment_methods pm ON o.payment_method_id = pm.method_id
            LEFT JOIN payment_statuses ps ON o.payment_status_id = ps.status_id
            ORDER BY o.created_at DESC
        `, { 
            type: sequelize.QueryTypes.SELECT 
        });

        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve orders',
            error: error.message
        });
    }
});

// GET /api/orders/:id - Get specific order details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get order header
        const orders = await sequelize.query(`
            SELECT 
                o.order_id as id,
                o.order_number,
                c.customer_id,
                c.name as customer_name,
                rt.table_number,
                os.code as status,
                os.name as status_name,
                pm.name as payment_method,
                ps.name as payment_status,
                ks.code as kitchen_status,
                ks.name as kitchen_status_name,
                TO_CHAR(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
                o.approved_at,
                o.expected_completion
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN payment_methods pm ON o.payment_method_id = pm.method_id
            LEFT JOIN payment_statuses ps ON o.payment_status_id = ps.status_id
            LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
            WHERE o.order_id = $1
        `, { 
            bind: [id],
            type: sequelize.QueryTypes.SELECT 
        });

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Get order items
        const items = await sequelize.query(`
            SELECT 
                order_item_id as id,
                menu_item_id,
                item_name as name,
                item_price as price,
                quantity,
                special_instructions,
                item_status as status
            FROM order_items
            WHERE order_id = $1
            ORDER BY order_item_id
        `, {
            bind: [id],
            type: sequelize.QueryTypes.SELECT
        });

        // Combine order with items
        const result = {
            ...orders[0],
            items: items,
            total_amount: items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
        };

        res.json(result);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve order',
            error: error.message
        });
    }
});

// GET /api/orders/session/:sessionId - Get customer's orders by session ID
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Get customer ID from session
        const customerResult = await sequelize.query(`
            SELECT customer_id FROM customers WHERE session_id = $1
        `, { 
            bind: [sessionId],
            type: sequelize.QueryTypes.SELECT 
        });

        if (customerResult.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'No customer found for this session'
            });
        }

        const customerId = customerResult[0].customer_id;

        // Get orders for customer
        const orders = await sequelize.query(`
            SELECT 
                o.order_id as id,
                o.order_number,
                c.name as customer_name,
                os.code as status,
                os.name as status_name,
                pm.name as payment_method,
                ps.name as payment_status,
                ks.code as kitchen_status,
                TO_CHAR(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
                o.approved_at,
                o.expected_completion
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN payment_methods pm ON o.payment_method_id = pm.method_id
            LEFT JOIN payment_statuses ps ON o.payment_status_id = ps.status_id
            LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
            WHERE o.customer_id = $1
            ORDER BY o.created_at DESC
        `, { 
            bind: [customerId],
            type: sequelize.QueryTypes.SELECT 
        });

        // For each order, get items
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
            const items = await sequelize.query(`
                SELECT 
                    order_item_id as id,
                    menu_item_id,
                    item_name as name,
                    item_price as price,
                    quantity,
                    special_instructions
                FROM order_items
                WHERE order_id = $1
            `, {
                bind: [order.id],
                type: sequelize.QueryTypes.SELECT
            });

            return {
                ...order,
                items: items,
                total_amount: items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
            };
        }));

        res.json({
            success: true,
            data: ordersWithItems,
            message: `${ordersWithItems.length} orders retrieved successfully`
        });
    } catch (error) {
        console.error('Error fetching session orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve session orders',
            error: error.message
        });
    }
});

// GET /api/orders/kitchen/active - Get active orders for kitchen display
router.get('/kitchen/active', async (req, res) => {
    try {
        const orders = await sequelize.query(`
            SELECT 
                o.order_id as id,
                o.order_number,
                c.customer_id,
                rt.table_number,
                os.name as status,
                ks.name as kitchen_status,
                o.created_at,
                o.approved_at,
                o.expected_completion
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
            WHERE os.name IN ('approved', 'in_progress') AND ks.name IN ('pending', 'preparing')
            ORDER BY o.created_at ASC
        `, { 
            type: sequelize.QueryTypes.SELECT 
        });

        res.json(orders);
    } catch (error) {
        console.error('Error fetching kitchen orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve kitchen orders',
            error: error.message
        });
    }
});

// =============================================
// POST ROUTES (Creating orders)
// =============================================

// POST /api/orders - Create a new order (Customer places order)
router.post('/', async (req, res) => {
    try {
        console.log('📝 POST /api/orders - Order creation attempt');
        const { customerSessionId, paymentMethod, items, tableNumber } = req.body;
        console.log('   Session ID:', customerSessionId);
        console.log('   Payment Method:', paymentMethod);
        console.log('   Table Number:', tableNumber);
        console.log('   Items:', JSON.stringify(items, null, 2));

        // Validation
        if (!customerSessionId || !paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
            console.log('❌ Validation failed - missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: customerSessionId, paymentMethod, items (non-empty array)'
            });
        }

        // Validate table number (must be integer 1-25)
        if (!tableNumber) {
            console.log('❌ Table number is required');
            return res.status(400).json({
                success: false,
                message: 'Table number is required'
            });
        }

        const tableNum = parseInt(tableNumber, 10);
        if (isNaN(tableNum) || tableNum < 1 || tableNum > 25) {
            console.log('❌ Invalid table number:', tableNumber);
            return res.status(422).json({
                success: false,
                message: 'Invalid table number. Must be between 1 and 25'
            });
        }

        console.log('✅ Table number validated:', tableNum);

        // Validate payment method
        const validPaymentMethods = ['cash', 'card', 'online'];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method. Must be: cash, card, or online'
            });
        }

        let subtotal = 0;
        const orderItemsData = [];

        // Calculate total and validate items
        for (const item of items) {
            if (!item.menuItemId || !item.quantity || item.quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Each item must have menuItemId and quantity > 0'
                });
            }

            // Check if menu item exists and is available
            const menuItem = await sequelize.query(
                'SELECT item_id, name, price, is_available FROM menu_items WHERE item_id = $1',
                { bind: [item.menuItemId], type: sequelize.QueryTypes.SELECT }
            );

            if (menuItem.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Menu item ${item.menuItemId} not found`
                });
            }

            if (!menuItem[0].is_available) {
                return res.status(400).json({
                    success: false,
                    message: `Menu item "${menuItem[0].name}" is not available`
                });
            }

            const itemTotal = parseFloat(menuItem[0].price) * item.quantity;
            subtotal += itemTotal;

            orderItemsData.push({
                menuItemId: item.menuItemId,
                name: menuItem[0].name,
                quantity: item.quantity,
                price: menuItem[0].price,
                specialInstructions: item.specialInstructions || null
            });
        }

        // Calculate tax (10%) and total
        const tax = parseFloat((subtotal * 0.1).toFixed(2));
        const total = parseFloat((subtotal + tax).toFixed(2));

        // Generate order number
        const orderNumber = `ORD-${Date.now()}`;

        // Get or create customer using session ID
        console.log('🔍 Looking up customer with session_id:', customerSessionId);
        let customerResult = await sequelize.query(`
            SELECT customer_id FROM customers WHERE session_id = $1
        `, { bind: [customerSessionId], type: sequelize.QueryTypes.SELECT });

        let customerId;
        if (customerResult.length === 0) {
            // Create new customer with session ID
            console.log('✨ Customer not found, creating new customer...');
            const createCustomerResult = await sequelize.query(`
                INSERT INTO customers (session_id, created_at, updated_at)
                VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING customer_id
            `, { bind: [customerSessionId], type: sequelize.QueryTypes.SELECT });
            customerId = createCustomerResult[0].customer_id;
            console.log('   ✅ Created customer_id:', customerId);
        } else {
            customerId = customerResult[0].customer_id;
            console.log('   ✅ Found existing customer_id:', customerId);
        }

        // Get payment method ID (query by code, not name)
        const paymentMethodResult = await sequelize.query(`
            SELECT method_id FROM payment_methods WHERE code = $1
        `, { bind: [paymentMethod], type: sequelize.QueryTypes.SELECT });
        
        if (paymentMethodResult.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method'
            });
        }

        // Get table ID from table number (optional - may not exist in restaurant_tables yet)
        console.log('🔍 Looking up table_id for table number:', tableNum);
        let tableId = null;
        try {
            const tableResult = await sequelize.query(`
                SELECT table_id FROM restaurant_tables WHERE table_number = $1
            `, { bind: [tableNum], type: sequelize.QueryTypes.SELECT });
            
            if (tableResult.length > 0) {
                tableId = tableResult[0].table_id;
                console.log('   ✅ Found table_id:', tableId);
            } else {
                console.log('   ⚠️  Table not in restaurant_tables, will store table_number only');
            }
        } catch (error) {
            console.log('   ⚠️  Could not lookup table:', error.message);
        }

        // Get status IDs
        console.log('🔍 Getting status IDs...');
        const pendingStatusResult = await sequelize.query(`
            SELECT status_id FROM order_statuses WHERE name = 'Pending Approval'
        `, { type: sequelize.QueryTypes.SELECT });
        console.log('   Order status (pending_approval):', pendingStatusResult[0]);
        
        const pendingPaymentStatusResult = await sequelize.query(`
            SELECT status_id FROM payment_statuses WHERE name = 'Pending'
        `, { type: sequelize.QueryTypes.SELECT });
        console.log('   Payment status (pending):', pendingPaymentStatusResult[0]);

        const pendingKitchenStatusResult = await sequelize.query(`
            SELECT status_id FROM kitchen_statuses WHERE name = 'Pending'
        `, { type: sequelize.QueryTypes.SELECT });
        console.log('   Kitchen status (pending):', pendingKitchenStatusResult[0]);

        // Create order and order items in a transaction
        console.log('💾 Inserting order into database...');
        const newOrder = await sequelize.query(`
            INSERT INTO orders (
                order_number,
                customer_id,
                table_id,
                payment_method_id,
                order_status_id,
                payment_status_id,
                kitchen_status_id
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING order_id, order_number, customer_id
        `, { 
            bind: [
                orderNumber, 
                customerId,
                tableId,
                paymentMethodResult[0].method_id,
                pendingStatusResult[0].status_id,
                pendingPaymentStatusResult[0].status_id,
                pendingKitchenStatusResult[0].status_id
            ],
            type: sequelize.QueryTypes.SELECT
        });

        console.log('   ✅ Order created with order_id:', newOrder[0].order_id);

        // Create order items
        console.log('💾 Inserting order items...');
        for (const item of orderItemsData) {
            await sequelize.query(`
                INSERT INTO order_items (
                    order_id, 
                    menu_item_id, 
                    item_name,
                    item_price, 
                    quantity, 
                    special_instructions
                ) 
                VALUES ($1, $2, $3, $4, $5, $6)
            `, {
                bind: [
                    newOrder[0].order_id,
                    item.menuItemId,
                    item.name,
                    item.price,
                    item.quantity,
                    item.specialInstructions
                ]
            });
        }
        console.log('   ✅ All order items inserted');

        // Get the complete order with items
        const completeOrder = await sequelize.query(`
            SELECT 
                o.order_id as id,
                o.order_number,
                c.customer_id,
                os.code as status,
                os.name as status_name,
                ks.code as kitchen_status,
                ks.name as kitchen_status_name,
                pm.name as payment_method,
                ps.name as payment_status,
                o.created_at
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
            LEFT JOIN payment_methods pm ON o.payment_method_id = pm.method_id
            LEFT JOIN payment_statuses ps ON o.payment_status_id = ps.status_id
            WHERE o.order_id = $1
        `, { 
            bind: [newOrder[0].order_id],
            type: sequelize.QueryTypes.SELECT
        });

        // Get order items
        const orderItems = await sequelize.query(`
            SELECT 
                order_item_id as id,
                menu_item_id,
                item_name as name,
                item_price as price,
                quantity,
                special_instructions
            FROM order_items
            WHERE order_id = $1
        `, {
            bind: [newOrder[0].order_id],
            type: sequelize.QueryTypes.SELECT
        });

        const totalAmount = parseFloat((subtotal + tax).toFixed(2));
        const responseOrder = {
            ...completeOrder[0],
            items: orderItems,
            subtotal: parseFloat(subtotal.toFixed(2)),
            tax: tax,
            total_amount: totalAmount
        };

        console.log('✅ Order creation successful!');
        console.log('   Complete order:', JSON.stringify(responseOrder, null, 2));
        
        // Emit Socket.io event to notify managers of new order
        if (global.io) {
            const managersRoom = global.io.sockets.adapter.rooms.get('managers');
            const managersCount = managersRoom ? managersRoom.size : 0;
            
            console.log('📡 Broadcasting new order to managers via Socket.io');
            console.log('   Managers in room:', managersCount);
            
            // Emit new order event
            global.io.to('managers').emit('new-order', {
                type: 'NEW_ORDER',
                order: responseOrder,
                timestamp: new Date().toISOString()
            });
            console.log('   ✅ Emitted "new-order" event');
            
            // Also emit a general update event so managers refresh their pending orders list
            global.io.to('managers').emit('pending-orders-updated', {
                type: 'ORDERS_UPDATED',
                timestamp: new Date().toISOString()
            });
            console.log('   ✅ Emitted "pending-orders-updated" event');
            
            // Emit to customer session for order confirmation
            global.io.to('session_' + customerSessionId).emit('order-created', {
                order: responseOrder,
                timestamp: new Date().toISOString()
            });
            console.log('   ✅ Emitted "order-created" to customer session');
        } else {
            console.warn('⚠️  Socket.IO not available - real-time updates disabled');
        }
        
        res.status(201).json(responseOrder);

    } catch (error) {
        console.error('❌ Error creating order:', error.message);
        console.error('   Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
});

// =============================================
// PATCH ROUTES (Updating order status)
// =============================================

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['pending_approval', 'approved', 'in_progress', 'ready', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Check if order exists
        const existingOrder = await sequelize.query(
            'SELECT order_id FROM orders WHERE order_id = $1',
            { bind: [id], type: sequelize.QueryTypes.SELECT }
        );

        if (existingOrder.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Get status ID
        const statusResult = await sequelize.query(
            'SELECT status_id FROM order_statuses WHERE code = $1',
            { bind: [status], type: sequelize.QueryTypes.SELECT }
        );

        if (statusResult.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status code'
            });
        }

        // Update order status
        await sequelize.query(
            'UPDATE orders SET order_status_id = $1 WHERE order_id = $2',
            { bind: [statusResult[0].status_id, id] }
        );

        // 📡 Broadcast update to customer
        if (global.io) {
            global.io.to('order_' + id).emit('order-update', {
                orderId: parseInt(id),
                status: status,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: `Order status updated to ${status}`
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
});

// PATCH /api/orders/:id/approve - Approve order (Manager action)
router.patch('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        // Get approved and pending kitchen status IDs
        const approvedStatusResult = await sequelize.query(
            'SELECT status_id FROM order_statuses WHERE name = $1',
            { bind: ['approved'], type: sequelize.QueryTypes.SELECT }
        );

        const pendingKitchenStatusResult = await sequelize.query(
            'SELECT status_id FROM kitchen_statuses WHERE name = $1',
            { bind: ['pending'], type: sequelize.QueryTypes.SELECT }
        );

        // Update order status
        const updatedOrder = await sequelize.query(`
            UPDATE orders 
            SET 
                order_status_id = $1,
                kitchen_status_id = $2,
                approved_at = CURRENT_TIMESTAMP
            WHERE order_id = $3
            RETURNING order_id
        `, { 
            bind: [approvedStatusResult[0].status_id, pendingKitchenStatusResult[0].status_id, id],
            type: sequelize.QueryTypes.SELECT
        });

        if (updatedOrder.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: 'Order approved and sent to kitchen'
        });

    } catch (error) {
        console.error('Error approving order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve order',
            error: error.message
        });
    }
});

// PATCH /api/orders/:id/cancel - Cancel order
router.patch('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Get cancelled status ID
        const cancelledStatusResult = await sequelize.query(
            'SELECT status_id FROM order_statuses WHERE name = $1',
            { bind: ['cancelled'], type: sequelize.QueryTypes.SELECT }
        );

        // Update order status
        const updatedOrder = await sequelize.query(`
            UPDATE orders 
            SET 
                order_status_id = $1
            WHERE order_id = $2
            RETURNING order_id
        `, { 
            bind: [cancelledStatusResult[0].status_id, id],
            type: sequelize.QueryTypes.SELECT
        });

        if (updatedOrder.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: `Order cancelled${reason ? ': ' + reason : ''}`
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order',
            error: error.message
        });
    }
});

module.exports = router;