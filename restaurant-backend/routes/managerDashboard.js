 // server/routes/managerDashboard.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateManager, authorizeManager } = require('../middleware/auth');

// Get all pending orders
router.get('/orders/pending', authenticateManager, authorizeManager, async (req, res) => {
    try {
        const query = `
            SELECT 
                o.id, o.order_number, o.customer_id, o.table_number, 
                o.subtotal, o.tax, o.total, o.payment_method, 
                o.payment_status, o.status, o.kitchen_status,
                o.special_instructions, o.created_at,
                json_agg(
                    json_build_object(
                        'id', oi.id,
                        'name', oi.name,
                        'price', oi.price,
                        'quantity', oi.quantity,
                        'special_instructions', oi.special_instructions
                    )
                ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'pending_approval'
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;
        
        const orders = await db.sequelize.query(query, { type: db.sequelize.QueryTypes.SELECT });
        res.json({
            success: true,
            count: orders.length,
            orders: orders
        });
    } catch (error) {
        console.error('Error fetching pending orders:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get all orders (approved, in_progress, ready)
router.get('/orders/all', authenticateManager, authorizeManager, async (req, res) => {
    try {
        const query = `
            SELECT 
                o.id, o.order_number, o.customer_id, o.table_number, 
                o.subtotal, o.tax, o.total, o.payment_method, 
                o.payment_status, o.status, o.kitchen_status,
                o.special_instructions, o.created_at, o.expected_completion,
                json_agg(
                    json_build_object(
                        'id', oi.id,
                        'name', oi.name,
                        'price', oi.price,
                        'quantity', oi.quantity
                    )
                ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status IN ('approved', 'in_progress', 'ready', 'completed')
            GROUP BY o.id
            ORDER BY 
                CASE o.status
                    WHEN 'in_progress' THEN 1
                    WHEN 'approved' THEN 2
                    WHEN 'ready' THEN 3
                    WHEN 'completed' THEN 4
                    ELSE 5
                END,
                o.created_at DESC
        `;
        
        const orders = await db.sequelize.query(query, { type: db.sequelize.QueryTypes.SELECT });
        res.json({
            success: true,
            orders: orders
        });
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Approve order
router.put('/orders/:id/approve', authenticateManager, authorizeManager, async (req, res) => {
    const { id } = req.params;
    const { expectedCompletion } = req.body;
    
    try {
        const query = `
            UPDATE orders 
            SET status = 'approved', 
                kitchen_status = 'received',
                approved_at = NOW(),
                expected_completion = COALESCE($1, NOW() + INTERVAL '25 minutes')
            WHERE id = $2 
            RETURNING *
        `;
        
        const result = await db.sequelize.query(query, {
            replacements: [expectedCompletion, id],
            type: db.sequelize.QueryTypes.UPDATE
        });
        
        if (!result || result.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Create kitchen log
        await db.sequelize.query(
            'INSERT INTO kitchen_logs (order_id, status, notes) VALUES (?, ?, ?)',
            {
                replacements: [id, 'received', 'Order approved by manager'],
                type: db.sequelize.QueryTypes.INSERT
            }
        );
        
        res.json({
            success: true,
            message: 'Order approved successfully',
            order: result.rows[0]
        });
    } catch (error) {
        console.error('Error approving order:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Reject order
router.put('/orders/:id/reject', authenticateManager, authorizeManager, async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    try {
        const query = 'UPDATE orders SET status = ? WHERE id = ? RETURNING *';
        const result = await db.sequelize.query(query, {
            replacements: ['rejected', id],
            type: db.sequelize.QueryTypes.UPDATE
        });
        
        if (!result || result.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Log the rejection
        await db.sequelize.query(
            'INSERT INTO kitchen_logs (order_id, status, notes) VALUES (?, ?, ?)',
            {
                replacements: [id, 'rejected', `Order rejected by manager. Reason: ${reason || 'No reason provided'}`],
                type: db.sequelize.QueryTypes.INSERT
            }
        );
        
        res.json({
            success: true,
            message: 'Order rejected successfully',
            order: result.rows[0]
        });
    } catch (error) {
        console.error('Error rejecting order:', error);
        res.status(500).json({ success: false, message: 'Server error' });
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

// Get menu items
router.get('/menu', authenticateManager, authorizeManager, async (req, res) => {
    try {
        const query = `
            SELECT id, name, description, price, category, image_url, is_available, created_at
            FROM menu_items 
            ORDER BY category, name
        `;
        
        const items = await db.sequelize.query(query, { type: db.sequelize.QueryTypes.SELECT });
        
        // Group by category for frontend
        const menuByCategory = items.reduce((acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push(item);
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
            { id: 1, name: 'Chicken Biryani', description: 'Aromatic basmati rice with tender chicken', price: 12.99, category: 'Desi', image_url: 'https://images.unsplash.com/photo-1563379091339-03246963d9d6?w=800&auto=format&fit=crop', is_available: true },
            { id: 2, name: 'Beef Burger', description: 'Juicy beef patty with fresh vegetables', price: 8.99, category: 'Fast Food', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop', is_available: true }
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
        const query = `
            INSERT INTO menu_items 
            (name, description, price, category, image_url, is_available, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *
        `;
        
        const result = await db.sequelize.query(query, {
            replacements: [name, description, price, category, image_url, is_available !== false],
            type: db.sequelize.QueryTypes.INSERT
        });
        
        res.json({
            success: true,
            message: 'Menu item added successfully',
            item: result[0]
        });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update menu item
router.put('/menu/:id', authenticateManager, authorizeManager, async (req, res) => {
    const { id } = req.params;
    const { name, description, price, category, image_url, is_available } = req.body;
    
    try {
        const query = `
            UPDATE menu_items 
            SET name = $1, description = $2, price = $3, 
                category = $4, image_url = $5, is_available = $6
            WHERE id = $7
            RETURNING *
        `;
        
        const result = await db.sequelize.query(query, {
            replacements: [name, description, price, category, image_url, is_available, id],
            type: db.sequelize.QueryTypes.UPDATE
        });
        
        if (!result || result.length === 0) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }
        
        res.json({
            success: true,
            message: 'Menu item updated successfully',
            item: result[0]
        });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ success: false, message: 'Server error' });
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
        
        const query = 'DELETE FROM menu_items WHERE id = ? RETURNING *';
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
    const { start_date, end_date } = req.query;
    
    try {
        // Total revenue
        const revenueQuery = `
            SELECT COALESCE(SUM(total), 0) as total_revenue,
                   COUNT(*) as total_orders,
                   AVG(total) as avg_order_value
            FROM orders 
            WHERE status IN ('completed', 'ready')
            AND created_at BETWEEN COALESCE($1, NOW() - INTERVAL '7 days') AND COALESCE($2, NOW())
        `;
        
        // Top selling items
        const topItemsQuery = `
            SELECT mi.name, SUM(oi.quantity) as total_quantity,
                   SUM(oi.price * oi.quantity) as total_revenue
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status IN ('completed', 'ready')
            AND o.created_at BETWEEN COALESCE($1, NOW() - INTERVAL '7 days') AND COALESCE($2, NOW())
            GROUP BY mi.name
            ORDER BY total_quantity DESC
            LIMIT 10
        `;
        
        // Sales by category
        const categoryQuery = `
            SELECT mi.category, COUNT(DISTINCT o.id) as order_count,
                   SUM(oi.quantity) as item_count,
                   SUM(oi.price * oi.quantity) as category_revenue
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            WHERE o.status IN ('completed', 'ready')
            AND o.created_at BETWEEN COALESCE($1, NOW() - INTERVAL '7 days') AND COALESCE($2, NOW())
            GROUP BY mi.category
            ORDER BY category_revenue DESC
        `;
        
        // Daily sales trend
        const dailyTrendQuery = `
            SELECT DATE(created_at) as date,
                   COUNT(*) as orders,
                   SUM(total) as revenue
            FROM orders
            WHERE status IN ('completed', 'ready')
            AND created_at BETWEEN COALESCE($1, NOW() - INTERVAL '30 days') AND COALESCE($2, NOW())
            GROUP BY DATE(created_at)
            ORDER BY date
        `;
        
        const [revenueResult, topItemsResult, categoryResult, dailyTrendResult] = await Promise.all([
            db.sequelize.query(revenueQuery, { replacements: [start_date, end_date], type: db.sequelize.QueryTypes.SELECT }),
            db.sequelize.query(topItemsQuery, { replacements: [start_date, end_date], type: db.sequelize.QueryTypes.SELECT }),
            db.sequelize.query(categoryQuery, { replacements: [start_date, end_date], type: db.sequelize.QueryTypes.SELECT }),
            db.sequelize.query(dailyTrendQuery, { replacements: [start_date, end_date], type: db.sequelize.QueryTypes.SELECT })
        ]);
        
        res.json({
            success: true,
            statistics: {
                overview: revenueResult[0],
                topItems: topItemsResult,
                categories: categoryResult,
                dailyTrend: dailyTrendResult
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get feedback
router.get('/feedback', authenticateManager, authorizeManager, async (req, res) => {
    try {
        const query = `
            SELECT f.*, o.order_number, o.total
            FROM feedback f
            JOIN orders o ON f.order_id = o.id
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
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;