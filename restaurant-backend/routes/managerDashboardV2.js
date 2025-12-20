/**
 * Manager Dashboard Integration Layer
 * Connects frontend manager components with backend API endpoints
 * Works with the normalized 3NF database schema
 */

const express = require('express');
const router = express.Router();
const { sequelize, QueryTypes } = require('../config/database');
const { authenticateManager, authorizeManager } = require('../middleware/auth');
const {
    OrderQueries,
    MenuQueries,
    AnalyticsQueries,
    FeedbackQueries,
    TableQueries,
    PaymentQueries
} = require('../db/database-helpers');

// =============================================
// MIDDLEWARE - Log all manager requests
// =============================================

router.use((req, res, next) => {
    console.log(`\n📊 MANAGER REQUEST: ${req.method} ${req.originalUrl}`);
    console.log(`⏰ Time: ${new Date().toLocaleTimeString()}`);
    next();
});

// =============================================
// ORDER ENDPOINTS
// =============================================

/**
 * GET /api/manager/orders/pending
 * Get all pending orders awaiting manager approval
 */
router.get('/orders/pending', async (req, res) => {
    try {
        console.log('🔍 Fetching pending orders...');
        
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
                ks.name as kitchen_status,
                o.special_instructions,
                o.created_at,
                SUM(oi.item_price * oi.quantity) as total
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN payment_methods pm ON o.payment_method_id = pm.method_id
            LEFT JOIN payment_statuses ps ON o.payment_status_id = ps.status_id
            LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE os.code = 'pending'
            GROUP BY o.order_id, c.customer_id, rt.table_id, os.status_id, pm.method_id, ps.status_id, ks.status_id
            ORDER BY o.created_at DESC
        `, { type: QueryTypes.SELECT });

        // Fetch items for each order
        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                const items = await sequelize.query(`
                    SELECT 
                        order_item_id as id,
                        menu_item_id,
                        item_name as name,
                        item_price as price,
                        quantity,
                        special_instructions
                    FROM order_items
                    WHERE order_id = ?
                `, {
                    replacements: [order.id],
                    type: QueryTypes.SELECT
                });

                return {
                    ...order,
                    items: items,
                    total: parseFloat(order.total || 0).toFixed(2)
                };
            })
        );

        console.log(`✅ Found ${ordersWithItems.length} pending orders`);
        
        res.json({
            success: true,
            count: ordersWithItems.length,
            orders: ordersWithItems
        });
    } catch (error) {
        console.error('❌ Error fetching pending orders:', error.message);
        res.json({
            success: true,
            count: 0,
            orders: [],
            error: error.message
        });
    }
});

/**
 * GET /api/manager/orders/all
 * Get all orders in progress or ready for delivery
 */
router.get('/orders/all', async (req, res) => {
    try {
        console.log('🔍 Fetching all active orders...');

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
                ks.name as kitchen_status,
                o.special_instructions,
                o.created_at,
                o.expected_completion,
                SUM(oi.item_price * oi.quantity) as total
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN payment_methods pm ON o.payment_method_id = pm.method_id
            LEFT JOIN payment_statuses ps ON o.payment_status_id = ps.status_id
            LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE os.code IN ('approved', 'preparing', 'ready', 'completed')
            GROUP BY o.order_id, c.customer_id, rt.table_id, os.status_id, pm.method_id, ps.status_id, ks.status_id
            ORDER BY 
                CASE os.code
                    WHEN 'preparing' THEN 1
                    WHEN 'approved' THEN 2
                    WHEN 'ready' THEN 3
                    WHEN 'completed' THEN 4
                    ELSE 5
                END,
                o.created_at DESC
        `, { type: QueryTypes.SELECT });

        // Fetch items for each order
        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                const items = await sequelize.query(`
                    SELECT 
                        order_item_id as id,
                        menu_item_id,
                        item_name as name,
                        item_price as price,
                        quantity,
                        special_instructions
                    FROM order_items
                    WHERE order_id = ?
                `, {
                    replacements: [order.id],
                    type: QueryTypes.SELECT
                });

                return {
                    ...order,
                    items: items,
                    total: parseFloat(order.total || 0).toFixed(2)
                };
            })
        );

        console.log(`✅ Found ${ordersWithItems.length} active orders`);

        res.json({
            success: true,
            count: ordersWithItems.length,
            orders: ordersWithItems
        });
    } catch (error) {
        console.error('❌ Error fetching all orders:', error.message);
        res.json({
            success: true,
            count: 0,
            orders: [],
            error: error.message
        });
    }
});

/**
 * PUT/PATCH /api/manager/orders/:orderId/approve
 * Approve a pending order and send to kitchen
 */
router.put('/orders/:orderId/approve', async (req, res) => {
    const { orderId } = req.params;
    const { expectedCompletion } = req.body;

    try {
        console.log(`✅ Approving order ${orderId}, expected time: ${expectedCompletion} minutes`);

        // Get status IDs
        const [approvedStatus] = await sequelize.query(`
            SELECT status_id FROM order_statuses WHERE code = 'approved' LIMIT 1
        `, { type: QueryTypes.SELECT });

        const [inProgressStatus] = await sequelize.query(`
            SELECT status_id FROM kitchen_statuses WHERE code = 'in_progress' LIMIT 1
        `, { type: QueryTypes.SELECT });

        if (!approvedStatus || !inProgressStatus) {
            return res.status(500).json({
                success: false,
                message: 'System configuration error: Status codes not found'
            });
        }

        // Update order
        await sequelize.query(`
            UPDATE orders 
            SET 
                order_status_id = ?,
                kitchen_status_id = ?,
                approved_at = NOW(),
                expected_completion = NOW() + INTERVAL '${parseInt(expectedCompletion) || 25} minutes',
                updated_at = NOW()
            WHERE order_id = ?
        `, {
            replacements: [approvedStatus.status_id, inProgressStatus.status_id, orderId],
            type: QueryTypes.UPDATE
        });

        // Create kitchen log
        await sequelize.query(`
            INSERT INTO kitchen_logs (order_id, status_id, notes, created_at)
            VALUES (?, ?, ?, NOW())
        `, {
            replacements: [orderId, inProgressStatus.status_id, 'Order approved by manager'],
            type: QueryTypes.INSERT
        });

        console.log(`✅ Order ${orderId} approved successfully`);

        // Broadcast via Socket.IO if available
        if (global.io) {
            global.io.to('managers').emit('order-approved', {
                orderId,
                message: `Order #${orderId} approved`,
                timestamp: new Date().toISOString()
            });
            global.io.to('kitchen').emit('order-ready-to-prepare', {
                orderId,
                message: `New order ready to prepare`
            });
        }

        res.json({
            success: true,
            message: 'Order approved successfully',
            orderId
        });
    } catch (error) {
        console.error('❌ Error approving order:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to approve order: ' + error.message
        });
    }
});

router.patch('/orders/:orderId/approve', (req, res) => {
    router._dispatch(req, res);
});

/**
 * PUT/PATCH /api/manager/orders/:orderId/reject
 * Reject a pending order
 */
router.put('/orders/:orderId/reject', async (req, res) => {
    const { orderId } = req.params;
    const { reason } = req.body;

    try {
        console.log(`❌ Rejecting order ${orderId}, reason: ${reason}`);

        // Get cancelled status ID
        const [cancelledStatus] = await sequelize.query(`
            SELECT status_id FROM order_statuses WHERE code = 'cancelled' LIMIT 1
        `, { type: QueryTypes.SELECT });

        if (!cancelledStatus) {
            return res.status(500).json({
                success: false,
                message: 'System configuration error: Cancelled status not found'
            });
        }

        // Update order
        await sequelize.query(`
            UPDATE orders 
            SET 
                order_status_id = ?,
                cancellation_reason = ?,
                cancelled_at = NOW(),
                updated_at = NOW()
            WHERE order_id = ?
        `, {
            replacements: [cancelledStatus.status_id, reason || 'Rejected by manager', orderId],
            type: QueryTypes.UPDATE
        });

        console.log(`✅ Order ${orderId} rejected successfully`);

        // Broadcast via Socket.IO
        if (global.io) {
            global.io.to('managers').emit('order-rejected', {
                orderId,
                reason: reason || 'Rejected by manager'
            });
        }

        res.json({
            success: true,
            message: 'Order rejected successfully',
            orderId
        });
    } catch (error) {
        console.error('❌ Error rejecting order:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to reject order: ' + error.message
        });
    }
});

router.patch('/orders/:orderId/reject', (req, res) => {
    router._dispatch(req, res);
});

/**
 * PUT /api/manager/orders/:orderId/status
 * Update order or kitchen status
 */
router.put('/orders/:orderId/status', async (req, res) => {
    const { orderId } = req.params;
    const { status, kitchen_status } = req.body;

    try {
        console.log(`🔄 Updating order ${orderId} status to ${status}/${kitchen_status}`);

        let updateQuery = 'UPDATE orders SET updated_at = NOW()';
        let params = [];

        if (status) {
            const [statusRow] = await sequelize.query(`
                SELECT status_id FROM order_statuses WHERE code = ? LIMIT 1
            `, {
                replacements: [status],
                type: QueryTypes.SELECT
            });

            if (statusRow) {
                updateQuery += ', order_status_id = ?';
                params.push(statusRow.status_id);
            }
        }

        if (kitchen_status) {
            const [kitchenStatusRow] = await sequelize.query(`
                SELECT status_id FROM kitchen_statuses WHERE code = ? LIMIT 1
            `, {
                replacements: [kitchen_status],
                type: QueryTypes.SELECT
            });

            if (kitchenStatusRow) {
                updateQuery += ', kitchen_status_id = ?';
                params.push(kitchenStatusRow.status_id);
            }
        }

        updateQuery += ' WHERE order_id = ?';
        params.push(orderId);

        await sequelize.query(updateQuery, {
            replacements: params,
            type: QueryTypes.UPDATE
        });

        console.log(`✅ Order ${orderId} status updated`);

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating order status:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
});

// =============================================
// STATISTICS & ANALYTICS ENDPOINTS
// =============================================

/**
 * GET /api/manager/statistics
 * Get dashboard statistics
 */
router.get('/statistics', async (req, res) => {
    try {
        console.log('📊 Fetching statistics...');

        const [stats] = await sequelize.query(`
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN o.order_status_id = (SELECT status_id FROM order_statuses WHERE code = 'completed') THEN 1 END) as completed_orders,
                COUNT(CASE WHEN o.order_status_id = (SELECT status_id FROM order_statuses WHERE code = 'cancelled') THEN 1 END) as cancelled_orders,
                COALESCE(SUM(oi.item_price * oi.quantity), 0) as total_revenue,
                COALESCE(AVG(oi.item_price * oi.quantity), 0) as avg_order_value,
                COUNT(CASE WHEN o.order_status_id = (SELECT status_id FROM order_statuses WHERE code = 'pending') THEN 1 END) as pending_orders
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE DATE(o.created_at) = CURRENT_DATE
        `, { type: QueryTypes.SELECT });

        const response = {
            success: true,
            statistics: {
                totalOrders: parseInt(stats.total_orders) || 0,
                completedOrders: parseInt(stats.completed_orders) || 0,
                cancelledOrders: parseInt(stats.cancelled_orders) || 0,
                totalRevenue: parseFloat(stats.total_revenue).toFixed(2),
                averageOrderValue: parseFloat(stats.avg_order_value).toFixed(2),
                pendingOrders: parseInt(stats.pending_orders) || 0
            }
        };

        console.log('✅ Statistics retrieved:', response.statistics);

        res.json(response);
    } catch (error) {
        console.error('❌ Error fetching statistics:', error.message);
        res.json({
            success: true,
            statistics: {
                totalOrders: 0,
                completedOrders: 0,
                cancelledOrders: 0,
                totalRevenue: '0.00',
                averageOrderValue: '0.00',
                pendingOrders: 0
            },
            error: error.message
        });
    }
});

// =============================================
// FEEDBACK ENDPOINTS
// =============================================

/**
 * GET /api/manager/feedback
 * Get recent customer feedback
 */
router.get('/feedback', async (req, res) => {
    try {
        console.log('📝 Fetching feedback...');

        const feedback = await sequelize.query(`
            SELECT 
                f.feedback_id,
                f.order_id,
                o.order_number,
                c.name as customer_name,
                f.food_quality,
                f.service_speed,
                f.overall_experience,
                f.order_accuracy,
                f.value_for_money,
                f.comment,
                f.submitted_at
            FROM feedback f
            LEFT JOIN orders o ON f.order_id = o.order_id
            LEFT JOIN customers c ON f.customer_id = c.customer_id
            ORDER BY f.submitted_at DESC
            LIMIT 50
        `, { type: QueryTypes.SELECT });

        console.log(`✅ Found ${feedback.length} feedback records`);

        res.json({
            success: true,
            feedback: feedback,
            count: feedback.length
        });
    } catch (error) {
        console.error('❌ Error fetching feedback:', error.message);
        res.json({
            success: true,
            feedback: [],
            count: 0,
            error: error.message
        });
    }
});

/**
 * GET /api/manager/feedback/ratings
 * Get average ratings
 */
router.get('/feedback/ratings', async (req, res) => {
    try {
        console.log('⭐ Calculating average ratings...');

        const [ratings] = await sequelize.query(`
            SELECT 
                ROUND(AVG(food_quality)::numeric, 2) as avg_food_quality,
                ROUND(AVG(service_speed)::numeric, 2) as avg_service_speed,
                ROUND(AVG(overall_experience)::numeric, 2) as avg_overall,
                ROUND(AVG(order_accuracy)::numeric, 2) as avg_accuracy,
                ROUND(AVG(value_for_money)::numeric, 2) as avg_value,
                COUNT(*) as total_feedback
            FROM feedback
            WHERE submitted_at >= NOW() - INTERVAL '30 days'
        `, { type: QueryTypes.SELECT });

        console.log('✅ Average ratings calculated');

        res.json({
            success: true,
            ratings: ratings || {}
        });
    } catch (error) {
        console.error('❌ Error calculating ratings:', error.message);
        res.json({
            success: true,
            ratings: {},
            error: error.message
        });
    }
});

// =============================================
// MENU MANAGEMENT ENDPOINTS
// =============================================

/**
 * GET /api/manager/menu
 * Get all menu items with categories
 */
router.get('/menu', async (req, res) => {
    try {
        console.log('🍽️ Fetching menu items...');

        const items = await sequelize.query(`
            SELECT 
                mi.item_id,
                mi.item_code,
                mi.name,
                mi.description,
                mi.price,
                mi.cost_price,
                mi.image_url,
                mi.is_available,
                mi.is_featured,
                mi.preparation_time_min,
                mi.spicy_level,
                mi.calories,
                mi.dietary_tags,
                mc.category_id,
                mc.name as category_name
            FROM menu_items mi
            LEFT JOIN menu_categories mc ON mi.category_id = mc.category_id
            ORDER BY mc.name, mi.display_order, mi.name
        `, { type: QueryTypes.SELECT });

        console.log(`✅ Found ${items.length} menu items`);

        res.json({
            success: true,
            items: items,
            count: items.length
        });
    } catch (error) {
        console.error('❌ Error fetching menu:', error.message);
        res.json({
            success: true,
            items: [],
            count: 0,
            error: error.message
        });
    }
});

/**
 * POST /api/manager/menu
 * Add new menu item
 */
router.post('/menu', async (req, res) => {
    const {
        name,
        description,
        price,
        cost_price,
        category_id,
        image_url,
        is_available,
        is_featured,
        preparation_time_min,
        spicy_level,
        calories,
        dietary_tags,
        item_code
    } = req.body;

    try {
        console.log(`📝 Adding new menu item: ${name}`);

        const [result] = await sequelize.query(`
            INSERT INTO menu_items (
                name, description, price, cost_price, category_id,
                image_url, is_available, is_featured, preparation_time_min,
                spicy_level, calories, dietary_tags, item_code, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            RETURNING item_id
        `, {
            replacements: [
                name,
                description,
                price,
                cost_price,
                category_id,
                image_url,
                is_available !== false,
                is_featured === true,
                preparation_time_min || 15,
                spicy_level,
                calories,
                dietary_tags,
                item_code
            ],
            type: QueryTypes.INSERT
        });

        console.log(`✅ Menu item added with ID: ${result.item_id}`);

        res.json({
            success: true,
            message: 'Menu item added successfully',
            item_id: result.item_id
        });
    } catch (error) {
        console.error('❌ Error adding menu item:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to add menu item: ' + error.message
        });
    }
});

/**
 * PUT /api/manager/menu/:itemId
 * Update menu item
 */
router.put('/menu/:itemId', async (req, res) => {
    const { itemId } = req.params;
    const {
        name,
        description,
        price,
        cost_price,
        category_id,
        image_url,
        is_available,
        is_featured,
        preparation_time_min,
        spicy_level,
        calories,
        dietary_tags
    } = req.body;

    try {
        console.log(`📝 Updating menu item ${itemId}`);

        await sequelize.query(`
            UPDATE menu_items
            SET 
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                price = COALESCE(?, price),
                cost_price = COALESCE(?, cost_price),
                category_id = COALESCE(?, category_id),
                image_url = COALESCE(?, image_url),
                is_available = COALESCE(?, is_available),
                is_featured = COALESCE(?, is_featured),
                preparation_time_min = COALESCE(?, preparation_time_min),
                spicy_level = COALESCE(?, spicy_level),
                calories = COALESCE(?, calories),
                dietary_tags = COALESCE(?, dietary_tags),
                updated_at = NOW()
            WHERE item_id = ?
        `, {
            replacements: [
                name,
                description,
                price,
                cost_price,
                category_id,
                image_url,
                is_available,
                is_featured,
                preparation_time_min,
                spicy_level,
                calories,
                dietary_tags,
                itemId
            ],
            type: QueryTypes.UPDATE
        });

        console.log(`✅ Menu item ${itemId} updated`);

        res.json({
            success: true,
            message: 'Menu item updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating menu item:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update menu item: ' + error.message
        });
    }
});

/**
 * DELETE /api/manager/menu/:itemId
 * Delete menu item (soft delete by marking unavailable)
 */
router.delete('/menu/:itemId', async (req, res) => {
    const { itemId } = req.params;

    try {
        console.log(`🗑️ Deleting menu item ${itemId}`);

        // Check if item exists in orders
        const [orderCheck] = await sequelize.query(`
            SELECT COUNT(*) as count FROM order_items WHERE menu_item_id = ?
        `, {
            replacements: [itemId],
            type: QueryTypes.SELECT
        });

        if (orderCheck && orderCheck.count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete item used in existing orders. Mark as unavailable instead.'
            });
        }

        await sequelize.query(`
            DELETE FROM menu_items WHERE item_id = ?
        `, {
            replacements: [itemId],
            type: QueryTypes.DELETE
        });

        console.log(`✅ Menu item ${itemId} deleted`);

        res.json({
            success: true,
            message: 'Menu item deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting menu item:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete menu item: ' + error.message
        });
    }
});

// =============================================
// TABLE MANAGEMENT ENDPOINTS
// =============================================

/**
 * GET /api/manager/tables
 * Get all restaurant tables
 */
router.get('/tables', async (req, res) => {
    try {
        console.log('🪑 Fetching tables...');

        const tables = await sequelize.query(`
            SELECT 
                table_id,
                table_number,
                table_type,
                capacity,
                location_zone,
                location_description,
                is_available,
                is_active,
                created_at,
                updated_at
            FROM restaurant_tables
            WHERE is_active = true
            ORDER BY table_number
        `, { type: QueryTypes.SELECT });

        console.log(`✅ Found ${tables.length} tables`);

        res.json({
            success: true,
            tables: tables,
            count: tables.length
        });
    } catch (error) {
        console.error('❌ Error fetching tables:', error.message);
        res.json({
            success: true,
            tables: [],
            count: 0,
            error: error.message
        });
    }
});

/**
 * PUT /api/manager/tables/:tableId/availability
 * Update table availability
 */
router.put('/tables/:tableId/availability', async (req, res) => {
    const { tableId } = req.params;
    const { is_available } = req.body;

    try {
        console.log(`🔄 Updating table ${tableId} availability to ${is_available}`);

        await sequelize.query(`
            UPDATE restaurant_tables
            SET is_available = ?, updated_at = NOW()
            WHERE table_id = ?
        `, {
            replacements: [is_available, tableId],
            type: QueryTypes.UPDATE
        });

        console.log(`✅ Table ${tableId} availability updated`);

        res.json({
            success: true,
            message: 'Table availability updated'
        });
    } catch (error) {
        console.error('❌ Error updating table:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update table'
        });
    }
});

module.exports = router;
