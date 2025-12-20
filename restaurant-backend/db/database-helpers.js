/**
 * Database Helper Functions - Normalized Schema (3NF)
 * These functions provide clean abstractions over the normalized schema
 * Usage: Import these functions in your route handlers
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// =============================================
// MENU QUERIES
// =============================================

const MenuQueries = {
    /**
     * Get all active menu items with category
     */
    getAllItems: async () => {
        return await sequelize.query(`
            SELECT * FROM vw_menu_with_category
            WHERE is_available = true
            ORDER BY category_id, display_order
        `, { type: QueryTypes.SELECT });
    },

    /**
     * Get menu items by category
     */
    getByCategory: async (categoryId) => {
        return await sequelize.query(`
            SELECT * FROM vw_menu_with_category
            WHERE category_id = ? AND is_available = true
            ORDER BY display_order
        `, {
            replacements: [categoryId],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Get single menu item
     */
    getItem: async (itemId) => {
        return await sequelize.query(`
            SELECT * FROM vw_menu_with_category
            WHERE item_id = ?
        `, {
            replacements: [itemId],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Get categories
     */
    getCategories: async () => {
        return await sequelize.query(`
            SELECT * FROM menu_categories
            WHERE is_active = true
            ORDER BY display_order
        `, { type: QueryTypes.SELECT });
    },

    /**
     * Search menu items
     */
    search: async (searchTerm) => {
        return await sequelize.query(`
            SELECT * FROM vw_menu_with_category
            WHERE (name ILIKE ? OR description ILIKE ?)
                AND is_available = true
            ORDER BY category_id, display_order
        `, {
            replacements: [`%${searchTerm}%`, `%${searchTerm}%`],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Get featured items
     */
    getFeatured: async () => {
        return await sequelize.query(`
            SELECT * FROM vw_menu_with_category
            WHERE is_featured = true AND is_available = true
            ORDER BY display_order
            LIMIT 10
        `, { type: QueryTypes.SELECT });
    }
};

// =============================================
// ORDER QUERIES
// =============================================

const OrderQueries = {
    /**
     * Get order summary with all details
     */
    getSummary: async (orderId) => {
        return await sequelize.query(`
            SELECT * FROM vw_order_summary WHERE order_id = ?
        `, {
            replacements: [orderId],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Get all orders with summary
     */
    getAll: async (limit = 50, offset = 0) => {
        return await sequelize.query(`
            SELECT * FROM vw_order_summary
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, {
            replacements: [limit, offset],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Get recent orders (last 7 days)
     */
    getRecent: async () => {
        return await sequelize.query(`
            SELECT * FROM vw_order_summary
            WHERE created_at >= NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC
        `, { type: QueryTypes.SELECT });
    },

    /**
     * Get orders by customer
     */
    getByCustomer: async (customerId) => {
        return await sequelize.query(`
            SELECT * FROM vw_order_summary
            WHERE customer_id = ?
            ORDER BY created_at DESC
        `, {
            replacements: [customerId],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Get orders by status
     */
    getByStatus: async (statusCode) => {
        return await sequelize.query(`
            SELECT os.order_summary FROM vw_order_summary os
            WHERE os.order_status = (
                SELECT name FROM order_statuses WHERE code = ?
            )
            ORDER BY created_at DESC
        `, {
            replacements: [statusCode],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Get order with items
     */
    getWithItems: async (orderId) => {
        const order = await sequelize.query(`
            SELECT 
                o.order_id, o.order_number, o.created_at,
                c.name as customer_name, c.phone_number,
                rt.table_number,
                os.name as order_status,
                SUM(oi.item_price * oi.quantity) as total_amount
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE o.order_id = ?
            GROUP BY o.order_id, c.customer_id, rt.table_id, os.status_id
        `, {
            replacements: [orderId],
            type: QueryTypes.SELECT
        });

        const items = await sequelize.query(`
            SELECT 
                oi.order_item_id, oi.item_name, oi.quantity,
                oi.item_price, oi.special_instructions,
                oi.item_status, mi.image_url
            FROM order_items oi
            LEFT JOIN menu_items mi ON oi.menu_item_id = mi.item_id
            WHERE oi.order_id = ?
        `, {
            replacements: [orderId],
            type: QueryTypes.SELECT
        });

        return {
            ...order[0],
            items
        };
    },

    /**
     * Create order (returns order_id)
     */
    create: async (orderId, customerId, tableId, paymentMethodId, specialInstructions) => {
        const result = await sequelize.query(`
            INSERT INTO orders (
                order_number, customer_id, table_id, order_status_id,
                kitchen_status_id, payment_status_id, payment_method_id,
                special_instructions, created_by
            )
            VALUES (?, ?, ?, 1, 1, 1, ?, ?, 'customer')
            RETURNING order_id, order_number
        `, {
            replacements: [
                orderId,
                customerId || null,
                tableId || null,
                paymentMethodId || null,
                specialInstructions || null
            ],
            type: QueryTypes.INSERT
        });
        return result[0];
    },

    /**
     * Update order status
     */
    updateStatus: async (orderId, statusCode) => {
        const statusId = await sequelize.query(`
            SELECT status_id FROM order_statuses WHERE code = ?
        `, {
            replacements: [statusCode],
            type: QueryTypes.SELECT
        });

        if (!statusId.length) throw new Error('Invalid status code');

        await sequelize.query(`
            UPDATE orders SET order_status_id = ?, updated_at = NOW()
            WHERE order_id = ?
        `, {
            replacements: [statusId[0].status_id, orderId],
            type: QueryTypes.UPDATE
        });
    },

    /**
     * Get daily revenue
     */
    getDailyRevenue: async (date) => {
        return await sequelize.query(`
            SELECT 
                DATE(o.created_at) as order_date,
                COUNT(*) as order_count,
                SUM(oi.item_price * oi.quantity) as total_revenue,
                AVG(oi.item_price * oi.quantity) as avg_order_value
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE DATE(o.created_at) = ?
            GROUP BY DATE(o.created_at)
        `, {
            replacements: [date],
            type: QueryTypes.SELECT
        });
    }
};

// =============================================
// TABLE QUERIES
// =============================================

const TableQueries = {
    /**
     * Get all tables
     */
    getAll: async () => {
        return await sequelize.query(`
            SELECT * FROM restaurant_tables
            WHERE is_active = true
            ORDER BY table_number
        `, { type: QueryTypes.SELECT });
    },

    /**
     * Get available tables
     */
    getAvailable: async () => {
        return await sequelize.query(`
            SELECT * FROM vw_available_tables
            ORDER BY table_number
        `, { type: QueryTypes.SELECT });
    },

    /**
     * Get available tables by capacity
     */
    getAvailableByCapacity: async (capacity) => {
        return await sequelize.query(`
            SELECT * FROM vw_available_tables
            WHERE capacity >= ?
            ORDER BY capacity, table_number
        `, {
            replacements: [capacity],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Update table availability
     */
    setAvailability: async (tableId, isAvailable) => {
        await sequelize.query(`
            UPDATE restaurant_tables
            SET is_available = ?, updated_at = NOW()
            WHERE table_id = ?
        `, {
            replacements: [isAvailable, tableId],
            type: QueryTypes.UPDATE
        });
    }
};

// =============================================
// CUSTOMER QUERIES
// =============================================

const CustomerQueries = {
    /**
     * Get or create customer by session
     */
    getOrCreate: async (sessionId, name = null, phone = null, email = null) => {
        const existing = await sequelize.query(`
            SELECT * FROM customers WHERE session_id = ?
        `, {
            replacements: [sessionId],
            type: QueryTypes.SELECT
        });

        if (existing.length > 0) {
            return existing[0];
        }

        const result = await sequelize.query(`
            INSERT INTO customers (session_id, name, phone_number, email)
            VALUES (?, ?, ?, ?)
            RETURNING customer_id, session_id, name
        `, {
            replacements: [sessionId, name, phone, email],
            type: QueryTypes.INSERT
        });
        return result[0];
    },

    /**
     * Get customer by ID
     */
    getById: async (customerId) => {
        return await sequelize.query(`
            SELECT * FROM customers WHERE customer_id = ?
        `, {
            replacements: [customerId],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Get customer order history
     */
    getOrderHistory: async (customerId, limit = 10) => {
        return await sequelize.query(`
            SELECT * FROM vw_order_summary
            WHERE customer_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `, {
            replacements: [customerId, limit],
            type: QueryTypes.SELECT
        });
    }
};

// =============================================
// PAYMENT QUERIES
// =============================================

const PaymentQueries = {
    /**
     * Get payment methods
     */
    getMethods: async () => {
        return await sequelize.query(`
            SELECT * FROM payment_methods
            WHERE is_active = true
            ORDER BY code
        `, { type: QueryTypes.SELECT });
    },

    /**
     * Create payment transaction
     */
    createTransaction: async (orderId, paymentMethodId, amount, transactionRef) => {
        const result = await sequelize.query(`
            INSERT INTO payment_transactions (
                order_id, payment_method_id, transaction_reference,
                amount, status
            )
            VALUES (?, ?, ?, ?, 'pending')
            RETURNING transaction_id, transaction_reference
        `, {
            replacements: [orderId, paymentMethodId, transactionRef, amount],
            type: QueryTypes.INSERT
        });
        return result[0];
    },

    /**
     * Update payment transaction status
     */
    updateTransaction: async (transactionId, status, gatewayResponse = null) => {
        await sequelize.query(`
            UPDATE payment_transactions
            SET status = ?,
                gateway_response = ?,
                completed_at = CASE WHEN ? = 'completed' THEN NOW() ELSE completed_at END,
                updated_at = NOW()
            WHERE transaction_id = ?
        `, {
            replacements: [status, gatewayResponse ? JSON.stringify(gatewayResponse) : null, status, transactionId],
            type: QueryTypes.UPDATE
        });
    }
};

// =============================================
// FEEDBACK QUERIES
// =============================================

const FeedbackQueries = {
    /**
     * Submit feedback
     */
    create: async (orderId, customerId, ratings, comment = null) => {
        const result = await sequelize.query(`
            INSERT INTO feedback (
                order_id, customer_id, food_quality, service_speed,
                overall_experience, order_accuracy, value_for_money, comment
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING feedback_id
        `, {
            replacements: [
                orderId,
                customerId || null,
                ratings.food_quality || 0,
                ratings.service_speed || 0,
                ratings.overall_experience || 0,
                ratings.order_accuracy || 0,
                ratings.value_for_money || 0,
                comment
            ],
            type: QueryTypes.INSERT
        });
        return result[0];
    },

    /**
     * Get feedback for order
     */
    getByOrder: async (orderId) => {
        return await sequelize.query(`
            SELECT * FROM feedback WHERE order_id = ?
        `, {
            replacements: [orderId],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Get average ratings
     */
    getAverageRatings: async (days = 30) => {
        return await sequelize.query(`
            SELECT 
                ROUND(AVG(food_quality), 2) as avg_food_quality,
                ROUND(AVG(service_speed), 2) as avg_service_speed,
                ROUND(AVG(overall_experience), 2) as avg_overall,
                ROUND(AVG(order_accuracy), 2) as avg_accuracy,
                ROUND(AVG(value_for_money), 2) as avg_value,
                COUNT(*) as total_feedback
            FROM feedback
            WHERE submitted_at >= NOW() - INTERVAL '? days'
        `, {
            replacements: [days],
            type: QueryTypes.SELECT
        });
    }
};

// =============================================
// MANAGER QUERIES
// =============================================

const ManagerQueries = {
    /**
     * Get manager by username
     */
    getByUsername: async (username) => {
        return await sequelize.query(`
            SELECT manager_id, username, password_hash, email, full_name, role
            FROM managers WHERE username = ? AND is_active = true
        `, {
            replacements: [username],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Get all active managers
     */
    getAll: async () => {
        return await sequelize.query(`
            SELECT manager_id, username, email, full_name, role, last_login_at
            FROM managers
            WHERE is_active = true
            ORDER BY full_name
        `, { type: QueryTypes.SELECT });
    },

    /**
     * Update last login
     */
    updateLastLogin: async (managerId) => {
        await sequelize.query(`
            UPDATE managers
            SET last_login_at = NOW()
            WHERE manager_id = ?
        `, {
            replacements: [managerId],
            type: QueryTypes.UPDATE
        });
    }
};

// =============================================
// ANALYTICS QUERIES
// =============================================

const AnalyticsQueries = {
    /**
     * Get order statistics
     */
    getOrderStats: async (days = 30) => {
        return await sequelize.query(`
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN order_status_id = 5 THEN 1 END) as completed_orders,
                COUNT(CASE WHEN order_status_id = 6 THEN 1 END) as cancelled_orders,
                ROUND(AVG(oi.item_price * oi.quantity), 2) as avg_order_value,
                SUM(oi.item_price * oi.quantity) as total_revenue
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE o.created_at >= NOW() - INTERVAL '? days'
        `, {
            replacements: [days],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Get popular menu items
     */
    getPopularItems: async (limit = 10) => {
        return await sequelize.query(`
            SELECT 
                mi.item_id, mi.name, mi.category_id,
                COUNT(*) as order_count,
                SUM(oi.quantity) as total_quantity,
                ROUND(AVG(oi.item_price * oi.quantity), 2) as avg_revenue
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.item_id
            GROUP BY mi.item_id
            ORDER BY order_count DESC
            LIMIT ?
        `, {
            replacements: [limit],
            type: QueryTypes.SELECT
        });
    },

    /**
     * Get category performance
     */
    getCategoryPerformance: async () => {
        return await sequelize.query(`
            SELECT 
                mc.category_id, mc.name as category,
                COUNT(*) as item_count,
                SUM(oi.quantity) as total_sold,
                ROUND(SUM(oi.item_price * oi.quantity), 2) as revenue
            FROM menu_items mi
            LEFT JOIN menu_categories mc ON mi.category_id = mc.category_id
            LEFT JOIN order_items oi ON mi.item_id = oi.menu_item_id
            WHERE mc.is_active = true
            GROUP BY mc.category_id
            ORDER BY revenue DESC
        `, { type: QueryTypes.SELECT });
    },

    /**
     * Get peak hours
     */
    getPeakHours: async (days = 7) => {
        return await sequelize.query(`
            SELECT 
                EXTRACT(HOUR FROM o.created_at) as hour,
                COUNT(*) as order_count,
                ROUND(AVG(oi.item_price * oi.quantity), 2) as avg_order_value
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE o.created_at >= NOW() - INTERVAL '? days'
            GROUP BY EXTRACT(HOUR FROM o.created_at)
            ORDER BY hour
        `, {
            replacements: [days],
            type: QueryTypes.SELECT
        });
    }
};

module.exports = {
    MenuQueries,
    OrderQueries,
    TableQueries,
    CustomerQueries,
    PaymentQueries,
    FeedbackQueries,
    ManagerQueries,
    AnalyticsQueries
};
