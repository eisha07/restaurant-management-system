// server/routes/kitchenRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateKitchen } = require('../middleware/kitchenAuth');

// Get all active orders for kitchen
router.get('/orders/active', authenticateKitchen, async (req, res) => {
    try {
        // Get orders from database with kitchen status
        const ordersQuery = `
            SELECT o.order_id, o.order_number, rt.table_number, c.name as customer_name,
                   ks.name as kitchen_status, ks.code as kitchen_status_code, 
                   os.name as order_status, os.code as order_status_code,
                   o.special_instructions, o.created_at, o.expected_completion
            FROM orders o
            LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            WHERE (ks.code IN ('pending', 'preparing', 'ready') OR ks.code IS NULL)
            AND os.code IN ('approved', 'in_progress', 'ready')
            ORDER BY o.created_at ASC
        `;
        
        const orders = await db.sequelize.query(ordersQuery, { 
            type: db.sequelize.QueryTypes.SELECT 
        });
        
        // Get all items for these orders
        if (orders.length === 0) {
            return res.json({
                success: true,
                orders: [],
                groupedOrders: { pending: [], preparing: [], ready: [] },
                total: 0
            });
        }
        
        const orderIds = orders.map(o => o.order_id).join(',');
        const itemsQuery = `
            SELECT order_id, order_item_id, item_name, item_price, quantity, special_instructions 
            FROM order_items 
            WHERE order_id IN (${orderIds})
        `;
        
        const items = await db.sequelize.query(itemsQuery, { 
            type: db.sequelize.QueryTypes.SELECT 
        });
        
        // Map items to orders
        const itemsByOrderId = {};
        items.forEach(item => {
            if (!itemsByOrderId[item.order_id]) {
                itemsByOrderId[item.order_id] = [];
            }
            itemsByOrderId[item.order_id].push({
                name: item.item_name,
                price: item.item_price,
                quantity: item.quantity,
                special_instructions: item.special_instructions
            });
        });
        
        // Combine orders with items
        const ordersWithItems = orders.map(order => ({
            id: order.order_id,
            order_number: order.order_number,
            table_number: order.table_number,
            customer_name: order.customer_name,
            status: order.order_status_code, // Use main order status code
            order_status: order.order_status,
            kitchen_status: order.kitchen_status || 'Pending',
            kitchen_status_code: order.kitchen_status_code || 'pending',
            special_instructions: order.special_instructions,
            created_at: order.created_at,
            expected_completion: order.expected_completion,
            items: itemsByOrderId[order.order_id] || []
        }));
        
        // Group by status - map to Kanban columns
        const groupedOrders = {
            pending: ordersWithItems.filter(o => o.kitchen_status_code === 'pending'),
            preparing: ordersWithItems.filter(o => o.kitchen_status_code === 'preparing'),
            ready: ordersWithItems.filter(o => o.kitchen_status_code === 'ready')
        };

        res.json({
            success: true,
            orders: ordersWithItems,
            groupedOrders: groupedOrders,
            total: ordersWithItems.length
        });
    } catch (error) {
        console.error('Error fetching kitchen orders:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// Update order status (kitchen side)
router.put('/orders/:id/status', authenticateKitchen, async (req, res) => {
    const { id } = req.params;
    const { status_code, expected_completion, notes } = req.body;
    
    try {
        // Get status ID from code
        const statusQuery = `SELECT status_id FROM kitchen_statuses WHERE code = ?`;
        const statusResult = await db.sequelize.query(statusQuery, { 
            replacements: [status_code],
            type: db.sequelize.QueryTypes.SELECT 
        });
        
        if (statusResult.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid status code' });
        }
        
        const statusId = statusResult[0].status_id;
        
        // Update order kitchen status (only update expected_completion if provided)
        let updateOrderQuery, replacements;
        if (expected_completion) {
            updateOrderQuery = `
                UPDATE orders 
                SET kitchen_status_id = ?,
                    expected_completion = ?,
                    updated_at = NOW()
                WHERE order_id = ?
            `;
            replacements = [statusId, expected_completion, id];
        } else {
            updateOrderQuery = `
                UPDATE orders 
                SET kitchen_status_id = ?,
                    updated_at = NOW()
                WHERE order_id = ?
            `;
            replacements = [statusId, id];
        }
        
        await db.sequelize.query(updateOrderQuery, { 
            replacements,
            type: db.sequelize.QueryTypes.UPDATE 
        });

        // 📡 Broadcast order update via Socket.IO IMMEDIATELY for better UX
        if (global.io) {
            console.log('📡 Broadcasting order status update:', id, status_code);
            
            const broadcastData = {
                orderId: parseInt(id),
                status: status_code,
                statusDisplay: status_code.replace(/_/g, ' ').toUpperCase(),
                message: `Your order is now ${status_code.replace(/_/g, ' ').toUpperCase()}`,
                timestamp: new Date().toISOString()
            };

            global.io.to('managers').emit('order-update', broadcastData);
            global.io.to('kitchen').emit('order-update', broadcastData);
            global.io.to('order_' + id).emit('order-update', broadcastData);
        }

        // Sync main order status if it's a terminal or ready status
        // 'preparing' in kitchen maps to 'in_progress' in main status
        const syncStatusMap = {
            'preparing': 'in_progress',
            'ready': 'ready',
            'completed': 'completed',
            'cancelled': 'cancelled'
        };

        if (syncStatusMap[status_code]) {
            try {
                const mainStatusCode = syncStatusMap[status_code];
                const mainStatusQuery = `SELECT status_id FROM order_statuses WHERE code = ?`;
                const mainStatusResult = await db.sequelize.query(mainStatusQuery, {
                    replacements: [mainStatusCode],
                    type: db.sequelize.QueryTypes.SELECT
                });

                if (mainStatusResult.length > 0) {
                    const mainStatusId = mainStatusResult[0].status_id;
                    await db.sequelize.query(`
                        UPDATE orders 
                        SET order_status_id = ?, 
                            updated_at = NOW() 
                        WHERE order_id = ?
                    `, {
                        replacements: [mainStatusId, id],
                        type: db.sequelize.QueryTypes.UPDATE
                    });
                    console.log(`✅ Synced main order status to ${mainStatusCode} for order ${id}`);
                }
            } catch (syncError) {
                console.warn('Failed to sync main order status:', syncError.message);
            }
        }
        
        // Create kitchen log (optional, ignore if fails)
        try {
            const logQuery = `
                INSERT INTO kitchen_logs 
                (order_id, status_id, updated_by, notes, created_at)
                VALUES (?, ?, ?, ?, NOW())
            `;
            
            await db.sequelize.query(logQuery, { 
                replacements: [id, statusId, 1, notes || `Status changed to ${status_code}`],
                type: db.sequelize.QueryTypes.INSERT 
            });
        } catch (logError) {
            console.warn('Failed to create kitchen log:', logError.message);
        }
        
        res.json({
            success: true,
            message: `Order status updated to ${status_code}`,
            orderId: id
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// Set expected completion time
router.put('/orders/:id/expected-time', authenticateKitchen, async (req, res) => {
    const { id } = req.params;
    const { expected_completion } = req.body;
    const { minutes } = req.body; // Alternative: minutes from now
    
    try {
        let completionTime = expected_completion;
        
        if (minutes && !expected_completion) {
            completionTime = `NOW() + INTERVAL '${minutes} minutes'`;
        }
        
        const query = `
            UPDATE orders 
            SET expected_completion = COALESCE($1, expected_completion)
            WHERE id = $2 
            RETURNING *
        `;
        
        const result = await db.query(query, [completionTime, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Log the time update
        await db.query(
            'INSERT INTO kitchen_logs (order_id, status, notes) VALUES ($1, $2, $3)',
            [id, 'time_updated', `Expected completion set to ${completionTime || `${minutes} minutes`}`]
        );
        
        // 📡 Broadcast expected time update via Socket.IO
        if (global.io) {
            console.log('📡 Broadcasting expected time update:', id);
            global.io.to('order_' + id).emit('order-update', {
                orderId: id,
                expectedTime: completionTime,
                minutesRemaining: minutes,
                message: `Your order will be ready in approximately ${minutes} minutes`,
                timestamp: new Date().toISOString()
            });
            
            global.io.to('managers').emit('order-update', {
                orderId: id,
                expectedTime: completionTime,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            message: 'Expected time updated',
            order: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating expected time:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get order timeline/history
router.get('/orders/:id/timeline', authenticateKitchen, async (req, res) => {
    const { id } = req.params;
    
    try {
        const query = `
            SELECT * FROM kitchen_logs 
            WHERE order_id = $1 
            ORDER BY created_at DESC
        `;
        
        const result = await db.query(query, [id]);
        
        res.json({
            success: true,
            timeline: result.rows
        });
    } catch (error) {
        console.error('Error fetching order timeline:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get kitchen statistics for the day
router.get('/statistics/today', authenticateKitchen, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const ordersQuery = `
            SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN kitchen_status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN kitchen_status = 'ready' THEN 1 ELSE 0 END) as ready,
                AVG(EXTRACT(EPOCH FROM (completed_at - approved_at))/60) as avg_prep_time
            FROM orders 
            WHERE DATE(created_at) = $1 
            AND status NOT IN ('pending_approval', 'rejected')
        `;
        
        const itemsQuery = `
            SELECT mi.name, SUM(oi.quantity) as quantity
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            JOIN orders o ON oi.order_id = o.id
            WHERE DATE(o.created_at) = $1 
            AND o.status NOT IN ('pending_approval', 'rejected')
            GROUP BY mi.name
            ORDER BY quantity DESC
            LIMIT 5
        `;
        
        const [ordersResult, itemsResult] = await Promise.all([
            db.query(ordersQuery, [today]),
            db.query(itemsQuery, [today])
        ]);
        
        res.json({
            success: true,
            statistics: {
                daily: ordersResult.rows[0],
                topItems: itemsResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching kitchen statistics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Play sound alert for new orders (optional)
router.post('/notify/new-order', authenticateKitchen, async (req, res) => {
    const { orderId } = req.body;
    
    try {
        // This would trigger a WebSocket event or push notification
        // For now, just log it
        console.log(`New order notification: ${orderId}`);
        
        res.json({
            success: true,
            message: 'Notification sent'
        });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;