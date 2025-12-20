const express = require('express');
const router = express.Router();
const { sequelize, QueryTypes } = require('sequelize');
const { authenticateManager } = require('../middleware/auth');

// GET /api/manager/orders/pending - Get pending orders
router.get('/orders/pending', authenticateManager, async (req, res) => {
  try {
    const orders = await sequelize.query(`
      SELECT 
        o.order_id as id,
        o.order_number,
        c.name as customer_name,
        rt.table_number,
        os.name as status,
        o.created_at,
        COALESCE(SUM(oi.item_price * oi.quantity), 0) as total
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
      LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE os.code IN ('pending', 'pending_approval')
      GROUP BY o.order_id, c.customer_id, rt.table_id, os.status_id
      ORDER BY o.created_at DESC
    `, { type: QueryTypes.SELECT });
    
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Error fetching pending orders:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/manager/orders/all - Get all orders
router.get('/orders/all', authenticateManager, async (req, res) => {
  try {
    const orders = await sequelize.query(`
      SELECT 
        o.order_id as id,
        o.order_number,
        c.name as customer_name,
        rt.table_number,
        os.name as status,
        o.created_at,
        COALESCE(SUM(oi.item_price * oi.quantity), 0) as total
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
      LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      GROUP BY o.order_id, c.customer_id, rt.table_id, os.status_id
      ORDER BY o.created_at DESC
    `, { type: QueryTypes.SELECT });
    
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Error fetching all orders:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/manager/orders/:id/approve - Approve order
router.put('/orders/:id/approve', authenticateManager, async (req, res) => {
  try {
    const { expectedCompletion } = req.body;
    
    await sequelize.query(`
      UPDATE orders 
      SET 
        order_status_id = (SELECT status_id FROM order_statuses WHERE code = 'approved' LIMIT 1),
        kitchen_status_id = (SELECT status_id FROM kitchen_statuses WHERE code = 'pending' LIMIT 1),
        approved_at = NOW(),
        expected_completion = NOW() + ($2 || ' minutes')::INTERVAL
      WHERE order_id = $1
    `, { bind: [req.params.id, expectedCompletion || 30] });
    
    // Broadcast via Socket.IO
    if (global.io) {
      global.io.to('managers').emit('order-approved', { orderId: req.params.id });
      global.io.to('kitchen').emit('order-approved', { orderId: req.params.id });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error approving order:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/manager/orders/:id/reject - Reject order
router.put('/orders/:id/reject', authenticateManager, async (req, res) => {
  try {
    const { reason } = req.body;
    
    await sequelize.query(`
      UPDATE orders 
      SET 
        order_status_id = (SELECT status_id FROM order_statuses WHERE code = 'cancelled' LIMIT 1),
        cancelled_at = NOW()
      WHERE order_id = $1
    `, { bind: [req.params.id] });
    
    // Broadcast via Socket.IO
    if (global.io) {
      global.io.to('managers').emit('order-rejected', { orderId: req.params.id, reason });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting order:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/manager/statistics - Get dashboard statistics
router.get('/statistics', authenticateManager, async (req, res) => {
  try {
    const stats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT o.order_id) as total_orders,
        COALESCE(SUM(oi.item_price * oi.quantity), 0) as total_revenue,
        COALESCE(AVG(oi.item_price * oi.quantity), 0) as average_order_value,
        COUNT(CASE WHEN os.code = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN os.code = 'completed' THEN 1 END) as completed_orders
      FROM orders o
      LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE DATE(o.created_at) = CURRENT_DATE
    `, { type: QueryTypes.SELECT });
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching statistics:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/manager/menu - Get menu items
router.get('/menu', authenticateManager, async (req, res) => {
  try {
    const items = await sequelize.query(`
      SELECT 
        m.item_id as id,
        m.name,
        m.description,
        m.price,
        m.image_url,
        m.is_available,
        c.name as category
      FROM menu_items m
      LEFT JOIN menu_categories c ON m.category_id = c.category_id
      ORDER BY c.name, m.name
    `, { type: QueryTypes.SELECT });
    
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error fetching menu:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/manager/menu - Add menu item
router.post('/menu', authenticateManager, async (req, res) => {
  try {
    const { name, description, price, category_id, preparation_time_min, is_available } = req.body;
    
    const result = await sequelize.query(`
      INSERT INTO menu_items (name, description, price, category_id, preparation_time_min, is_available)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING item_id as id
    `, { bind: [name, description, price, category_id, preparation_time_min, is_available !== false], type: QueryTypes.SELECT });
    
    res.json({ success: true, item_id: result[0].id });
  } catch (error) {
    console.error('Error adding menu item:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/manager/menu/:id - Update menu item
router.put('/menu/:id', authenticateManager, async (req, res) => {
  try {
    const { name, description, price, is_available } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) { updates.push(`name = $${paramCount++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${paramCount++}`); values.push(description); }
    if (price !== undefined) { updates.push(`price = $${paramCount++}`); values.push(price); }
    if (is_available !== undefined) { updates.push(`is_available = $${paramCount++}`); values.push(is_available); }
    
    values.push(req.params.id);
    
    await sequelize.query(`
      UPDATE menu_items 
      SET ${updates.join(', ')}
      WHERE item_id = $${paramCount}
    `, { bind: values });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating menu item:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/manager/menu/:id - Delete menu item
router.delete('/menu/:id', authenticateManager, async (req, res) => {
  try {
    await sequelize.query(`
      DELETE FROM menu_items WHERE item_id = $1
    `, { bind: [req.params.id] });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/manager/feedback - Get feedback
router.get('/feedback', authenticateManager, async (req, res) => {
  try {
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
      LIMIT 50
    `, { type: QueryTypes.SELECT });
    
    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
