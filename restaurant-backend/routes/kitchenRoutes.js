// server/routes/kitchenRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateKitchen } = require('../middleware/kitchenAuth');

// Get all active orders for kitchen
router.get('/orders/active', authenticateKitchen, async (req, res) => {
    try {
        // Get orders from database - match actual database statuses
        const ordersQuery = `
            SELECT id, order_number, table_number, status, kitchen_status, 
                   total, special_instructions, created_at, expected_completion
            FROM orders 
            WHERE kitchen_status IN ('received', 'preparing', 'ready')
            ORDER BY created_at ASC
        `;
        
        const orders = await db.sequelize.query(ordersQuery, { 
            type: db.sequelize.QueryTypes.SELECT 
        });
        
        // Get all items for these orders
        if (orders.length === 0) {
            return res.json({
                success: true,
                orders: [],
                groupedOrders: { received: [], preparing: [], ready: [] },
                total: 0
            });
        }
        
        const orderIds = orders.map(o => o.id).join(',');
        const itemsQuery = `
            SELECT order_id, id, name, price, quantity, special_instructions 
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
            itemsByOrderId[item.order_id].push(item);
        });
        
        // Combine orders with items
        const ordersWithItems = orders.map(order => ({
            ...order,
            items: itemsByOrderId[order.id] || []
        }));
        
        // Group by status - map to Kanban columns
        const groupedOrders = {
            received: ordersWithItems.filter(o => o.kitchen_status === 'received'),
            preparing: ordersWithItems.filter(o => o.kitchen_status === 'preparing'),
            ready: ordersWithItems.filter(o => o.kitchen_status === 'ready')
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
    const { status, expected_completion, notes } = req.body;
    
    try {
        // Start transaction
        await db.query('BEGIN');
        
        // Update order
        const updateOrderQuery = `
            UPDATE orders 
            SET kitchen_status = $1,
                status = CASE 
                    WHEN $1 = 'ready' THEN 'ready'
                    WHEN $1 = 'preparing' THEN 'in_progress'
                    ELSE status
                END,
                expected_completion = COALESCE($2, expected_completion)
            WHERE id = $3 
            RETURNING *
        `;
        
        const orderResult = await db.query(updateOrderQuery, [
            status, 
            expected_completion, 
            id
        ]);
        
        if (orderResult.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Create kitchen log
        const logQuery = `
            INSERT INTO kitchen_logs 
            (order_id, status, notes, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING *
        `;
        
        await db.query(logQuery, [id, status, notes || `Status changed to ${status}`]);
        
        // If order is marked as ready, update main status
        if (status === 'ready') {
            await db.query(
                'UPDATE orders SET status = $1 WHERE id = $2',
                ['ready', id]
            );
        }
        
        await db.query('COMMIT');
        
        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            order: orderResult.rows[0]
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
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