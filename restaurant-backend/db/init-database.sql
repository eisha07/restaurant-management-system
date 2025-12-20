-- Restaurant Management System Database Schema & Data
-- This file creates all tables and inserts sample data
-- Wrapped in transaction for atomicity

BEGIN;

-- =============================================
-- CREATE TABLES
-- =============================================

-- Menu Categories Table
CREATE TABLE IF NOT EXISTS menu_categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Statuses Table
CREATE TABLE IF NOT EXISTS order_statuses (
    status_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kitchen Statuses Table
CREATE TABLE IF NOT EXISTS kitchen_statuses (
    status_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Statuses Table
CREATE TABLE IF NOT EXISTS payment_statuses (
    status_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
    method_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    requires_gateway BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Restaurant Tables Table
CREATE TABLE IF NOT EXISTS restaurant_tables (
    table_id SERIAL PRIMARY KEY,
    table_number VARCHAR(20) UNIQUE NOT NULL,
    table_type VARCHAR(50) DEFAULT 'standard',
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    location_zone VARCHAR(100),
    location_description TEXT,
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE,
    name VARCHAR(200),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu Items Table with enhanced constraints
CREATE TABLE IF NOT EXISTS menu_items (
    item_id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES menu_categories(category_id) ON UPDATE CASCADE,
    item_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    cost_price DECIMAL(10, 2) CHECK (cost_price IS NULL OR cost_price >= 0),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    preparation_time_min INTEGER DEFAULT 15 CHECK (preparation_time_min IS NULL OR preparation_time_min > 0),
    spicy_level INTEGER CHECK (spicy_level IS NULL OR spicy_level BETWEEN 0 AND 5),
    calories INTEGER CHECK (calories IS NULL OR calories >= 0),
    dietary_tags VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure cost_price doesn't exceed selling price
    CONSTRAINT check_cost_less_than_price CHECK (cost_price IS NULL OR cost_price <= price)
);

-- Managers Table
CREATE TABLE IF NOT EXISTS managers (
    manager_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(200),
    role VARCHAR(50) DEFAULT 'manager' CHECK (role IN ('admin', 'manager', 'staff')),
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table with enhanced constraints
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(customer_id) ON DELETE SET NULL,
    table_id INTEGER REFERENCES restaurant_tables(table_id) ON DELETE SET NULL,
    order_status_id INTEGER NOT NULL REFERENCES order_statuses(status_id) ON UPDATE CASCADE DEFAULT 1,
    kitchen_status_id INTEGER NOT NULL REFERENCES kitchen_statuses(status_id) ON UPDATE CASCADE DEFAULT 1,
    payment_status_id INTEGER NOT NULL REFERENCES payment_statuses(status_id) ON UPDATE CASCADE DEFAULT 1,
    payment_method_id INTEGER REFERENCES payment_methods(method_id) ON UPDATE CASCADE,
    special_instructions TEXT,
    estimated_prep_time INTEGER CHECK (estimated_prep_time IS NULL OR estimated_prep_time > 0),
    approved_at TIMESTAMP,
    expected_completion TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_by VARCHAR(100) DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Temporal constraints
    CONSTRAINT check_approved_after_created CHECK (approved_at IS NULL OR approved_at >= created_at),
    CONSTRAINT check_completed_after_created CHECK (completed_at IS NULL OR completed_at >= created_at),
    CONSTRAINT check_cancelled_after_created CHECK (cancelled_at IS NULL OR cancelled_at >= created_at),
    CONSTRAINT check_expected_after_approved CHECK (expected_completion IS NULL OR approved_at IS NULL OR expected_completion >= approved_at)
);

-- Order Items Table with CASCADE delete
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(item_id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    item_price DECIMAL(10, 2) NOT NULL CHECK (item_price > 0),
    item_description TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    special_instructions TEXT,
    item_status VARCHAR(50) DEFAULT 'pending' CHECK (item_status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Transactions Table with CASCADE delete and constraints
CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    payment_method_id INTEGER REFERENCES payment_methods(method_id) ON UPDATE CASCADE,
    transaction_reference VARCHAR(100) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'PKR',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    gateway_name VARCHAR(100),
    gateway_response JSONB,
    gateway_transaction_id VARCHAR(100),
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    refunded_at TIMESTAMP,
    refund_amount DECIMAL(10, 2) CHECK (refund_amount IS NULL OR refund_amount >= 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Refund cannot exceed original amount
    CONSTRAINT check_refund_not_exceed CHECK (refund_amount IS NULL OR refund_amount <= amount)
);

-- Feedback Table with CASCADE delete and unique constraint
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(customer_id) ON DELETE SET NULL,
    food_quality INTEGER CHECK (food_quality BETWEEN 1 AND 5),
    service_speed INTEGER CHECK (service_speed BETWEEN 1 AND 5),
    overall_experience INTEGER CHECK (overall_experience BETWEEN 1 AND 5),
    order_accuracy INTEGER CHECK (order_accuracy BETWEEN 1 AND 5),
    value_for_money INTEGER CHECK (value_for_money BETWEEN 1 AND 5),
    comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- One feedback per order
    CONSTRAINT unique_feedback_per_order UNIQUE (order_id)
);

-- Kitchen Logs Table with CASCADE delete
CREATE TABLE IF NOT EXISTS kitchen_logs (
    log_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    status_id INTEGER REFERENCES kitchen_statuses(status_id) ON UPDATE CASCADE,
    updated_by INTEGER REFERENCES managers(manager_id) ON DELETE SET NULL,
    notes TEXT,
    previous_status_id INTEGER REFERENCES kitchen_statuses(status_id) ON UPDATE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
    log_id SERIAL PRIMARY KEY,
    log_level VARCHAR(20) CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')),
    module VARCHAR(100),
    message TEXT,
    user_id INTEGER,
    user_type VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INSERT SAMPLE DATA
-- =============================================

-- Insert Menu Categories
INSERT INTO menu_categories (name, description, display_order, is_active) VALUES
('Desi', 'Traditional Pakistani cuisine', 1, true),
('Fast Food', 'Quick and convenient meals', 2, true),
('Continental', 'International cuisine', 3, true),
('Beverages', 'Drinks and refreshments', 4, true),
('Desserts', 'Sweet treats and desserts', 5, true)
ON CONFLICT (name) DO NOTHING;

-- Insert Order Statuses
INSERT INTO order_statuses (code, name, description, display_order) VALUES
('pending_approval', 'Pending Approval', 'Order awaiting manager approval', 1),
('approved', 'Approved', 'Order approved by manager', 2),
('in_progress', 'In Progress', 'Order being prepared', 3),
('ready', 'Ready', 'Order ready for pickup', 4),
('completed', 'Completed', 'Order completed and served', 5),
('cancelled', 'Cancelled', 'Order cancelled', 6)
ON CONFLICT (code) DO NOTHING;

-- Insert Kitchen Statuses
INSERT INTO kitchen_statuses (code, name, description, display_order) VALUES
('pending', 'Pending', 'Order received, not started', 1),
('preparing', 'Preparing', 'Currently being prepared', 2),
('ready', 'Ready', 'Ready for pickup', 3),
('completed', 'Completed', 'Order completed', 4),
('cancelled', 'Cancelled', 'Order cancelled', 5)
ON CONFLICT (code) DO NOTHING;

-- Insert Payment Statuses
INSERT INTO payment_statuses (code, name, description, display_order) VALUES
('pending', 'Pending', 'Payment pending', 1),
('paid', 'Paid', 'Payment received', 2),
('failed', 'Failed', 'Payment failed', 3),
('refunded', 'Refunded', 'Payment refunded', 4)
ON CONFLICT (code) DO NOTHING;

-- Insert Payment Methods
INSERT INTO payment_methods (code, name, description, requires_gateway) VALUES
('cash', 'Cash', 'Cash payment at counter', false),
('card', 'Card Payment', 'Credit/Debit card', true),
('online', 'Online Payment', 'Online payment gateway', true),
('wallet', 'Digital Wallet', 'Mobile wallet payment', true)
ON CONFLICT (code) DO NOTHING;

-- Insert Restaurant Tables
INSERT INTO restaurant_tables (table_number, table_type, capacity, location_zone, is_available, is_active) VALUES
('1', 'standard', 2, 'Main Hall', true, true),
('2', 'standard', 2, 'Main Hall', true, true),
('3', 'standard', 4, 'Main Hall', true, true),
('4', 'standard', 4, 'Main Hall', true, true),
('5', 'standard', 4, 'Main Hall', true, true),
('6', 'booth', 4, 'Side', true, true),
('7', 'booth', 4, 'Side', true, true),
('8', 'booth', 6, 'VIP', true, true),
('9', 'outdoor', 4, 'Patio', true, true),
('10', 'outdoor', 4, 'Patio', true, true),
('11', 'standard', 2, 'Bar', true, true),
('12', 'standard', 2, 'Bar', true, true)
ON CONFLICT (table_number) DO NOTHING;

-- Insert Customers
INSERT INTO customers (session_id, name, phone_number, email) VALUES
('CUST-001', 'Ahmed Hassan', '03001234567', 'ahmed@example.com'),
('CUST-002', 'Fatima Khan', '03021234567', 'fatima@example.com'),
('CUST-003', 'Ali Raza', '03031234567', 'ali@example.com'),
('CUST-004', 'Zainab Ali', '03041234567', 'zainab@example.com'),
('CUST-005', 'Muhammad Hasan', '03051234567', 'hasan@example.com')
ON CONFLICT (session_id) DO NOTHING;

-- Insert Menu Items
INSERT INTO menu_items (category_id, item_code, name, description, price, cost_price, image_url, is_available, is_featured, preparation_time_min, dietary_tags, display_order) VALUES
-- Desi Category
(1, 'BIRYANI', 'Chicken Biryani', 'Aromatic basmati rice cooked with tender chicken pieces, herbs, and spices', 12.99, 6.50, '/images/biryani.jpg', true, true, 20, 'gluten-free', 1),
(1, 'KARAHI', 'Chicken Karahi', 'Traditional Pakistani curry cooked in wok with tomatoes and ginger', 13.99, 7.00, '/images/karahi.jpg', true, false, 18, NULL, 2),
(1, 'TIKKA', 'Chicken Tikka', 'Marinated chicken pieces grilled in clay oven with spices', 11.99, 5.50, '/images/tikka.jpg', false, false, 22, 'gluten-free', 3),
(1, 'NIHARI', 'Beef Nihari', 'Slow-cooked beef shank in rich, spicy gravy', 15.99, 8.00, '/images/nihari.jpg', true, true, 45, NULL, 4),
(1, 'CHANA', 'Chana Masala', 'Chickpeas cooked in flavorful tomato gravy', 8.99, 3.50, '/images/chana.jpg', true, false, 15, 'vegetarian', 5),

-- Fast Food Category
(2, 'BURGER', 'Beef Burger', 'Juicy beef patty with cheese, lettuce, tomato, and special sauce', 9.99, 4.50, '/images/burger.jpg', true, false, 10, NULL, 1),
(2, 'FRIES', 'French Fries', 'Crispy golden fries served with ketchup', 4.99, 1.50, '/images/fries.jpg', true, false, 8, 'vegetarian', 2),
(2, 'PIZZA', 'Pizza Margherita', 'Classic pizza with tomato sauce, mozzarella, and fresh basil', 16.99, 7.00, '/images/pizza.jpg', true, true, 15, 'vegetarian', 3),
(2, 'WINGS', 'Chicken Wings', 'Crispy chicken wings with choice of sauce', 10.99, 5.00, '/images/wings.jpg', true, false, 12, NULL, 4),
(2, 'SANDWICH', 'Club Sandwich', 'Triple-decker sandwich with chicken, bacon, and veggies', 8.99, 4.00, '/images/sandwich.jpg', true, false, 10, NULL, 5),

-- Continental Category
(3, 'PASTA', 'Pasta Carbonara', 'Creamy pasta with eggs, cheese, pancetta, and black pepper', 14.99, 6.00, '/images/pasta.jpg', true, false, 12, NULL, 1),
(3, 'SALMON', 'Grilled Salmon', 'Atlantic salmon with lemon butter sauce and seasonal vegetables', 22.99, 12.00, '/images/salmon.jpg', true, true, 18, 'gluten-free', 2),
(3, 'STEAK', 'Beef Steak', 'Grilled ribeye steak with mashed potatoes', 24.99, 13.00, '/images/steak.jpg', true, true, 20, 'gluten-free', 3),
(3, 'SALAD', 'Caesar Salad', 'Fresh romaine lettuce with croutons, parmesan, and Caesar dressing', 9.99, 3.00, '/images/salad.jpg', true, false, 5, 'vegetarian', 4),
(3, 'RISOTTO', 'Mushroom Risotto', 'Creamy arborio rice with mushrooms and parmesan', 13.99, 5.50, '/images/risotto.jpg', true, false, 15, 'vegetarian', 5),

-- Beverages
(4, 'COLA', 'Coca-Cola', 'Classic cola drink', 2.99, 0.50, '/images/cola.jpg', true, false, 2, NULL, 1),
(4, 'LIME', 'Fresh Lime Soda', 'Refreshing lime soda with mint', 3.99, 1.00, '/images/lime.jpg', true, false, 3, 'vegetarian', 2),
(4, 'LASSI', 'Mango Lassi', 'Sweet yogurt-based mango drink', 4.99, 1.50, '/images/lassi.jpg', true, false, 5, 'vegetarian', 3),
(4, 'WATER', 'Mineral Water', '500ml bottled water', 1.99, 0.30, '/images/water.jpg', true, false, 1, NULL, 4),

-- Desserts
(5, 'BROWNIE', 'Chocolate Brownie', 'Warm chocolate brownie with vanilla ice cream', 6.99, 2.50, '/images/brownie.jpg', true, true, 10, 'vegetarian', 1),
(5, 'CHEESE', 'Cheesecake', 'New York style cheesecake with berry compote', 7.99, 3.00, '/images/cheesecake.jpg', true, false, 5, 'vegetarian', 2),
(5, 'GULAB', 'Gulab Jamun', 'Sweet milk dumplings in sugar syrup', 5.99, 2.00, '/images/gulabjamun.jpg', true, false, 8, 'vegetarian', 3)
ON CONFLICT (item_code) DO NOTHING;

-- Insert Managers (NOTE: In production, use properly hashed passwords!)
INSERT INTO managers (username, password_hash, email, full_name, role, phone_number) VALUES
('admin', 'admin123', 'admin@restaurant.com', 'Administrator', 'admin', '03001111111'),
('manager1', 'manager123', 'manager1@restaurant.com', 'Manager One', 'manager', '03002222222')
ON CONFLICT (username) DO NOTHING;

-- Insert Sample Orders
INSERT INTO orders (order_number, customer_id, table_id, order_status_id, kitchen_status_id, payment_status_id, payment_method_id, special_instructions, estimated_prep_time, approved_at, expected_completion, completed_at, created_at) VALUES
('ORD-001', 1, 5, 5, 4, 2, 1, 'Extra spicy biryani', 25, '2024-01-15 12:30:00', '2024-01-15 12:55:00', '2024-01-15 12:55:00', '2024-01-15 12:25:00'),
('ORD-002', 2, 12, 4, 3, 2, 2, 'No onions in burger', 15, '2024-01-15 13:15:00', '2024-01-15 13:40:00', NULL, '2024-01-15 13:10:00'),
('ORD-003', 3, NULL, 3, 2, 2, 3, 'Pack separately', 20, '2024-01-15 14:00:00', '2024-01-15 14:25:00', NULL, '2024-01-15 13:55:00'),
('ORD-004', 4, 8, 1, 1, 1, 1, 'Extra ketchup', 15, NULL, NULL, NULL, CURRENT_TIMESTAMP),
('ORD-005', 5, 3, 2, 2, 2, 2, 'Well done steak', 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '25 minutes', NULL, CURRENT_TIMESTAMP - INTERVAL '5 minutes')
ON CONFLICT (order_number) DO NOTHING;

-- Insert Order Items
INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, item_description, quantity, special_instructions, item_status, completed_at) VALUES
-- Order 1 items
(1, 1, 'Chicken Biryani', 12.99, 'Aromatic basmati rice cooked with tender chicken pieces, herbs, and spices', 2, 'Extra spicy', 'completed', '2024-01-15 12:50:00'),
(1, 17, 'Coca-Cola', 2.99, 'Classic cola drink', 1, NULL, 'completed', '2024-01-15 12:50:00'),
(1, 19, 'Mineral Water', 1.99, '500ml bottled water', 1, NULL, 'completed', '2024-01-15 12:50:00'),

-- Order 2 items
(2, 6, 'Beef Burger', 9.99, 'Juicy beef patty with cheese, lettuce, tomato, and special sauce', 1, 'No onions', 'ready', NULL),
(2, 7, 'French Fries', 4.99, 'Crispy golden fries served with ketchup', 1, 'Extra crispy', 'ready', NULL),
(2, 18, 'Fresh Lime Soda', 3.99, 'Refreshing lime soda with mint', 2, NULL, 'ready', NULL),

-- Order 3 items
(3, 11, 'Pasta Carbonara', 14.99, 'Creamy pasta with eggs, cheese, pancetta, and black pepper', 2, NULL, 'preparing', NULL),

-- Order 4 items
(4, 6, 'Beef Burger', 9.99, 'Juicy beef patty with cheese, lettuce, tomato, and special sauce', 1, NULL, 'pending', NULL),
(4, 7, 'French Fries', 4.99, 'Crispy golden fries served with ketchup', 1, 'Extra ketchup', 'pending', NULL),
(4, 17, 'Coca-Cola', 2.99, 'Classic cola drink', 1, NULL, 'pending', NULL),

-- Order 5 items
(5, 12, 'Grilled Salmon', 22.99, 'Atlantic salmon with lemon butter sauce and seasonal vegetables', 1, 'Lemon on side', 'preparing', NULL),
(5, 13, 'Beef Steak', 24.99, 'Grilled ribeye steak with mashed potatoes', 1, 'Well done', 'preparing', NULL),
(5, 18, 'Mango Lassi', 4.99, 'Sweet yogurt-based mango drink', 1, NULL, 'preparing', NULL)
ON CONFLICT DO NOTHING;

-- Insert Sample Feedback
INSERT INTO feedback (order_id, customer_id, food_quality, service_speed, overall_experience, order_accuracy, value_for_money, comment, submitted_at) VALUES
(1, 1, 5, 4, 5, 5, 4, 'Excellent biryani! Will come again.', '2024-01-15 13:30:00'),
(2, 2, 4, 5, 4, 5, 4, 'Burger was perfect, fries could be crispier', '2024-01-15 14:00:00'),
(3, 3, 3, 3, 3, 4, 3, 'Pasta was okay, service was slow', '2024-01-15 15:00:00')
ON CONFLICT (order_id) DO NOTHING;

-- Insert Kitchen Logs
INSERT INTO kitchen_logs (order_id, status_id, updated_by, notes, previous_status_id, created_at) VALUES
(1, 1, 1, 'Order received from table 5', NULL, '2024-01-15 12:31:00'),
(1, 2, 1, 'Started cooking biryani', 1, '2024-01-15 12:35:00'),
(1, 3, 1, 'Order ready for pickup', 2, '2024-01-15 12:50:00'),
(2, 1, 1, 'Order from table 12', NULL, '2024-01-15 13:16:00'),
(2, 2, 1, 'Burger and fries in progress', 1, '2024-01-15 13:20:00'),
(3, 1, 1, 'Takeaway order', NULL, '2024-01-15 14:01:00'),
(3, 2, 1, 'Preparing pasta', 1, '2024-01-15 14:05:00'),
(5, 1, 2, 'Table 3 order', NULL, CURRENT_TIMESTAMP - INTERVAL '4 minutes'),
(5, 2, 2, 'Steak and salmon in progress', 1, CURRENT_TIMESTAMP - INTERVAL '2 minutes')
ON CONFLICT DO NOTHING;

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_status_id ON orders(order_status_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status_id ON orders(payment_status_id);
CREATE INDEX IF NOT EXISTS idx_orders_kitchen_status_id ON orders(kitchen_status_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(order_status_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_kitchen_created ON orders(kitchen_status_id, created_at);

-- Menu items indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_featured ON menu_items(is_featured) WHERE is_featured = true;

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(item_status);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_order_id ON feedback(order_id);
CREATE INDEX IF NOT EXISTS idx_feedback_customer_id ON feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submitted_at ON feedback(submitted_at);

-- Kitchen logs indexes
CREATE INDEX IF NOT EXISTS idx_kitchen_logs_order_id ON kitchen_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_logs_created_at ON kitchen_logs(created_at);

-- Payment transactions indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_available ON restaurant_tables(is_available);
CREATE INDEX IF NOT EXISTS idx_managers_username ON managers(username);
CREATE INDEX IF NOT EXISTS idx_customers_session_id ON customers(session_id);

COMMIT;

-- =============================================
-- VERIFY DATA (outside transaction)
-- =============================================

SELECT 'Database initialization complete!' as status;
SELECT COUNT(*) as menu_items FROM menu_items;
SELECT COUNT(*) as orders FROM orders;
SELECT COUNT(*) as order_items FROM order_items;
SELECT COUNT(*) as feedback FROM feedback;
SELECT COUNT(*) as managers FROM managers;
