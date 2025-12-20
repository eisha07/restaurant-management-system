const express = require('express');
const router = express.Router();
const { sequelize, QueryTypes } = require('sequelize');

// GET /api/menu - Get all menu items
router.get('/', async (req, res) => {
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
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching menu:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/menu/:id - Get single menu item
router.get('/:id', async (req, res) => {
  try {
    const item = await sequelize.query(`
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
      WHERE m.item_id = $1
    `, { bind: [req.params.id], type: QueryTypes.SELECT });
    
    if (!item.length) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item[0]);
  } catch (error) {
    console.error('Error fetching menu item:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/menu/category/:category - Get items by category
router.get('/category/:category', async (req, res) => {
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
      WHERE c.name = $1
      ORDER BY m.name
    `, { bind: [req.params.category], type: QueryTypes.SELECT });
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching menu by category:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
