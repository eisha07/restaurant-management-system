const express = require('express');
const router = express.Router();
const { sequelize, QueryTypes } = require('sequelize');
const { authenticateKitchen } = require('../middleware/kitchenAuth');

// GET /api/kitchen/orders - Get pending kitchen orders
router.get('/orders', authenticateKitchen, async (req, res) => {
  try {
    const orders = await sequelize.query(`
      SELECT 
        o.order_id as id,
        o.order_number,
        rt.table_number,
        ks.name as status,
        o.created_at,
        o.expected_completion
      FROM orders o
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
      LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
      WHERE ks.code IN ('pending', 'in_progress')
      ORDER BY o.created_at ASC
    `, { type: QueryTypes.SELECT });
    
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching kitchen orders:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/kitchen/orders/:id/items - Get items for an order
router.get('/orders/:id/items', authenticateKitchen, async (req, res) => {
  try {
    const items = await sequelize.query(`
      SELECT 
        oi.order_item_id as id,
        m.name as item_name,
        oi.quantity,
        oi.special_instructions,
        kis.name as status
      FROM order_items oi
      LEFT JOIN menu_items m ON oi.menu_item_id = m.item_id
      LEFT JOIN kitchen_item_statuses kis ON oi.kitchen_item_status_id = kis.status_id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
    `, { bind: [req.params.id], type: QueryTypes.SELECT });
    
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error fetching order items:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/kitchen/orders/:id/status - Update order status
router.put('/orders/:id/status', authenticateKitchen, async (req, res) => {
  try {
    const { status } = req.body;
    
    await sequelize.query(`
      UPDATE orders 
      SET kitchen_status_id = (SELECT status_id FROM kitchen_statuses WHERE code = $1 LIMIT 1)
      WHERE order_id = $2
    `, { bind: [status, req.params.id] });
    
    // Broadcast via Socket.IO
    if (global.io) {
      global.io.to('kitchen').emit('order-status-updated', { orderId: req.params.id, status });
      global.io.to('managers').emit('kitchen-update', { orderId: req.params.id, status });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating order status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/kitchen/items/:id/status - Update item status
router.put('/items/:id/status', authenticateKitchen, async (req, res) => {
  try {
    const { status } = req.body;
    
    await sequelize.query(`
      UPDATE order_items 
      SET kitchen_item_status_id = (SELECT status_id FROM kitchen_item_statuses WHERE code = $1 LIMIT 1)
      WHERE order_item_id = $2
    `, { bind: [status, req.params.id] });
    
    // Broadcast via Socket.IO
    if (global.io) {
      global.io.to('kitchen').emit('item-status-updated', { itemId: req.params.id, status });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating item status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/kitchen/statistics - Get kitchen statistics
router.get('/statistics', authenticateKitchen, async (req, res) => {
  try {
    const stats = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT o.order_id) as total_orders,
        COUNT(CASE WHEN ks.code = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN ks.code = 'completed' THEN 1 END) as completed,
        ROUND(AVG(EXTRACT(EPOCH FROM (o.completed_at - o.created_at))/60)::numeric, 2) as avg_prep_time_minutes
      FROM orders o
      LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
      WHERE DATE(o.created_at) = CURRENT_DATE
    `, { type: QueryTypes.SELECT });
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching kitchen statistics:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
