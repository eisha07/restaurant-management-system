const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

// =============================================
// MOCK/CACHE DATA (for offline or DB failures)
// =============================================
const mockMenuItems = [
  {
    id: 1,
    name: 'Chicken Biryani',
    description: 'Aromatic basmati rice cooked with tender chicken pieces, herbs, and spices',
    price: 12.99,
    category: 'Desi',
    image_url: '/images/biryani.jpg',
    is_available: true,
    rating: 4.8
  },
  {
    id: 2,
    name: 'Butter Chicken',
    description: 'Tender chicken pieces in a rich, creamy tomato-based sauce with butter and cream',
    price: 14.99,
    category: 'Curries',
    image_url: '/images/butter-chicken.jpg',
    is_available: true,
    rating: 4.7
  },
  {
    id: 3,
    name: 'Paneer Tikka',
    description: 'Marinated cottage cheese cubes grilled to perfection with vegetables',
    price: 9.99,
    category: 'Appetizers',
    image_url: '/images/paneer-tikka.jpg',
    is_available: true,
    rating: 4.5
  },
  {
    id: 4,
    name: 'Garlic Naan',
    description: 'Soft, fluffy Indian bread topped with garlic and butter',
    price: 3.99,
    category: 'Breads',
    image_url: '/images/garlic-naan.jpg',
    is_available: true,
    rating: 4.6
  },
  {
    id: 5,
    name: 'Dal Makhani',
    description: 'Creamy lentil curry slow-cooked with butter, cream, and aromatic spices',
    price: 10.99,
    category: 'Curries',
    image_url: '/images/dal-makhani.jpg',
    is_available: true,
    rating: 4.4
  },
  {
    id: 6,
    name: 'Samosa',
    description: 'Crispy pastry filled with spiced potatoes and peas',
    price: 4.99,
    category: 'Appetizers',
    image_url: '/images/samosa.jpg',
    is_available: true,
    rating: 4.3
  }
];

// =============================================
// GET ROUTES (Public - for customers)
// =============================================

// GET /api/menu - Complete menu with categories and items
router.get('/', async (req, res) => {
    try {
        // Try to fetch from database first
        const [items] = await sequelize.query(`
            SELECT 
                m.id,
                m.name,
                m.description,
                m.price,
                m.image_url,
                m.is_available,
                c.name as category
            FROM menu_items m
            LEFT JOIN categories c ON m.category_id = c.id
            WHERE m.is_available = true
            ORDER BY c.name, m.name
        `);

        if (items.length === 0) {
            // If no items in database, return mock data
            console.log('No items in database, returning mock data');
            return res.json(mockMenuItems);
        }

        // Transform database items to match frontend expectations
        const transformedItems = items.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price),
            category: item.category || 'Uncategorized',
            image_url: item.image_url || '/images/default-food.jpg',
            is_available: item.is_available,
            rating: 4.5  // Default rating if not in database
        }));

        // Return array directly (not wrapped in success/data object)
        res.json(transformedItems);

    } catch (error) {
        console.error('Error fetching menu from database:', error);
        
        // Return mock data as fallback
        console.log('Database error, returning mock data');
        res.json(mockMenuItems);
    }
});

// GET /api/menu/items - All menu items with filters
// This endpoint returns exactly what frontend expects
router.get('/items', async (req, res) => {
    const { category, search, available } = req.query;
    
    try {
        // Build dynamic query based on filters
        let query = `
            SELECT 
                m.id,
                m.name,
                m.description,
                m.price,
                m.image_url,
                m.is_available,
                c.name as category
            FROM menu_items m
            LEFT JOIN categories c ON m.category_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;
        
        // Filter by availability
        if (available !== 'false') {
            paramCount++;
            query += ` AND m.is_available = $${paramCount}`;
            params.push(true);
        }
        
        // Filter by category
        if (category && category !== 'all') {
            paramCount++;
            query += ` AND c.name = $${paramCount}`;
            params.push(category);
        }
        
        // Search by name or description
        if (search) {
            paramCount++;
            query += ` AND (
                LOWER(m.name) LIKE LOWER($${paramCount}) OR 
                LOWER(m.description) LIKE LOWER($${paramCount})
            )`;
            params.push(`%${search}%`);
        }
        
        query += ` ORDER BY c.name, m.name`;
        
        const [items] = await sequelize.query(query, { bind: params });

        // Transform to frontend format
        const frontendItems = items.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price),
            category: item.category || 'Uncategorized',
            image_url: item.image_url || '/images/default-food.jpg',
            is_available: item.is_available,
            rating: 4.5
        }));

        console.log(`Returning ${frontendItems.length} menu items from database`);

        // Return array directly (frontend expects array, not wrapped object)
        res.json(frontendItems);

    } catch (error) {
        console.error('Error fetching filtered menu items:', error);
        
        // Apply filters to mock data as fallback
        let items = mockMenuItems;
        
        if (category && category !== 'all') {
            items = items.filter(item => item.category === category);
        }
        
        if (search) {
            const searchLower = search.toLowerCase();
            items = items.filter(item =>
                item.name.toLowerCase().includes(searchLower) ||
                item.description.toLowerCase().includes(searchLower)
            );
        }
        
        console.log(`Returning ${items.length} menu items (from mock cache)`);
        
        // Return array directly
        res.json(items);
    }
});

// GET /api/menu/simple - Simple endpoint returning exactly what frontend needs
router.get('/simple', async (req, res) => {
    try {
        const [items] = await sequelize.query(`
            SELECT 
                id,
                name,
                description,
                price,
                image_url as "image",
                is_available as "isAvailable",
                category_id
            FROM menu_items
            WHERE is_available = true
            ORDER BY name
        `);

        // Transform to frontend format
        const transformed = items.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price),
            category: 'Category ' + item.category_id, // You might want to join with categories table
            image: item.image || '/images/default-food.jpg',
            isAvailable: item.isAvailable,
            rating: 4.5
        }));

        res.json(transformed);

    } catch (error) {
        console.error('Error in simple menu endpoint:', error);
        res.json(mockMenuItems);
    }
});

// GET /api/menu/items/:id - Single menu item details
router.get('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [items] = await sequelize.query(`
            SELECT 
                m.id,
                m.name,
                m.description,
                m.price,
                m.image_url,
                m.is_available,
                c.name as category
            FROM menu_items m
            LEFT JOIN categories c ON m.category_id = c.id
            WHERE m.id = $1
        `, { bind: [id] });

        if (items.length === 0) {
            return res.status(404).json({ 
                error: 'Menu item not found' 
            });
        }

        const item = items[0];
        
        // Transform to frontend format
        const frontendItem = {
            id: item.id,
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price),
            category: item.category || 'Uncategorized',
            image_url: item.image_url || '/images/default-food.jpg',
            is_available: item.is_available,
            rating: 4.5
        };

        res.json(frontendItem);

    } catch (error) {
        console.error('Error fetching menu item:', error);
        
        // Try to find in mock data
        const mockItem = mockMenuItems.find(item => item.id == req.params.id);
        if (mockItem) {
            res.json(mockItem);
        } else {
            res.status(404).json({ error: 'Menu item not found' });
        }
    }
});

// GET /api/menu/categories/:category/items - Items for specific category
router.get('/categories/:category/items', async (req, res) => {
    try {
        const { category } = req.params;

        const [items] = await sequelize.query(`
            SELECT 
                m.id,
                m.name,
                m.description,
                m.price,
                m.image_url,
                m.is_available
            FROM menu_items m
            LEFT JOIN categories c ON m.category_id = c.id
            WHERE c.name = $1 AND m.is_available = true
            ORDER BY m.name
        `, { bind: [category] });

        // Transform to frontend format
        const frontendItems = items.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price),
            category: category,
            image_url: item.image_url || '/images/default-food.jpg',
            is_available: item.is_available,
            rating: 4.5
        }));

        res.json(frontendItems);

    } catch (error) {
        console.error('Error fetching category items:', error);
        
        // Filter mock data by category
        const filteredItems = mockMenuItems.filter(item => 
            item.category.toLowerCase() === req.params.category.toLowerCase()
        );
        
        res.json(filteredItems);
    }
});

// GET /api/menu/categories - All categories
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await sequelize.query(`
            SELECT 
                id, 
                name, 
                description 
            FROM categories 
            ORDER BY name
        `);

        res.json(categories);

    } catch (error) {
        console.error('Error fetching categories:', error);
        
        // Get unique categories from mock data
        const uniqueCategories = [...new Set(mockMenuItems.map(item => item.category))]
            .map((category, index) => ({
                id: index + 1,
                name: category,
                description: `${category} dishes`
            }));
        
        res.json(uniqueCategories);
    }
});

// =============================================
// POST ROUTES (Manager only - would add auth later)
// =============================================

// POST /api/menu/items - Create new menu item
router.post('/items', async (req, res) => {
    try {
        const { name, description, price, category_id, image_url, is_available = true } = req.body;

        // Validation
        if (!name || !price || !category_id) {
            return res.status(400).json({
                error: 'Missing required fields: name, price, category_id'
            });
        }

        if (price <= 0) {
            return res.status(400).json({
                error: 'Price must be greater than 0'
            });
        }

        // Check if category exists
        const [categoryCheck] = await sequelize.query(
            'SELECT id, name FROM categories WHERE id = $1',
            { bind: [category_id] }
        );

        if (categoryCheck.length === 0) {
            return res.status(400).json({
                error: 'Category does not exist'
            });
        }

        // Create menu item
        const [newItem] = await sequelize.query(`
            INSERT INTO menu_items (name, description, price, category_id, image_url, is_available)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, {
            bind: [name, description, price, category_id, image_url, is_available]
        });

        // Transform to frontend format
        const createdItem = {
            id: newItem[0].id,
            name: newItem[0].name,
            description: newItem[0].description || '',
            price: parseFloat(newItem[0].price),
            category: categoryCheck[0].name,
            image_url: newItem[0].image_url || '/images/default-food.jpg',
            is_available: newItem[0].is_available,
            rating: 4.5
        };

        res.status(201).json(createdItem);

    } catch (error) {
        console.error('Error creating menu item:', error);
        res.status(500).json({
            error: 'Failed to create menu item',
            details: error.message
        });
    }
});

// POST /api/menu/categories - Create new category
router.post('/categories', async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                error: 'Category name is required'
            });
        }

        const [newCategory] = await sequelize.query(`
            INSERT INTO categories (name, description)
            VALUES ($1, $2)
            RETURNING *
        `, {
            bind: [name, description]
        });

        res.status(201).json(newCategory[0]);

    } catch (error) {
        // Handle duplicate category name
        if (error.message.includes('unique constraint')) {
            return res.status(400).json({
                error: 'Category name already exists'
            });
        }

        console.error('Error creating category:', error);
        res.status(500).json({
            error: 'Failed to create category',
            details: error.message
        });
    }
});

// =============================================
// PUT/PATCH ROUTES (Manager only - would add auth later)
// =============================================

// PUT /api/menu/items/:id - Update menu item
router.put('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category_id, image_url, is_available } = req.body;

        // Check if item exists
        const [existingItem] = await sequelize.query(
            'SELECT id FROM menu_items WHERE id = $1',
            { bind: [id] }
        );

        if (existingItem.length === 0) {
            return res.status(404).json({
                error: 'Menu item not found'
            });
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 0;

        if (name !== undefined) {
            paramCount++;
            updates.push(`name = $${paramCount}`);
            values.push(name);
        }
        if (description !== undefined) {
            paramCount++;
            updates.push(`description = $${paramCount}`);
            values.push(description);
        }
        if (price !== undefined) {
            if (price <= 0) {
                return res.status(400).json({
                    error: 'Price must be greater than 0'
                });
            }
            paramCount++;
            updates.push(`price = $${paramCount}`);
            values.push(price);
        }
        if (category_id !== undefined) {
            // Verify category exists
            const [categoryCheck] = await sequelize.query(
                'SELECT id, name FROM categories WHERE id = $1',
                { bind: [category_id] }
            );
            if (categoryCheck.length === 0) {
                return res.status(400).json({
                    error: 'Category does not exist'
                });
            }
            paramCount++;
            updates.push(`category_id = $${paramCount}`);
            values.push(category_id);
        }
        if (image_url !== undefined) {
            paramCount++;
            updates.push(`image_url = $${paramCount}`);
            values.push(image_url);
        }
        if (is_available !== undefined) {
            paramCount++;
            updates.push(`is_available = $${paramCount}`);
            values.push(is_available);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No fields to update'
            });
        }

        paramCount++;
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id); // For the WHERE clause

        const [updatedItem] = await sequelize.query(`
            UPDATE menu_items 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `, { bind: values });

        // Get category name for response
        const [categoryInfo] = await sequelize.query(
            'SELECT name FROM categories WHERE id = $1',
            { bind: [category_id || updatedItem[0].category_id] }
        );

        // Transform to frontend format
        const transformedItem = {
            id: updatedItem[0].id,
            name: updatedItem[0].name,
            description: updatedItem[0].description || '',
            price: parseFloat(updatedItem[0].price),
            category: categoryInfo[0]?.name || 'Uncategorized',
            image_url: updatedItem[0].image_url || '/images/default-food.jpg',
            is_available: updatedItem[0].is_available,
            rating: 4.5
        };

        res.json(transformedItem);

    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({
            error: 'Failed to update menu item',
            details: error.message
        });
    }
});

// PUT /api/menu/categories/:id - Update category
router.put('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        // Check if category exists
        const [existingCategory] = await sequelize.query(
            'SELECT id FROM categories WHERE id = $1',
            { bind: [id] }
        );

        if (existingCategory.length === 0) {
            return res.status(404).json({
                error: 'Category not found'
            });
        }

        const updates = [];
        const values = [];
        let paramCount = 0;

        if (name !== undefined) {
            paramCount++;
            updates.push(`name = $${paramCount}`);
            values.push(name);
        }
        if (description !== undefined) {
            paramCount++;
            updates.push(`description = $${paramCount}`);
            values.push(description);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No fields to update'
            });
        }

        paramCount++;
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const [updatedCategory] = await sequelize.query(`
            UPDATE categories 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `, { bind: values });

        res.json(updatedCategory[0]);

    } catch (error) {
        if (error.message.includes('unique constraint')) {
            return res.status(400).json({
                error: 'Category name already exists'
            });
        }

        console.error('Error updating category:', error);
        res.status(500).json({
            error: 'Failed to update category',
            details: error.message
        });
    }
});

// =============================================
// DELETE ROUTES (Manager only - would add auth later)
// =============================================

// DELETE /api/menu/items/:id - Delete menu item (soft delete)
router.delete('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if item exists
        const [existingItem] = await sequelize.query(
            'SELECT id FROM menu_items WHERE id = $1',
            { bind: [id] }
        );

        if (existingItem.length === 0) {
            return res.status(404).json({
                error: 'Menu item not found'
            });
        }

        // Soft delete by setting is_available to false
        await sequelize.query(`
            UPDATE menu_items 
            SET is_available = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, { bind: [id] });

        res.json({
            success: true,
            message: 'Menu item deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({
            error: 'Failed to delete menu item',
            details: error.message
        });
    }
});

// DELETE /api/menu/categories/:id - Delete category
router.delete('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category exists
        const [existingCategory] = await sequelize.query(
            'SELECT id FROM categories WHERE id = $1',
            { bind: [id] }
        );

        if (existingCategory.length === 0) {
            return res.status(404).json({
                error: 'Category not found'
            });
        }

        // Check if category has menu items
        const [categoryItems] = await sequelize.query(
            'SELECT id FROM menu_items WHERE category_id = $1 AND is_available = true LIMIT 1',
            { bind: [id] }
        );

        if (categoryItems.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete category that has active menu items'
            });
        }

        await sequelize.query(
            'DELETE FROM categories WHERE id = $1',
            { bind: [id] }
        );

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            error: 'Failed to delete category',
            details: error.message
        });
    }
});

// =============================================
// HEALTH CHECK ENDPOINT
// =============================================

router.get('/health', async (req, res) => {
    try {
        // Test database connection
        await sequelize.query('SELECT 1');
        
        // Get item count
        const [result] = await sequelize.query('SELECT COUNT(*) as count FROM menu_items');
        const itemCount = result[0]?.count || 0;
        
        res.json({
            status: 'healthy',
            database: 'connected',
            menu_items_count: itemCount,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;