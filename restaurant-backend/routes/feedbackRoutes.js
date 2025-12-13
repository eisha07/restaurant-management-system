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
        const [order] = await sequelize.query(`
            SELECT id, status 
            FROM orders 
            WHERE id = $1
        `, { bind: [orderId] });

        if (order.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if feedback already exists for this order
        const [existingFeedback] = await sequelize.query(`
            SELECT id FROM feedback WHERE order_id = $1
        `, { bind: [orderId] });

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
        const [newFeedback] = await sequelize.query(`
            INSERT INTO feedback (
                order_id, 
                food_quality, 
                service_speed, 
                overall_experience,
                accuracy,
                value_for_money,
                average_rating,
                comment
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, order_id, food_quality, service_speed, overall_experience, accuracy, value_for_money, average_rating, comment, submitted_at
        `, { 
            bind: [orderId, foodQuality || overallRating, serviceSpeed || overallRating, overallExperience || overallRating, accuracy || overallRating, valueForMoney || overallRating, averageRating, comment || null] 
        });

        res.status(201).json({
            success: true,
            data: newFeedback[0],
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
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramCount = 0;

        // Filter by minimum rating (using average_rating)
        if (minRating) {
            paramCount++;
            whereClause += ` AND f.average_rating >= $${paramCount}`;
            params.push(minRating);
        }

        // Get all feedback with order details
        const [feedback] = await sequelize.query(`
            SELECT 
                f.id,
                f.food_quality as "foodQuality",
                f.service_speed as "serviceSpeed",
                f.overall_experience as "overallExperience",
                f.accuracy,
                f.value_for_money as "valueForMoney",
                f.average_rating as "averageRating",
                f.comment,
                f.submitted_at as "submittedAt",
                o.id as "orderId",
                o.order_number as "orderNumber",
                o.total as "orderTotal",
                o.payment_method as "paymentMethod",
                o.created_at as "orderCreatedAt"
            FROM feedback f
            JOIN orders o ON f.order_id = o.id
            ${whereClause}
            ORDER BY f.submitted_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, { bind: [...params, limit, offset] });

        // Get total count separately
        const [totalResult] = await sequelize.query(`
            SELECT COUNT(*) as total_count
            FROM feedback f
            ${whereClause}
        `, { bind: params });

        const totalCount = parseInt(totalResult[0].total_count);
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            data: feedback,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
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
                COUNT(*) as "totalFeedback",
                ROUND(AVG(average_rating)::numeric, 2) as "averageRating",
                ROUND(AVG(food_quality)::numeric, 2) as "avgFoodQuality",
                ROUND(AVG(service_speed)::numeric, 2) as "avgServiceSpeed",
                ROUND(AVG(overall_experience)::numeric, 2) as "avgOverallExperience",
                ROUND(AVG(accuracy)::numeric, 2) as "avgAccuracy",
                ROUND(AVG(value_for_money)::numeric, 2) as "avgValueForMoney",
                COUNT(CASE WHEN average_rating >= 4.5 THEN 1 END) as "excellent",
                COUNT(CASE WHEN average_rating >= 3.5 AND average_rating < 4.5 THEN 1 END) as "good",
                COUNT(CASE WHEN average_rating >= 2.5 AND average_rating < 3.5 THEN 1 END) as "average",
                COUNT(CASE WHEN average_rating < 2.5 THEN 1 END) as "poor",
                COUNT(comment) as "totalComments",
                MAX(created_at) as latest_feedback
            FROM feedback
        `);

        const [recentComments] = await sequelize.query(`
            SELECT 
                f.rating,
                f.comment,
                f.created_at,
                o.id as order_id
            FROM feedback f
            JOIN orders o ON f.order_id = o.id
            WHERE f.comment IS NOT NULL AND f.comment != ''
            ORDER BY f.created_at DESC
            LIMIT 5
        `);

        const statistics = {
            summary: {
                totalFeedback: parseInt(stats[0].total_feedback) || 0,
                averageRating: stats[0].average_rating || '0.0',
                totalComments: parseInt(stats[0].total_comments) || 0,
                latestFeedback: stats[0].latest_feedback
            },
            ratingDistribution: {
                fiveStar: parseInt(stats[0].five_star) || 0,
                fourStar: parseInt(stats[0].four_star) || 0,
                threeStar: parseInt(stats[0].three_star) || 0,
                twoStar: parseInt(stats[0].two_star) || 0,
                oneStar: parseInt(stats[0].one_star) || 0
            },
            recentComments: recentComments.map(comment => ({
                ...comment,
                comment: comment.comment || ''
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