-- Restaurant Management System Database Schema & Data
-- This file creates all tables and inserts sample data

-- =============================================
-- CREATE TABLES
-- =============================================

-- Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(100),
    table_number VARCHAR(20),
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    status VARCHAR(50) DEFAULT 'pending_approval',
    kitchen_status VARCHAR(50) DEFAULT 'pending',
    special_instructions TEXT,
    approved_at TIMESTAMP,
    expected_completion TIMESTAMP,
    receipt_generated BOOLEAN DEFAULT false,
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    food_quality INTEGER CHECK (food_quality >= 1 AND food_quality <= 5),
    service_speed INTEGER CHECK (service_speed >= 1 AND service_speed <= 5),
    overall_experience INTEGER CHECK (overall_experience >= 1 AND overall_experience <= 5),
    accuracy INTEGER CHECK (accuracy >= 1 AND accuracy <= 5),
    value_for_money INTEGER CHECK (value_for_money >= 1 AND value_for_money <= 5),
    average_rating DECIMAL(3, 2),
    comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Managers Table
CREATE TABLE IF NOT EXISTS managers (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kitchen Status Logs Table
CREATE TABLE IF NOT EXISTS kitchen_logs (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INSERT SAMPLE DATA
-- =============================================

-- Clear existing data (optional)
-- TRUNCATE TABLE menu_items, orders, order_items, feedback, kitchen_logs, managers RESTART IDENTITY CASCADE;

-- Insert Menu Items
INSERT INTO menu_items (name, description, price, category, image_url, is_available, created_at) VALUES
-- Desi Category
('Chicken Biryani', 'Aromatic basmati rice cooked with tender chicken pieces, herbs, and spices', 12.99, 'Desi', '/images/biryani.jpg', true, CURRENT_TIMESTAMP),
('Chicken Karahi', 'Traditional Pakistani curry cooked in wok with tomatoes and ginger', 13.99, 'Desi', '/images/karahi.jpg', true, CURRENT_TIMESTAMP),
('Chicken Tikka', 'Marinated chicken pieces grilled in clay oven with spices', 11.99, 'Desi', '/images/tikka.jpg', false, CURRENT_TIMESTAMP),
('Beef Nihari', 'Slow-cooked beef shank in rich, spicy gravy', 15.99, 'Desi', '/images/nihari.jpg', true, CURRENT_TIMESTAMP),
('Chana Masala', 'Chickpeas cooked in flavorful tomato gravy', 8.99, 'Desi', '/images/chana.jpg', true, CURRENT_TIMESTAMP),

-- Fast Food Category
('Beef Burger', 'Juicy beef patty with cheese, lettuce, tomato, and special sauce', 9.99, 'Fast Food', '/images/burger.jpg', true, CURRENT_TIMESTAMP),
('French Fries', 'Crispy golden fries served with ketchup', 4.99, 'Fast Food', '/images/fries.jpg', true, CURRENT_TIMESTAMP),
('Pizza Margherita', 'Classic pizza with tomato sauce, mozzarella, and fresh basil', 16.99, 'Fast Food', '/images/pizza.jpg', true, CURRENT_TIMESTAMP),
('Chicken Wings', 'Crispy chicken wings with choice of sauce', 10.99, 'Fast Food', '/images/wings.jpg', true, CURRENT_TIMESTAMP),
('Club Sandwich', 'Triple-decker sandwich with chicken, bacon, and veggies', 8.99, 'Fast Food', '/images/sandwich.jpg', true, CURRENT_TIMESTAMP),

-- Continental Category
('Pasta Carbonara', 'Creamy pasta with eggs, cheese, pancetta, and black pepper', 14.99, 'Continental', '/images/pasta.jpg', true, CURRENT_TIMESTAMP),
('Grilled Salmon', 'Atlantic salmon with lemon butter sauce and seasonal vegetables', 22.99, 'Continental', '/images/salmon.jpg', true, CURRENT_TIMESTAMP),
('Beef Steak', 'Grilled ribeye steak with mashed potatoes', 24.99, 'Continental', '/images/steak.jpg', true, CURRENT_TIMESTAMP),
('Caesar Salad', 'Fresh romaine lettuce with croutons, parmesan, and Caesar dressing', 9.99, 'Continental', '/images/salad.jpg', true, CURRENT_TIMESTAMP),
('Mushroom Risotto', 'Creamy arborio rice with mushrooms and parmesan', 13.99, 'Continental', '/images/risotto.jpg', true, CURRENT_TIMESTAMP),

-- Beverages
('Coca-Cola', 'Classic cola drink', 2.99, 'Beverages', '/images/cola.jpg', true, CURRENT_TIMESTAMP),
('Fresh Lime Soda', 'Refreshing lime soda with mint', 3.99, 'Beverages', '/images/lime.jpg', true, CURRENT_TIMESTAMP),
('Mango Lassi', 'Sweet yogurt-based mango drink', 4.99, 'Beverages', '/images/lassi.jpg', true, CURRENT_TIMESTAMP),
('Mineral Water', '500ml bottled water', 1.99, 'Beverages', '/images/water.jpg', true, CURRENT_TIMESTAMP),

-- Desserts
('Chocolate Brownie', 'Warm chocolate brownie with vanilla ice cream', 6.99, 'Desserts', '/images/brownie.jpg', true, CURRENT_TIMESTAMP),
('Cheesecake', 'New York style cheesecake with berry compote', 7.99, 'Desserts', '/images/cheesecake.jpg', true, CURRENT_TIMESTAMP),
('Gulab Jamun', 'Sweet milk dumplings in sugar syrup', 5.99, 'Desserts', '/images/gulabjamun.jpg', true, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Insert Sample Orders
INSERT INTO orders (order_number, customer_id, table_number, subtotal, tax, total, payment_method, payment_status, status, kitchen_status, special_instructions, approved_at, expected_completion, receipt_generated, created_at) VALUES
('ORD-001', 'CUST-001', '5', 38.96, 3.12, 42.08, 'cash', 'paid', 'completed', 'completed', 'Extra spicy biryani', '2024-01-15 12:30:00', '2024-01-15 12:55:00', true, '2024-01-15 12:25:00'),
('ORD-002', 'CUST-002', '12', 22.97, 1.84, 24.81, 'card', 'paid', 'ready', 'ready', 'No onions in burger', '2024-01-15 13:15:00', '2024-01-15 13:40:00', true, '2024-01-15 13:10:00'),
('ORD-003', 'CUST-003', 'TAKEAWAY', 29.98, 2.40, 32.38, 'online', 'paid', 'in_progress', 'in_progress', 'Pack separately', '2024-01-15 14:00:00', '2024-01-15 14:25:00', false, '2024-01-15 13:55:00'),
('ORD-004', 'CUST-004', '8', 16.98, 1.36, 18.34, 'cash', 'pending', 'pending_approval', 'pending', 'Extra ketchup', NULL, NULL, false, CURRENT_TIMESTAMP),
('ORD-005', 'CUST-005', '3', 44.97, 3.60, 48.57, 'card', 'paid', 'approved', 'preparing', 'Well done steak', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '25 minutes', false, CURRENT_TIMESTAMP - INTERVAL '5 minutes')
ON CONFLICT (order_number) DO NOTHING;

-- Insert Order Items
INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, special_instructions) VALUES
-- Order 1 items
(1, 1, 'Chicken Biryani', 12.99, 2, 'Extra spicy'),
(1, 17, 'Coca-Cola', 2.99, 1, NULL),
(1, 20, 'Mineral Water', 1.99, 1, NULL),

-- Order 2 items
(2, 6, 'Beef Burger', 9.99, 1, 'No onions'),
(2, 7, 'French Fries', 4.99, 1, 'Extra crispy'),
(2, 18, 'Fresh Lime Soda', 3.99, 2, NULL),

-- Order 3 items
(3, 11, 'Pasta Carbonara', 14.99, 2, NULL),

-- Order 4 items
(4, 6, 'Beef Burger', 9.99, 1, NULL),
(4, 7, 'French Fries', 4.99, 1, 'Extra ketchup'),
(4, 17, 'Coca-Cola', 2.99, 1, NULL),

-- Order 5 items
(5, 12, 'Grilled Salmon', 22.99, 1, 'Lemon on side'),
(5, 13, 'Beef Steak', 24.99, 1, 'Well done'),
(5, 19, 'Mango Lassi', 4.99, 1, NULL)
ON CONFLICT DO NOTHING;

-- Insert Sample Feedback
INSERT INTO feedback (order_id, food_quality, service_speed, overall_experience, accuracy, value_for_money, average_rating, comment, submitted_at) VALUES
(1, 5, 4, 5, 5, 4, 4.6, 'Excellent biryani! Will come again.', '2024-01-15 13:30:00'),
(2, 4, 5, 4, 5, 4, 4.4, 'Burger was perfect, fries could be crispier', '2024-01-15 14:00:00'),
(3, 3, 3, 3, 4, 3, 3.2, 'Pasta was okay, service was slow', '2024-01-15 15:00:00')
ON CONFLICT DO NOTHING;

-- Insert Kitchen Logs
INSERT INTO kitchen_logs (order_id, status, notes, created_at) VALUES
(1, 'received', 'Order received from table 5', '2024-01-15 12:31:00'),
(1, 'preparing', 'Started cooking biryani', '2024-01-15 12:35:00'),
(1, 'ready', 'Order ready for pickup', '2024-01-15 12:50:00'),
(2, 'received', 'Order from table 12', '2024-01-15 13:16:00'),
(2, 'preparing', 'Burger and fries in progress', '2024-01-15 13:20:00'),
(3, 'received', 'Takeaway order', '2024-01-15 14:01:00'),
(3, 'preparing', 'Preparing pasta', '2024-01-15 14:05:00'),
(5, 'received', 'Table 3 order', CURRENT_TIMESTAMP - INTERVAL '4 minutes'),
(5, 'preparing', 'Steak and salmon in progress', CURRENT_TIMESTAMP - INTERVAL '2 minutes')
ON CONFLICT DO NOTHING;

-- Insert Manager Accounts
INSERT INTO managers (username, password_hash, email, created_at) VALUES
('admin', 'admin123', 'admin@restaurant.com', CURRENT_TIMESTAMP),
('manager1', 'manager123', 'manager1@restaurant.com', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- CREATE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_kitchen_status ON orders(kitchen_status);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_feedback_order_id ON feedback(order_id);

-- =============================================
-- VERIFY DATA
-- =============================================

SELECT 'Database initialization complete!' as status;
SELECT COUNT(*) as menu_items FROM menu_items;
SELECT COUNT(*) as orders FROM orders;
SELECT COUNT(*) as order_items FROM order_items;
SELECT COUNT(*) as feedback FROM feedback;
SELECT COUNT(*) as managers FROM managers;
