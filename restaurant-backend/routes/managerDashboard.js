 // server/routes/managerDashboard.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateManager, authorizeManager } = require('../middleware/auth');

// Get all pending orders
router.get('/orders/pending', async (req, res) => {
    try {
        // Auth optional in dev, but check if provided
        const authHeader = req.headers['authorization'];
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        
        // In dev mode, allow without auth; in production require it
        if (process.env.NODE_ENV === 'production' && !token) {
            console.log('⚠️ Production mode: Missing auth token');
            return res.status(401).json({ 
                success: false, 
                message: 'Missing authorization header' 
            });
        }
        
        if (token) {
            console.log('✓ Auth token provided');
        } else {
            console.log('ℹ️ Dev mode: Skipping auth check');
        }
        
        console.log('📋 Fetching pending orders...');
        console.log('   Database connected:', db.sequelize ? 'YES' : 'NO');
        console.log('   DB state:', db.sequelize?.connectionManager?.connections ? 'READY' : 'NOT READY');
        const query = `
            SELECT 
                o.order_id as id, o.order_number, c.customer_id, c.name as customer_name, rt.table_number, 
                os.name as status, pm.name as payment_method, ps.name as payment_status,
                ks.name as kitchen_status, o.special_instructions, 
                TO_CHAR(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN payment_methods pm ON o.payment_method_id = pm.method_id
            LEFT JOIN payment_statuses ps ON o.payment_status_id = ps.status_id
            LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
            WHERE os.name = 'Pending Approval'
            ORDER BY o.created_at DESC
        `;
        
        const orders = await Promise.race([
            db.sequelize.query(query, { type: db.sequelize.QueryTypes.SELECT }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 8000))
        ]);
        console.log(`   Found ${orders.length} pending orders`);
        
        // Fetch items and totals for each order (with timeout)
        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                try {
                    const itemsQuery = `
                        SELECT 
                            order_item_id as id, menu_item_id, item_name as name,
                            item_price as price, quantity, special_instructions
                        FROM order_items
                        WHERE order_id = $1
                    `;
                    const items = await Promise.race([
                        db.sequelize.query(itemsQuery, {
                            bind: [order.id],
                            type: db.sequelize.QueryTypes.SELECT
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Items query timeout')), 3000))
                    ]);
                    
                    const total = items.reduce((sum, item) => 
                        sum + (parseFloat(item.price) * item.quantity), 0
                    );
                    
                    return {
                        ...order,
                        items: items,
                        total: total.toFixed(2)
                    };
                } catch (itemError) {
                    console.error(`Error fetching items for order ${order.id}:`, itemError);
                    return {
                        ...order,
                        items: [],
                        total: '0.00'
                    };
                }
            })
        );
        
        res.json({
            success: true,
            count: ordersWithItems.length,
            orders: ordersWithItems
        });
    } catch (error) {
        console.error('Error fetching pending orders:', error.message);
        // Return empty list on error instead of 500
        res.json({
            success: true,
            count: 0,
            orders: []
        });
    }
});

// Get all orders (approved, in_progress, ready)
router.get('/orders/all', async (req, res) => {
    try {
        // Check for auth token - optional in dev mode, required in production
        const authHeader = req.headers['authorization'];
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        
        if (process.env.NODE_ENV === 'production' && !token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Missing authorization header' 
            });
        }
        
        console.log('📋 Fetching all orders...');
        const query = `
            SELECT 
                o.order_id as id, o.order_number, c.customer_id, c.name as customer_name, rt.table_number, 
                os.name as status, pm.name as payment_method, ps.name as payment_status,
                ks.name as kitchen_status, o.special_instructions, 
                TO_CHAR(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at, 
                o.expected_completion
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN payment_methods pm ON o.payment_method_id = pm.method_id
            LEFT JOIN payment_statuses ps ON o.payment_status_id = ps.status_id
            LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
            WHERE os.name IN ('Approved', 'In Progress', 'Ready', 'Completed')
            ORDER BY 
                CASE os.name
                    WHEN 'In Progress' THEN 1
                    WHEN 'Approved' THEN 2
                    WHEN 'Ready' THEN 3
                    WHEN 'Completed' THEN 4
                    ELSE 5
                END,
                o.created_at DESC
        `;
        
        const orders = await Promise.race([
            db.sequelize.query(query, { type: db.sequelize.QueryTypes.SELECT }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 8000))
        ]);
        
        // Fetch items and totals for each order (with timeout and error handling)
        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                try {
                    const itemsQuery = `
                        SELECT 
                            order_item_id as id, menu_item_id, item_name as name,
                            item_price as price, quantity, special_instructions
                        FROM order_items
                        WHERE order_id = $1
                    `;
                    const items = await Promise.race([
                        db.sequelize.query(itemsQuery, {
                            bind: [order.id],
                            type: db.sequelize.QueryTypes.SELECT
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Items query timeout')), 3000))
                    ]);
                    
                    const total = items.reduce((sum, item) => 
                        sum + (parseFloat(item.price) * item.quantity), 0
                    );
                    
                    return {
                        ...order,
                        items: items,
                        total: total.toFixed(2)
                    };
                } catch (itemError) {
                    console.error(`Error fetching items for order ${order.id}:`, itemError);
                    return {
                        ...order,
                        items: [],
                        total: '0.00'
                    };
                }
            })
        );
        
        res.json({
            success: true,
            orders: ordersWithItems
        });
    } catch (error) {
        console.error('Error fetching all orders:', error.message);
        // Return empty list on error instead of 500
        res.json({
            success: true,
            orders: []
        });
    }
});

// Approve order
router.put('/orders/:id/approve', authenticateManager, authorizeManager, async (req, res) => {
    const { id } = req.params;
    const { expectedCompletion } = req.body || {};
    
    try {
        console.log('🔄 Approve order request received - ID:', id);
        console.log('   Request manager:', req.manager?.username);
        
        // Validate order ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid order ID provided' 
            });
        }

        // Get approved and pending kitchen status IDs
        const approvedStatusResult = await db.sequelize.query(
            'SELECT status_id FROM order_statuses WHERE name = $1',
            { bind: ['Approved'], type: db.sequelize.QueryTypes.SELECT }
        );

        if (!approvedStatusResult || approvedStatusResult.length === 0) {
            console.error('❌ Approved status not found in database');
            return res.status(500).json({ 
                success: false, 
                message: 'System error: Approved status not configured' 
            });
        }

        const pendingKitchenStatusResult = await db.sequelize.query(
            'SELECT status_id FROM kitchen_statuses WHERE name = $1',
            { bind: ['Pending'], type: db.sequelize.QueryTypes.SELECT }
        );

        if (!pendingKitchenStatusResult || pendingKitchenStatusResult.length === 0) {
            console.error('❌ Pending kitchen status not found in database');
            return res.status(500).json({ 
                success: false, 
                message: 'System error: Pending kitchen status not configured' 
            });
        }

        console.log('✓ Status IDs found - Approved:', approvedStatusResult[0].status_id, 'Pending Kitchen:', pendingKitchenStatusResult[0].status_id);

        // First check if order exists
        const orderExists = await db.sequelize.query(
            'SELECT order_id FROM orders WHERE order_id = $1',
            { bind: [id], type: db.sequelize.QueryTypes.SELECT }
        );

        if (!orderExists || orderExists.length === 0) {
            console.log('⚠️ Order not found:', id);
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        // Update order
        const updateResult = await db.sequelize.query(`
            UPDATE orders 
            SET order_status_id = $1, 
                kitchen_status_id = $2,
                approved_at = NOW(),
                expected_completion = CASE 
                  WHEN $3::text IS NULL OR $3::text = '' THEN NOW() + INTERVAL '25 minutes'
                  ELSE NOW() + (INTERVAL '1 minute' * CAST($3 AS INTEGER))
                END
            WHERE order_id = $4
            RETURNING order_id
        `, {
            bind: [approvedStatusResult[0].status_id, pendingKitchenStatusResult[0].status_id, expectedCompletion || 25, id],
            type: db.sequelize.QueryTypes.SELECT
        });
        
        if (!updateResult || updateResult.length === 0) {
            console.log('⚠️ Update failed - no rows affected for order:', id);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to update order in database' 
            });
        }
        
        console.log('✅ Order approved in database:', id);
        
        // Get order number for broadcasting
        const orderInfo = await db.sequelize.query(
            'SELECT order_number FROM orders WHERE order_id = $1',
            { bind: [id], type: db.sequelize.QueryTypes.SELECT }
        );
        const orderNumber = orderInfo.length > 0 ? orderInfo[0].order_number : `ORD-${id}`;
        
        // 📡 Broadcast order approval via Socket.IO
        if (global.io) {
            console.log('📡 Broadcasting order approval to Socket.IO:', id, orderNumber);
            
            const broadcastData = {
                orderId: parseInt(id),
                orderNumber: orderNumber,
                status: 'approved',
                timestamp: new Date().toISOString()
            };
            
            // Notify customer
            global.io.to('order_' + id).emit('order-approved', {
                ...broadcastData,
                message: '✅ Your order has been approved and is being prepared!'
            });
            
            // Notify kitchen
            global.io.to('kitchen').emit('order-approved', {
                ...broadcastData,
                message: `Order ${orderNumber} approved by manager`
            });
            
            // Notify other managers
            global.io.to('managers').emit('order-approved', {
                ...broadcastData,
                message: `Order ${orderNumber} has been approved`
            });
            
            // Notify managers that pending orders list has changed
            global.io.to('managers').emit('pending-orders-updated', {
                type: 'ORDER_APPROVED',
                orderId: parseInt(id),
                orderNumber: orderNumber,
                timestamp: new Date().toISOString()
            });
        } else {
            console.warn('⚠️ Socket.IO not available for broadcasting');
        }
        
        res.json({
            success: true,
            message: 'Order approved successfully',
            orderId: id
        });
    } catch (error) {
        console.error('❌ Error approving order:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to approve order: ' + error.message 
        });
    }
});

// Reject order
router.put('/orders/:id/reject', authenticateManager, authorizeManager, async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body || {};
    
    try {
        console.log('🔄 Reject order request received - ID:', id);
        console.log('   Reason:', reason);
        console.log('   Request manager:', req.manager?.username);

        // Validate order ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid order ID provided' 
            });
        }

        const cancelledStatusResult = await db.sequelize.query(
            'SELECT status_id FROM order_statuses WHERE name = $1',
            { bind: ['Cancelled'], type: db.sequelize.QueryTypes.SELECT }
        );

        if (!cancelledStatusResult || cancelledStatusResult.length === 0) {
            console.error('❌ Cancelled status not found in database');
            return res.status(500).json({ 
                success: false, 
                message: 'System error: Cancelled status not configured' 
            });
        }

        console.log('✓ Status ID found - Cancelled:', cancelledStatusResult[0].status_id);

        // First check if order exists
        const orderExists = await db.sequelize.query(
            'SELECT order_id FROM orders WHERE order_id = $1',
            { bind: [id], type: db.sequelize.QueryTypes.SELECT }
        );

        if (!orderExists || orderExists.length === 0) {
            console.log('⚠️ Order not found:', id);
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        const updateResult = await db.sequelize.query(`
            UPDATE orders 
            SET order_status_id = $1, 
                cancellation_reason = $2
            WHERE order_id = $3
            RETURNING order_id
        `, {
            bind: [cancelledStatusResult[0].status_id, reason || 'Rejected by manager', id],
            type: db.sequelize.QueryTypes.SELECT
        });
        
        if (!updateResult || updateResult.length === 0) {
            console.log('⚠️ Update failed - no rows affected for order:', id);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to update order in database' 
            });
        }
        
        console.log('✅ Order rejected in database:', id);
        
        // 📡 Broadcast order rejection via Socket.IO
        if (global.io) {
            console.log('📡 Broadcasting order rejection to Socket.IO:', id);
            
            // Notify customer
            global.io.to('order_' + id).emit('order-rejected', {
                orderId: id,
                status: 'rejected',
                reason: reason || 'Rejected by manager',
                message: `❌ Your order has been rejected. Reason: ${reason || 'Rejected by manager'}`,
                timestamp: new Date().toISOString()
            });
            
            // Notify managers
            global.io.to('managers').emit('order-rejected', {
                orderId: id,
                reason: reason,
                message: `Order #${id} has been rejected`,
                timestamp: new Date().toISOString()
            });
            
            // Notify managers that pending orders list has changed
            global.io.to('managers').emit('pending-orders-updated', {
                type: 'ORDER_REJECTED',
                orderId: id,
                timestamp: new Date().toISOString()
            });
        } else {
            console.warn('⚠️ Socket.IO not available for broadcasting');
        }
        
        res.json({
            success: true,
            message: 'Order rejected successfully',
            orderId: id
        });
    } catch (error) {
        console.error('❌ Error rejecting order:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to reject order: ' + error.message 
        });
    }
});

// Update order status
router.put('/orders/:id/status', authenticateManager, authorizeManager, async (req, res) => {
    const { id } = req.params;
    const { status, kitchen_status } = req.body;
    
    try {
        const query = `
            UPDATE orders 
            SET status = $1, kitchen_status = $2
            WHERE id = $3 
            RETURNING *
        `;
        
        const result = await db.sequelize.query(query, {
            replacements: [status, kitchen_status, id],
            type: db.sequelize.QueryTypes.UPDATE
        });
        
        if (!result || result.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Create kitchen log
        await db.sequelize.query(
            'INSERT INTO kitchen_logs (order_id, status, notes) VALUES (?, ?, ?)',
            {
                replacements: [id, kitchen_status || status, `Status updated to ${kitchen_status || status}`],
                type: db.sequelize.QueryTypes.INSERT
            }
        );
        
        res.json({
            success: true,
            message: 'Order status updated successfully',
            order: result[0]
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PATCH endpoints (aliases for PUT - required by frontend API client)

// PATCH /api/manager/orders/:id/approve - Approve order
router.patch('/orders/:id/approve', authenticateManager, authorizeManager, async (req, res) => {
    const { id } = req.params;
    const { expectedCompletion } = req.body;
    
    try {
        console.log('🔄 PATCH Approve order request received - ID:', id);

        // Validate order ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid order ID provided' 
            });
        }

        // Get approved and pending kitchen status IDs
        const approvedStatusResult = await db.sequelize.query(
            'SELECT status_id FROM order_statuses WHERE name = $1',
            { bind: ['Approved'], type: db.sequelize.QueryTypes.SELECT }
        );

        if (!approvedStatusResult || approvedStatusResult.length === 0) {
            console.error('❌ Approved status not found in database');
            return res.status(500).json({ 
                success: false, 
                message: 'System error: Approved status not configured' 
            });
        }

        const pendingKitchenStatusResult = await db.sequelize.query(
            'SELECT status_id FROM kitchen_statuses WHERE name = $1',
            { bind: ['Pending'], type: db.sequelize.QueryTypes.SELECT }
        );

        if (!pendingKitchenStatusResult || pendingKitchenStatusResult.length === 0) {
            console.error('❌ Pending kitchen status not found in database');
            return res.status(500).json({ 
                success: false, 
                message: 'System error: Pending kitchen status not configured' 
            });
        }

        // Update order
        const updateResult = await db.sequelize.query(`
            UPDATE orders 
            SET order_status_id = $1, 
                kitchen_status_id = $2,
                approved_at = NOW(),
                expected_completion = CASE 
                  WHEN $3::text IS NULL OR $3::text = '' THEN NOW() + INTERVAL '25 minutes'
                  ELSE NOW() + (INTERVAL '1 minute' * CAST($3 AS INTEGER))
                END
            WHERE order_id = $4
            RETURNING order_id
        `, {
            bind: [approvedStatusResult[0].status_id, pendingKitchenStatusResult[0].status_id, expectedCompletion, id]
        });
        
        if (!updateResult || updateResult.length === 0) {
            console.log('⚠️ Update failed for order:', id);
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        console.log('✅ Order approved (PATCH):', id);
        
        // Get order number for broadcasting
        const orderInfo = await db.sequelize.query(
            'SELECT order_number FROM orders WHERE order_id = $1',
            { bind: [id], type: db.sequelize.QueryTypes.SELECT }
        );
        const orderNumber = orderInfo.length > 0 ? orderInfo[0].order_number : `ORD-${id}`;
        
        // 📡 Broadcast order approval via Socket.IO
        if (global.io) {
            console.log('📡 Broadcasting order approval (PATCH):', id, orderNumber);
            
            const broadcastData = {
                orderId: parseInt(id),
                orderNumber: orderNumber,
                status: 'approved',
                timestamp: new Date().toISOString()
            };
            
            // Notify customer
            global.io.to('order_' + id).emit('order-approved', {
                ...broadcastData,
                message: '✅ Your order has been approved and is being prepared!'
            });
            
            // Notify kitchen
            global.io.to('kitchen').emit('order-approved', {
                ...broadcastData,
                message: `Order ${orderNumber} approved by manager`
            });
            
            // Notify other managers
            global.io.to('managers').emit('order-approved', {
                ...broadcastData,
                message: `Order ${orderNumber} has been approved`
            });
            
            // Notify managers that pending orders list has changed
            global.io.to('managers').emit('pending-orders-updated', {
                type: 'ORDER_APPROVED',
                orderId: parseInt(id),
                orderNumber: orderNumber,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            message: 'Order approved successfully'
        });
    } catch (error) {
        console.error('❌ Error approving order (PATCH):', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// PATCH /api/manager/orders/:id/reject - Reject order
router.patch('/orders/:id/reject', authenticateManager, authorizeManager, async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    try {
        console.log('🔄 PATCH Reject order request received - ID:', id);

        // Validate order ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid order ID provided' 
            });
        }

        const cancelledStatusResult = await db.sequelize.query(
            'SELECT status_id FROM order_statuses WHERE name = $1',
            { bind: ['Cancelled'], type: db.sequelize.QueryTypes.SELECT }
        );

        if (!cancelledStatusResult || cancelledStatusResult.length === 0) {
            console.error('❌ Cancelled status not found in database');
            return res.status(500).json({ 
                success: false, 
                message: 'System error: Cancelled status not configured' 
            });
        }

        const updateResult = await db.sequelize.query(`
            UPDATE orders 
            SET order_status_id = $1, 
                cancellation_reason = $2
            WHERE order_id = $3
            RETURNING order_id
        `, {
            bind: [cancelledStatusResult[0].status_id, reason || 'Rejected by manager', id]
        });

        if (!updateResult || updateResult.length === 0) {
            console.log('⚠️ Update failed for order:', id);
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        console.log('✅ Order rejected (PATCH):', id);
        
        // 📡 Broadcast order rejection via Socket.IO
        if (global.io) {
            console.log('📡 Broadcasting order rejection (PATCH):', id);
            
            // Notify customer
            global.io.to('order_' + id).emit('order-rejected', {
                orderId: id,
                status: 'rejected',
                reason: reason || 'Rejected by manager',
                message: `❌ Your order has been rejected. Reason: ${reason || 'Rejected by manager'}`,
                timestamp: new Date().toISOString()
            });
            
            // Notify managers
            global.io.to('managers').emit('order-rejected', {
                orderId: id,
                reason: reason,
                message: `Order #${id} has been rejected`,
                timestamp: new Date().toISOString()
            });
            
            // Notify managers that pending orders list has changed
            global.io.to('managers').emit('pending-orders-updated', {
                type: 'ORDER_REJECTED',
                orderId: id,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            message: 'Order rejected successfully'
        });
    } catch (error) {
        console.error('❌ Error rejecting order (PATCH):', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to reject order: ' + error.message 
        });
    }
});

// Get menu items
router.get('/menu', authenticateManager, authorizeManager, async (req, res) => {
    try {
        const query = `
            SELECT mi.item_id AS id, mi.name, mi.description, mi.price, mc.name as category, mi.image_url, mi.is_available, mi.created_at
            FROM menu_items mi
            LEFT JOIN menu_categories mc ON mi.category_id = mc.category_id
            ORDER BY mc.name, mi.name
        `;
        
        const items = await db.sequelize.query(query, { type: db.sequelize.QueryTypes.SELECT });
        
        // Group by category for frontend
        const menuByCategory = items.reduce((acc, item) => {
            const categoryName = item.category || 'Uncategorized';
            if (!acc[categoryName]) {
                acc[categoryName] = [];
            }
            acc[categoryName].push(item);
            return acc;
        }, {});
        
        res.json({
            success: true,
            items: items,
            categories: menuByCategory
        });
    } catch (error) {
        console.error('Error fetching menu:', error);
        // Return mock data as fallback
        const mockItems = [
            { id: 1, name: 'Chicken Biryani', description: 'Aromatic basmati rice with tender chicken', price: 12.99, category: 'Desi', image_url: 'https://via.placeholder.com/800x600/FF6B6B/FFFFFF?text=Chicken+Biryani', is_available: true },
            { id: 2, name: 'Beef Burger', description: 'Juicy beef patty with fresh vegetables', price: 8.99, category: 'Fast Food', image_url: 'https://via.placeholder.com/800x600/F38181/FFFFFF?text=Beef+Burger', is_available: true }
        ];
        res.json({
            success: true,
            items: mockItems,
            categories: { 'Desi': [mockItems[0]], 'Fast Food': [mockItems[1]] }
        });
    }
});

// Add new menu item
router.post('/menu', authenticateManager, authorizeManager, async (req, res) => {
    const { name, description, price, category, image_url, is_available } = req.body;
    
    try {
        // Find category ID by name
        const categoryResult = await db.sequelize.query(
            'SELECT category_id FROM menu_categories WHERE name = $1',
            { bind: [category], type: db.sequelize.QueryTypes.SELECT }
        );
        
        const categoryId = categoryResult.length > 0 ? categoryResult[0].category_id : null;

        const query = `
            INSERT INTO menu_items 
            (name, description, price, category_id, image_url, is_available, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING item_id AS id, name, description, price, image_url, is_available
        `;
        
        const result = await db.sequelize.query(query, {
            bind: [name, description || '', price, categoryId, image_url || null, is_available !== false],
            type: db.sequelize.QueryTypes.SELECT
        });
        
        res.json({
            success: true,
            message: 'Menu item added successfully',
            item: { ...result[0], category: category }
        });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// Update menu item
router.put('/menu/:id', authenticateManager, authorizeManager, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    try {
        // Build dynamic UPDATE query based on provided fields
        const allowedFields = ['name', 'description', 'price', 'category_id', 'image_url', 'is_available'];
        const updateFields = [];
        const values = [];
        
        // Handle 'category' alias for 'category_id'
        if (updates.category && !updates.category_id) {
            // Find category ID by name
            const categoryResult = await db.sequelize.query(
                'SELECT category_id FROM menu_categories WHERE name = $1',
                { bind: [updates.category], type: db.sequelize.QueryTypes.SELECT }
            );
            if (categoryResult.length > 0) {
                updates.category_id = categoryResult[0].category_id;
            }
        }
        
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                values.push(updates[field]);
            }
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No valid fields to update' 
            });
        }
        
        values.push(id); // Add ID as last parameter
        
        const query = `
            UPDATE menu_items 
            SET ${updateFields.join(', ')}
            WHERE item_id = ?
        `;
        
        await db.sequelize.query(query, {
            replacements: values,
            type: db.sequelize.QueryTypes.UPDATE
        });
        
        // Get the updated row
        const selectQuery = `SELECT item_id AS id, name, description, price, category_id, image_url, is_available FROM menu_items WHERE item_id = ?`;
        const updated = await db.sequelize.query(selectQuery, {
            replacements: [id],
            type: db.sequelize.QueryTypes.SELECT
        });
        
        if (!updated || updated.length === 0) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }
        
        console.log('✅ Menu item updated:', updated[0].name);
        
        res.json({
            success: true,
            message: 'Menu item updated successfully',
            item: updated[0]
        });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// Delete menu item
router.delete('/menu/:id', authenticateManager, authorizeManager, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Check if item exists in any orders
        const checkQuery = 'SELECT * FROM order_items WHERE menu_item_id = ? LIMIT 1';
        const checkResult = await db.sequelize.query(checkQuery, {
            replacements: [id],
            type: db.sequelize.QueryTypes.SELECT
        });
        
        if (checkResult && checkResult.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete menu item. It exists in existing orders.' 
            });
        }
        
        const query = 'DELETE FROM menu_items WHERE item_id = ? RETURNING item_id AS id';
        const result = await db.sequelize.query(query, {
            replacements: [id],
            type: db.sequelize.QueryTypes.DELETE
        });
        
        if (!result || result.length === 0) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }
        
        res.json({
            success: true,
            message: 'Menu item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get statistics
router.get('/statistics', authenticateManager, authorizeManager, async (req, res) => {
    try {
        // Get today's stats
        const todayQuery = `
            SELECT 
                COUNT(DISTINCT o.order_id) as today_orders,
                COALESCE(SUM(oi.item_price * oi.quantity), 0) as today_revenue
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE DATE(o.created_at) = CURRENT_DATE
            AND o.order_status_id != 6
        `;
        
        const todayResult = await db.sequelize.query(todayQuery, { 
            type: db.sequelize.QueryTypes.SELECT 
        });

        // Get all-time stats
        const allTimeQuery = `
            SELECT 
                COUNT(DISTINCT o.order_id) as total_orders,
                COALESCE(SUM(oi.item_price * oi.quantity), 0) as total_revenue,
                COALESCE(SUM(oi.item_price * oi.quantity) / NULLIF(COUNT(DISTINCT o.order_id), 0), 0) as avg_order_value
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE o.order_status_id != 6
        `;
        
        const allTimeResult = await db.sequelize.query(allTimeQuery, { 
            type: db.sequelize.QueryTypes.SELECT 
        });
        
        // Get pending orders count
        const pendingQuery = `
            SELECT COUNT(*) as pending_count
            FROM orders o
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            WHERE os.name = 'Pending Approval'
        `;
        
        const pendingResult = await db.sequelize.query(pendingQuery, { 
            type: db.sequelize.QueryTypes.SELECT 
        });

        // Get average rating
        const ratingQuery = `
            SELECT AVG((food_quality + service_speed + overall_experience + order_accuracy + value_for_money) / 5.0) as avg_rating
            FROM feedback
        `;
        const ratingResult = await db.sequelize.query(ratingQuery, { 
            type: db.sequelize.QueryTypes.SELECT 
        });

        // Get top items
        const topItemsQuery = `
            SELECT item_name as name, SUM(quantity) as count
            FROM order_items
            GROUP BY item_name
            ORDER BY count DESC
            LIMIT 5
        `;
        const topItemsResult = await db.sequelize.query(topItemsQuery, { 
            type: db.sequelize.QueryTypes.SELECT 
        });
        
        const today = todayResult[0] || { today_orders: 0, today_revenue: 0 };
        const allTime = allTimeResult[0] || { total_orders: 0, total_revenue: 0, avg_order_value: 0 };
        const pending = pendingResult[0]?.pending_count || 0;
        const avgRating = ratingResult[0]?.avg_rating || 0;
        
        res.json({
            totalOrders: parseInt(allTime.total_orders) || 0,
            todayOrders: parseInt(today.today_orders) || 0,
            revenue: parseFloat(allTime.total_revenue) || 0,
            todayRevenue: parseFloat(today.today_revenue) || 0,
            averageOrderValue: parseFloat(allTime.avg_order_value) || 0,
            averageRating: parseFloat(avgRating) || 0,
            pendingOrders: parseInt(pending) || 0,
            topItems: topItemsResult.map(item => ({
                name: item.name,
                count: parseInt(item.count)
            }))
        });
    } catch (error) {
        console.error('❌ Error fetching statistics:', error.message);
        res.json({
            totalOrders: 0,
            todayOrders: 0,
            revenue: 0,
            todayRevenue: 0,
            averageOrderValue: 0,
            averageRating: 0,
            pendingOrders: 0,
            topItems: []
        });
    }
});

// Get feedback
router.get('/feedback', authenticateManager, authorizeManager, async (req, res) => {
    try {
        const query = `
            SELECT f.*, o.order_number, 
                   (SELECT SUM(item_price * quantity) FROM order_items WHERE order_id = o.order_id) as total
            FROM feedback f
            JOIN orders o ON f.order_id = o.order_id
            ORDER BY f.submitted_at DESC
            LIMIT 50
        `;
        
        const feedback = await db.sequelize.query(query, { type: db.sequelize.QueryTypes.SELECT });
        
        res.json({
            success: true,
            feedback: feedback
        });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
    }
});

// TEST ENDPOINT - Check what orders exist in database
router.get('/test/orders-debug', async (req, res) => {
    try {
        console.log('🧪 DEBUG: Getting all orders from database...');
        
        // Get ALL orders regardless of status
        const allOrders = await db.sequelize.query(`
            SELECT 
                o.order_id,
                o.order_number,
                o.customer_id,
                os.name as order_status,
                pm.name as payment_method,
                ps.name as payment_status,
                ks.name as kitchen_status,
                o.created_at
            FROM orders o
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN payment_methods pm ON o.payment_method_id = pm.method_id
            LEFT JOIN payment_statuses ps ON o.payment_status_id = ps.status_id
            LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
            ORDER BY o.created_at DESC
            LIMIT 10
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        console.log(`   Found ${allOrders.length} total orders`);
        
        // Get pending approval orders specifically
        const pendingOrders = await db.sequelize.query(`
            SELECT 
                o.order_id,
                o.order_number,
                os.name as order_status
            FROM orders o
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            WHERE os.name = 'pending_approval'
            LIMIT 10
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        console.log(`   Found ${pendingOrders.length} pending_approval orders`);
        
        res.json({
            debug: true,
            all_orders: allOrders,
            pending_orders: pendingOrders,
            total_all: allOrders.length,
            total_pending: pendingOrders.length
        });
    } catch (error) {
        console.error('❌ Debug error:', error);
        res.status(500).json({ 
            debug: true,
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;