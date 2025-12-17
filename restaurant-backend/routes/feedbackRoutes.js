const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

// =============================================
// HELPER: Authentication middleware (add this)
// =============================================
const authenticateManager = (req, res, next) => {
    // Implement your authentication logic here
    // For now, allow all in development
    if (process.env.NODE_ENV === 'production') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Verify token against your auth system
    }
    next();
};

// =============================================
// POST ROUTES (Customer feedback submission)
// =============================================

// POST /api/feedback - Submit customer feedback
router.post('/', async (req, res) => {
    try {
        const { orderId, rating, foodQuality, serviceSpeed, overallExperience, accuracy, valueForMoney, comment } = req.body;

        // Validation - accept either single rating or detailed ratings
        const overallRating = rating || overallExperience;
        if (!orderId || !overallRating) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: orderId and rating (or overallExperience)'
            });
        }

        if (overallRating < 1 || overallRating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Check if order exists
        const order = await sequelize.query(`
            SELECT order_id, order_status_id 
            FROM orders 
            WHERE order_id = $1
        `, { 
            replacements: [orderId],
            type: sequelize.QueryTypes.SELECT 
        });

        if (order.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if feedback already exists for this order
        const existingFeedback = await sequelize.query(`
            SELECT feedback_id FROM feedback WHERE order_id = $1
        `, { 
            replacements: [orderId],
            type: sequelize.QueryTypes.SELECT 
        });

        if (existingFeedback.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Feedback already submitted for this order'
            });
        }

        // Calculate average rating if detailed ratings provided
        const ratings = [foodQuality || overallRating, serviceSpeed || overallRating, overallExperience || overallRating, accuracy || overallRating, valueForMoney || overallRating];
        const averageRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);

        // Create feedback with both simple and detailed ratings
        await sequelize.query(`
            INSERT INTO feedback (
                order_id, 
                customer_id,
                food_quality, 
                service_speed, 
                overall_experience,
                order_accuracy,
                value_for_money,
                comment,
                submitted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, { 
            replacements: [orderId, null, foodQuality || overallRating, serviceSpeed || overallRating, overallExperience || overallRating, accuracy || overallRating, valueForMoney || overallRating, comment || null],
            type: sequelize.QueryTypes.INSERT 
        });

        // 📡 Broadcast new feedback via Socket.IO
        if (global.io) {
            console.log('📡 Broadcasting new feedback notification:', orderId);
            global.io.to('managers').emit('new-feedback', {
                orderId: orderId,
                rating: overallExperience || rating,
                foodQuality: foodQuality || rating,
                serviceSpeed: serviceSpeed || rating,
                accuracy: accuracy || rating,
                valueForMoney: valueForMoney || rating,
                comment: comment,
                message: `⭐ New feedback received for Order #${orderId} (${overallExperience || rating}/5 stars)`,
                timestamp: new Date().toISOString()
            });
        }

        res.status(201).json({
            success: true,
            message: 'Thank you for your feedback!'
        });

    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit feedback',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =============================================
// GET ROUTES (Viewing feedback - Manager only)
// =============================================

// GET /api/feedback - Get all feedback with order details
router.get('/', authenticateManager, async (req, res) => {
    try {
        const { page = 1, limit = 20, minRating } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get total count
        const [countResult] = await sequelize.query(`
            SELECT COUNT(*) as total FROM feedback
        `);
        const totalCount = parseInt(countResult[0].total);

        // Get paginated feedback
        const [feedback] = await sequelize.query(`
            SELECT 
                f.feedback_id,
                f.order_id,
                f.food_quality,
                f.service_speed,
                f.overall_experience,
                f.order_accuracy as accuracy,
                f.value_for_money,
                f.comment,
                f.submitted_at,
                o.order_number,
                o.created_at as order_created_at
            FROM feedback f
            LEFT JOIN orders o ON f.order_id = o.order_id
            ORDER BY f.submitted_at DESC
            LIMIT $1 OFFSET $2
        `, {
            replacements: [parseInt(limit), offset],
            type: sequelize.QueryTypes.SELECT
        });

        const totalPages = Math.ceil(totalCount / parseInt(limit));

        res.json({
            success: true,
            data: feedback,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalCount: totalCount,
                totalPages: totalPages,
                hasNext: parseInt(page) < totalPages,
                hasPrev: parseInt(page) > 1
            },
            message: 'Feedback retrieved successfully'
        });

    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve feedback',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/feedback/stats - Get feedback statistics
router.get('/stats', authenticateManager, async (req, res) => {
    try {
        const [stats] = await sequelize.query(`
            SELECT 
                COUNT(*) as total_feedback,
                ROUND(AVG(food_quality)::numeric, 2) as avg_food_quality,
                ROUND(AVG(service_speed)::numeric, 2) as avg_service_speed,
                ROUND(AVG(overall_experience)::numeric, 2) as avg_overall_experience,
                ROUND(AVG(order_accuracy)::numeric, 2) as avg_accuracy,
                ROUND(AVG(value_for_money)::numeric, 2) as avg_value_for_money,
                COUNT(CASE WHEN overall_experience >= 4.5 THEN 1 END) as excellent,
                COUNT(CASE WHEN overall_experience >= 3.5 AND overall_experience < 4.5 THEN 1 END) as good,
                COUNT(CASE WHEN overall_experience >= 2.5 AND overall_experience < 3.5 THEN 1 END) as average,
                COUNT(CASE WHEN overall_experience < 2.5 THEN 1 END) as poor,
                COUNT(CASE WHEN comment IS NOT NULL AND comment != '' THEN 1 END) as total_comments,
                MAX(submitted_at) as latest_feedback
            FROM feedback
        `);

        const [recentComments] = await sequelize.query(`
            SELECT 
                f.overall_experience as rating,
                f.comment,
                f.submitted_at,
                f.order_id
            FROM feedback f
            WHERE f.comment IS NOT NULL AND f.comment != ''
            ORDER BY f.submitted_at DESC
            LIMIT 5
        `);

        const statistics = {
            summary: {
                totalFeedback: parseInt(stats[0].total_feedback) || 0,
                averageRating: parseFloat(stats[0].avg_overall_experience) || 0,
                totalComments: parseInt(stats[0].total_comments) || 0,
                latestFeedback: stats[0].latest_feedback
            },
            ratings: {
                foodQuality: parseFloat(stats[0].avg_food_quality) || 0,
                serviceSpeed: parseFloat(stats[0].avg_service_speed) || 0,
                overallExperience: parseFloat(stats[0].avg_overall_experience) || 0,
                accuracy: parseFloat(stats[0].avg_accuracy) || 0,
                valueForMoney: parseFloat(stats[0].avg_value_for_money) || 0
            },
            ratingDistribution: {
                excellent: parseInt(stats[0].excellent) || 0,
                good: parseInt(stats[0].good) || 0,
                average: parseInt(stats[0].average) || 0,
                poor: parseInt(stats[0].poor) || 0
            },
            recentComments: recentComments.map(comment => ({
                rating: parseFloat(comment.rating) || 0,
                comment: comment.comment || '',
                submittedAt: comment.submitted_at,
                orderId: comment.order_id
            }))
        };

        res.json({
            success: true,
            data: statistics,
            message: 'Feedback statistics retrieved successfully'
        });

    } catch (error) {
        console.error('Error fetching feedback stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve feedback statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/feedback/summary - Get feedback summary for dashboard
router.get('/summary', authenticateManager, async (req, res) => {
    try {
        const [summary] = await sequelize.query(`
            SELECT 
                DATE_TRUNC('day', created_at) as date,
                COUNT(*) as feedback_count,
                ROUND(AVG(rating)::numeric, 2) as average_rating
            FROM feedback
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY date DESC
            LIMIT 30
        `);

        const [recentRatings] = await sequelize.query(`
            SELECT 
                rating,
                COUNT(*) as count
            FROM feedback
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY rating
            ORDER BY rating DESC
        `);

        res.json({
            success: true,
            data: {
                dailySummary: summary.map(day => ({
                    ...day,
                    date: day.date.toISOString().split('T')[0] // Format date
                })),
                recentRatings: recentRatings,
                timePeriod: 'last_30_days'
            },
            message: 'Feedback summary retrieved successfully'
        });

    } catch (error) {
        console.error('Error fetching feedback summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve feedback summary',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/feedback/:orderId - Get feedback for specific order
router.get('/:orderId', authenticateManager, async (req, res) => {
    try {
        const { orderId } = req.params;

        // Validate orderId is a number
        if (isNaN(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID'
            });
        }

        const [feedback] = await sequelize.query(`
            SELECT 
                f.id,
                f.rating,
                f.comment,
                f.created_at as "createdAt",
                o.id as order_id,
                o.total_amount as "orderTotal",
                o.payment_method as "paymentMethod"
            FROM feedback f
            JOIN orders o ON f.order_id = o.id
            WHERE f.order_id = $1
        `, { bind: [orderId] });

        if (feedback.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No feedback found for this order'
            });
        }

        res.json({
            success: true,
            data: {
                ...feedback[0],
                comment: feedback[0].comment || ''
            },
            message: 'Feedback retrieved successfully'
        });

    } catch (error) {
        console.error('Error fetching order feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve order feedback',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =============================================
// DELETE ROUTES (Manager only)
// =============================================

// DELETE /api/feedback/:id - Delete feedback (Manager)
router.delete('/:id', authenticateManager, async (req, res) => {
    try {
        const { id } = req.params;

        // Validate id is a number
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid feedback ID'
            });
        }

        // Check if feedback exists
        const [existingFeedback] = await sequelize.query(
            'SELECT id FROM feedback WHERE id = $1',
            { bind: [id] }
        );

        if (existingFeedback.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }

        await sequelize.query(
            'DELETE FROM feedback WHERE id = $1',
            { bind: [id] }
        );

        res.json({
            success: true,
            message: 'Feedback deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete feedback',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;