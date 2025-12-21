#!/usr/bin/env node

/**
 * Integration Guide - Using Normalized Schema in Express Routes
 * 
 * This file shows practical examples of how to use the normalized schema
 * with the database helper functions in your Express backend.
 * 
 * Copy and adapt these patterns to your route handlers.
 */

// =============================================
// SETUP IN YOUR ROUTE FILES
// =============================================

/*
// Example: routes/menuRoutes.js

const express = require('express');
const router = express.Router();
const { MenuQueries } = require('../db/database-helpers');

// Get all menu items
router.get('/api/menu', async (req, res) => {
    try {
        const items = await MenuQueries.getAllItems();
        res.json(items);
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get menu by category
router.get('/api/menu/category/:categoryId', async (req, res) => {
    try {
        const items = await MenuQueries.getByCategory(req.params.categoryId);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single menu item
router.get('/api/menu/items/:itemId', async (req, res) => {
    try {
        const items = await MenuQueries.getItem(req.params.itemId);
        if (!items.length) return res.status(404).json({ error: 'Not found' });
        res.json(items[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search menu items
router.get('/api/menu/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ error: 'Search query required' });
        const items = await MenuQueries.search(q);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get featured items
router.get('/api/menu/featured', async (req, res) => {
    try {
        const items = await MenuQueries.getFeatured();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
*/

// =============================================
// ORDERS IMPLEMENTATION EXAMPLE
// =============================================

/*
// Example: routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const { OrderQueries, CustomerQueries } = require('../db/database-helpers');

// Create new order
router.post('/api/orders', async (req, res) => {
    try {
        const {
            customerId,
            tableId,
            paymentMethodId,
            specialInstructions,
            items
        } = req.body;

        // Generate order number
        const orderNumber = `ORD${Date.now()}`;

        // Create order
        const order = await OrderQueries.create(
            orderNumber,
            customerId || null,
            tableId || null,
            paymentMethodId || null,
            specialInstructions
        );

        // Add items to order
        for (const item of items) {
            await sequelize.query(`
                INSERT INTO order_items (
                    order_id, menu_item_id, item_name, item_price,
                    item_description, quantity, special_instructions
                )
                SELECT ?, mi.item_id, mi.name, mi.price, mi.description, ?, ?
                FROM menu_items mi
                WHERE mi.item_id = ?
            `, {
                replacements: [
                    order.order_id,
                    item.quantity,
                    item.specialInstructions || null,
                    item.menuItemId
                ],
                type: QueryTypes.INSERT
            });
        }

        res.status(201).json({ orderId: order.order_id, orderNumber: order.order_number });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get order with items
router.get('/api/orders/:orderId', async (req, res) => {
    try {
        const order = await OrderQueries.getWithItems(req.params.orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent orders
router.get('/api/orders', async (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const offset = req.query.offset || 0;
        const orders = await OrderQueries.getAll(limit, offset);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update order status
router.put('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { status } = req.body;
        await OrderQueries.updateStatus(req.params.orderId, status);
        res.json({ message: 'Order status updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
*/

// =============================================
// PAYMENT IMPLEMENTATION EXAMPLE
// =============================================

/*
// Example: routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const { PaymentQueries } = require('../db/database-helpers');

// Get payment methods
router.get('/api/payments/methods', async (req, res) => {
    try {
        const methods = await PaymentQueries.getMethods();
        res.json(methods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Process payment
router.post('/api/payments', async (req, res) => {
    try {
        const { orderId, paymentMethodId, amount } = req.body;

        // Generate transaction reference
        const transactionRef = `TXN${Date.now()}`;

        // Create transaction
        const transaction = await PaymentQueries.createTransaction(
            orderId,
            paymentMethodId,
            amount,
            transactionRef
        );

        // Here you would call your payment gateway
        // const gatewayResponse = await paymentGateway.process(...);

        // Update transaction status
        await PaymentQueries.updateTransaction(
            transaction.transaction_id,
            'completed',
            {} // gatewayResponse
        );

        res.json({ transactionId: transaction.transaction_id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
*/

// =============================================
// FEEDBACK IMPLEMENTATION EXAMPLE
// =============================================

/*
// Example: routes/feedbackRoutes.js

const express = require('express');
const router = express.Router();
const { FeedbackQueries } = require('../db/database-helpers');

// Submit feedback
router.post('/api/feedback', async (req, res) => {
    try {
        const {
            orderId,
            customerId,
            foodQuality,
            serviceSpeed,
            overallExperience,
            orderAccuracy,
            valueForMoney,
            comment
        } = req.body;

        const feedback = await FeedbackQueries.create(
            orderId,
            customerId || null,
            {
                food_quality: foodQuality,
                service_speed: serviceSpeed,
                overall_experience: overallExperience,
                order_accuracy: orderAccuracy,
                value_for_money: valueForMoney
            },
            comment
        );

        res.status(201).json(feedback);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get average ratings
router.get('/api/feedback/ratings', async (req, res) => {
    try {
        const days = req.query.days || 30;
        const ratings = await FeedbackQueries.getAverageRatings(days);
        res.json(ratings[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
*/

// =============================================
// ANALYTICS IMPLEMENTATION EXAMPLE
// =============================================

/*
// Example: routes/analyticsRoutes.js

const express = require('express');
const router = express.Router();
const { AnalyticsQueries } = require('../db/database-helpers');

// Get dashboard stats
router.get('/api/analytics/dashboard', async (req, res) => {
    try {
        const days = req.query.days || 30;
        const [stats, popular, categories, peakHours] = await Promise.all([
            AnalyticsQueries.getOrderStats(days),
            AnalyticsQueries.getPopularItems(10),
            AnalyticsQueries.getCategoryPerformance(),
            AnalyticsQueries.getPeakHours(7)
        ]);

        res.json({
            stats: stats[0],
            popularItems: popular,
            categories,
            peakHours
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get popular items
router.get('/api/analytics/popular', async (req, res) => {
    try {
        const items = await AnalyticsQueries.getPopularItems(req.query.limit || 10);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
*/

// =============================================
// MANAGER DASHBOARD EXAMPLE
// =============================================

/*
// Example: routes/managerDashboard.js

const express = require('express');
const router = express.Router();
const {
    OrderQueries,
    AnalyticsQueries,
    FeedbackQueries,
    TableQueries
} = require('../db/database-helpers');

// Manager dashboard data
router.get('/api/manager/dashboard', async (req, res) => {
    try {
        const [
            recentOrders,
            orderStats,
            feedback,
            tables,
            popularItems
        ] = await Promise.all([
            OrderQueries.getRecent(),
            AnalyticsQueries.getOrderStats(1),
            FeedbackQueries.getAverageRatings(7),
            TableQueries.getAvailable(),
            AnalyticsQueries.getPopularItems(5)
        ]);

        res.json({
            recentOrders,
            stats: orderStats[0],
            feedback: feedback[0],
            availableTables: tables.length,
            popularItems
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get today's orders
router.get('/api/manager/orders/today', async (req, res) => {
    try {
        const orders = await OrderQueries.getAll(100, 0);
        const today = new Date().toISOString().split('T')[0];
        const todaysOrders = orders.filter(o => 
            o.created_at.toISOString().startsWith(today)
        );
        res.json(todaysOrders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
*/

// =============================================
// CUSTOMER SESSION EXAMPLE
// =============================================

/*
// Example: middleware/customerSession.js

const { CustomerQueries } = require('../db/database-helpers');

const customerSession = async (req, res, next) => {
    try {
        let sessionId = req.cookies.sessionId;
        
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random()}`;
            res.cookie('sessionId', sessionId, { maxAge: 30 * 24 * 60 * 60 * 1000 });
        }

        // Get or create customer
        const customer = await CustomerQueries.getOrCreate(sessionId);
        req.customer = customer;
        next();
    } catch (error) {
        console.error('Customer session error:', error);
        next();
    }
};

module.exports = customerSession;
*/

// =============================================
// CRON JOB EXAMPLE FOR CLEANUP
// =============================================

/*
// Example: jobs/cleanup.js

const schedule = require('node-schedule');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Clean up old notifications daily
schedule.scheduleJob('0 2 * * *', async () => {
    try {
        await sequelize.query(`
            DELETE FROM notifications
            WHERE created_at < NOW() - INTERVAL '30 days'
        `, { type: QueryTypes.DELETE });
        console.log('✅ Old notifications cleaned up');
    } catch (error) {
        console.error('Cleanup job error:', error);
    }
});

// Archive old orders monthly
schedule.scheduleJob('0 3 1 * *', async () => {
    try {
        await sequelize.query(`
            INSERT INTO order_archive
            SELECT * FROM orders
            WHERE completed_at < NOW() - INTERVAL '90 days'
        `);
        console.log('✅ Old orders archived');
    } catch (error) {
        console.error('Archive job error:', error);
    }
});
*/

console.log('📚 Integration Guide Created');
console.log('See comments in this file for implementation examples');
