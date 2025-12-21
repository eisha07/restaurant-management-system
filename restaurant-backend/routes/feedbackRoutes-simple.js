const express = require('express');
const router = express.Router();
const { sequelize, QueryTypes } = require('sequelize');

// GET /api/feedback - Get all feedback
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const feedback = await sequelize.query(`
      SELECT 
        f.feedback_id as id,
        f.order_id,
        o.order_number,
        c.name as customer_name,
        f.rating,
        f.comment,
        f.created_at
      FROM feedback f
      LEFT JOIN orders o ON f.order_id = o.order_id
      LEFT JOIN customers c ON f.customer_id = c.customer_id
      ORDER BY f.created_at DESC
      LIMIT $1 OFFSET $2
    `, { bind: [limit, offset], type: QueryTypes.SELECT });
    
    const total = await sequelize.query(`
      SELECT COUNT(*) as count FROM feedback
    `, { type: QueryTypes.SELECT });
    
    res.json({
      feedback,
      pagination: {
        page,
        limit,
        total: total[0].count,
        pages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching feedback:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/feedback/average - Get average ratings
router.get('/average', async (req, res) => {
  try {
    const stats = await sequelize.query(`
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_feedback,
        MAX(rating) as highest_rating,
        MIN(rating) as lowest_rating
      FROM feedback
    `, { type: QueryTypes.SELECT });
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching average ratings:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/feedback - Create feedback
router.post('/', async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;
    
    if (!orderId || !rating) {
      return res.status(400).json({ error: 'Order ID and rating required' });
    }
    
    const result = await sequelize.query(`
      INSERT INTO feedback (order_id, customer_id, rating, comment, created_at)
      SELECT $1, o.customer_id, $2, $3, NOW()
      FROM orders o
      WHERE o.order_id = $1
      RETURNING feedback_id
    `, { bind: [orderId, rating, comment || null], type: QueryTypes.SELECT });
    
    res.json({ success: true, feedbackId: result[0].feedback_id });
  } catch (error) {
    console.error('Error creating feedback:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
