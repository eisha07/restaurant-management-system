const express = require('express');
const router = express.Router();
const { sequelize, QueryTypes } = require('sequelize');

// GET /api/orders - Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await sequelize.query(`
      SELECT 
        o.order_id as id,
        o.order_number,
        c.name as customer_name,
        rt.table_number,
        os.name as status,
        o.created_at,
        o.total_amount as total
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
      LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
      ORDER BY o.created_at DESC
    `, { type: QueryTypes.SELECT });
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/orders/:id - Get single order with items
router.get('/:id', async (req, res) => {
  try {
    const order = await sequelize.query(`
      SELECT 
        o.order_id as id,
        o.order_number,
        c.name as customer_name,
        rt.table_number,
        os.name as status,
        o.created_at,
        o.total_amount as total
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
      LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
      WHERE o.order_id = $1
    `, { bind: [req.params.id], type: QueryTypes.SELECT });
    
    if (!order.length) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const items = await sequelize.query(`
      SELECT 
        oi.order_item_id as id,
        oi.menu_item_id,
        oi.item_name as name,
        oi.item_price as price,
        oi.quantity
      FROM order_items oi
      WHERE oi.order_id = $1
    `, { bind: [req.params.id], type: QueryTypes.SELECT });
    
    res.json({ ...order[0], items });
  } catch (error) {
    console.error('Error fetching order:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  try {
    const { customerSessionId, tableNumber, items } = req.body;
    
    // Calculate total
    let totalAmount = 0;
    
    // Start transaction
    const result = await sequelize.transaction(async (transaction) => {
      // Create order
      const insertOrder = await sequelize.query(`
        INSERT INTO orders (customer_id, table_id, order_status_id, created_at)
        VALUES (
          (SELECT customer_id FROM customers LIMIT 1),
          (SELECT table_id FROM restaurant_tables WHERE table_number = $1 LIMIT 1),
          (SELECT status_id FROM order_statuses WHERE code = 'pending' LIMIT 1),
          NOW()
        )
        RETURNING order_id
      `, { bind: [tableNumber], type: QueryTypes.SELECT, transaction });
      
      const orderId = insertOrder[0].order_id;
      
      // Add order items
      for (const item of items) {
        await sequelize.query(`
          INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity)
          SELECT $1, $2, m.name, m.price, $3
          FROM menu_items m
          WHERE m.item_id = $2
        `, { bind: [orderId, item.menuItemId, item.quantity], transaction });
        
        totalAmount += (item.price * item.quantity) || 0;
      }
      
      // Update order total
      await sequelize.query(`
        UPDATE orders SET total_amount = $2 WHERE order_id = $1
      `, { bind: [orderId, totalAmount], transaction });
      
      return orderId;
    });
    
    res.json({ success: true, orderId: result, total: totalAmount });
  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    await sequelize.query(`
      UPDATE orders 
      SET order_status_id = (SELECT status_id FROM order_statuses WHERE code = $2 LIMIT 1)
      WHERE order_id = $1
    `, { bind: [req.params.id, status] });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating order:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
