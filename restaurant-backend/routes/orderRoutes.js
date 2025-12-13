const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

// =============================================
// GET ROUTES (Viewing orders)
// =============================================

// GET /api/orders - List all orders (for Manager Dashboard)
router.get('/', async (req, res) => {
    try {
        const [orders] = await sequelize.query(`
            SELECT 
                o.id,
                o.order_number as "orderNumber",
                o.customer_id as "customerId",
                o.table_number as "tableNumber",
                o.status,
                o.payment_method as "paymentMethod",
                o.payment_status as "paymentStatus",
                o.total as "totalAmount",
                o.subtotal,
                o.tax,
                o.created_at as "createdAt",
                o.approved_at as "approvedAt",
                o.expected_completion as "expectedCompletion",
                json_agg(
                    json_build_object(
                        'id', oi.id,
                        'menu_item_id', oi.menu_item_id,
                        'name', oi.name,
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'special_instructions', oi.special_instructions
                    )
                ) FILTER (WHERE oi.id IS NOT NULL) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `);

        res.json({
            success: true,
            data: orders,
            message: 'Orders retrieved successfully'
        });
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

        const [orders] = await sequelize.query(`
            SELECT 
                o.id,
                o.order_number as "orderNumber",
                o.customer_id as "customerId",
                o.table_number as "tableNumber",
                o.status,
                o.payment_method as "paymentMethod",
                o.payment_status as "paymentStatus",
                o.total as "totalAmount",
                o.subtotal,
                o.tax,
                o.created_at as "createdAt",
                o.approved_at as "approvedAt",
                o.expected_completion as "expectedCompletion",
                json_agg(
                    json_build_object(
                        'id', oi.id,
                        'menu_item_id', oi.menu_item_id,
                        'name', oi.name,
                        'description', m.description,
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'special_instructions', oi.special_instructions
                    )
                ) FILTER (WHERE oi.id IS NOT NULL) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN menu_items m ON oi.menu_item_id = m.id
            WHERE o.id = $1
            GROUP BY o.id
        `, { bind: [id] });

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: orders[0],
            message: 'Order retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve order',
            error: error.message
        });
    }
});

// GET /api/orders/session/:sessionId - Get customer's orders by customer ID
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const [orders] = await sequelize.query(`
            SELECT 
                o.id,
                o.order_number as "orderNumber",
                o.status,
                o.payment_method as "paymentMethod",
                o.payment_status as "paymentStatus",
                o.total as "totalAmount",
                o.subtotal,
                o.tax,
                o.created_at as "createdAt",
                o.approved_at as "approvedAt",
                o.expected_completion as "expectedCompletion",
                json_agg(
                    json_build_object(
                        'id', oi.id,
                        'menu_item_id', oi.menu_item_id,
                        'name', oi.name,
                        'quantity', oi.quantity,
                        'price', oi.price
                    )
                ) FILTER (WHERE oi.id IS NOT NULL) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.customer_id = $1 OR o.id = $1::integer
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `, { bind: [sessionId] });

        res.json({
            success: true,
            data: orders,
            message: `Orders for customer retrieved successfully`
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
        const [orders] = await sequelize.query(`
            SELECT 
                o.id,
                o.order_number as "orderNumber",
                o.customer_id as "customerId",
                o.table_number as "tableNumber",
                o.status,
                o.kitchen_status as "kitchenStatus",
                o.total as "totalAmount",
                o.special_instructions as "specialInstructions",
                o.created_at as "createdAt",
                o.approved_at as "approvedAt",
                o.expected_completion as "expectedCompletion",
                string_agg(
                    oi.name || ' x' || oi.quantity, 
                    ', ' ORDER BY oi.name
                ) as items_summary,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status IN ('approved', 'in_progress') AND o.kitchen_status IN ('pending', 'preparing')
            GROUP BY o.id
            ORDER BY 
                CASE 
                    WHEN o.status = 'in_progress' THEN 1
                    WHEN o.status = 'approved' THEN 2
                END,
                o.approved_at ASC
        `);

        res.json({
            success: true,
            data: orders,
            message: 'Active kitchen orders retrieved successfully'
        });
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
        const { customerSessionId, paymentMethod, items } = req.body;

        // Validation
        if (!customerSessionId || !paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: customerSessionId, paymentMethod, items (non-empty array)'
            });
        }

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
            const [menuItem] = await sequelize.query(
                'SELECT id, name, price, is_available FROM menu_items WHERE id = $1',
                { bind: [item.menuItemId] }
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

        // Create order and order items in a transaction
        const [newOrder] = await sequelize.query(`
            INSERT INTO orders (
                order_number,
                customer_id, 
                payment_method,
                subtotal,
                tax,
                total, 
                status,
                payment_status,
                kitchen_status
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, 'pending_approval', 'pending', 'pending') 
            RETURNING *
        `, { bind: [orderNumber, customerSessionId, paymentMethod, subtotal, tax, total] });

        // Create order items
        for (const item of orderItemsData) {
            await sequelize.query(`
                INSERT INTO order_items (
                    order_id, 
                    menu_item_id, 
                    name,
                    quantity, 
                    price, 
                    special_instructions
                ) 
                VALUES ($1, $2, $3, $4, $5, $6)
            `, {
                bind: [
                    newOrder[0].id,
                    item.menuItemId,
                    item.name,
                    item.quantity,
                    item.price,
                    item.specialInstructions
                ]
            });
        }

        // Get the complete order with items
        const [completeOrder] = await sequelize.query(`
            SELECT 
                o.id,
                o.order_number as "orderNumber",
                o.customer_id as "customerId",
                o.status,
                o.payment_method as "paymentMethod",
                o.payment_status as "paymentStatus",
                o.subtotal,
                o.tax,
                o.total,
                o.created_at as "createdAt",
                json_agg(
                    json_build_object(
                        'menu_item_id', oi.menu_item_id,
                        'name', oi.name,
                        'quantity', oi.quantity,
                        'price', oi.price
                    )
                ) FILTER (WHERE oi.id IS NOT NULL) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = $1
            GROUP BY o.id
        `, { bind: [newOrder[0].id] });

        res.status(201).json({
            success: true,
            data: completeOrder[0],
            message: 'Order created successfully and awaiting manager approval'
        });

    } catch (error) {
        console.error('Error creating order:', error);
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
        const [existingOrder] = await sequelize.query(
            'SELECT id, status FROM orders WHERE id = $1',
            { bind: [id] }
        );

        if (existingOrder.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Build update query with timestamp logic
        let updateQuery = 'UPDATE orders SET status = $1';
        const params = [status];
        let paramCount = 1;

        // Set appropriate timestamps based on status
        if (status === 'approved') {
            paramCount++;
            updateQuery += `, approved_at = CURRENT_TIMESTAMP`;
        } else if (status === 'in_progress') {
            paramCount++;
            updateQuery += `, kitchen_started_at = CURRENT_TIMESTAMP`;
        } else if (status === 'ready') {
            paramCount++;
            updateQuery += `, ready_at = CURRENT_TIMESTAMP`;
        } else if (status === 'cancelled') {
            paramCount++;
            updateQuery += `, completed_at = CURRENT_TIMESTAMP`;
        }

        paramCount++;
        updateQuery += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
        params.push(id);

        const [updatedOrder] = await sequelize.query(updateQuery, { bind: params });

        res.json({
            success: true,
            data: updatedOrder[0],
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

        const [updatedOrder] = await sequelize.query(`
            UPDATE orders 
            SET 
                status = 'approved',
                approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'pending_approval'
            RETURNING *
        `, { bind: [id] });

        if (updatedOrder.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or already processed'
            });
        }

        res.json({
            success: true,
            data: updatedOrder[0],
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

        const [updatedOrder] = await sequelize.query(`
            UPDATE orders 
            SET 
                status = 'cancelled',
                completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status IN ('pending_approval', 'approved')
            RETURNING *
        `, { bind: [id] });

        if (updatedOrder.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or cannot be cancelled'
            });
        }

        res.json({
            success: true,
            data: updatedOrder[0],
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