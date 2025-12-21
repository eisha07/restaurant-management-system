-- =============================================
-- COMPLETE NORMALIZED DATABASE SCHEMA (3NF)
-- Restaurant Management System
-- =============================================

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS kitchen_logs CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS managers CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS restaurant_tables CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS payment_statuses CASCADE;
DROP TABLE IF EXISTS kitchen_statuses CASCADE;
DROP TABLE IF EXISTS order_statuses CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS restaurant_settings CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- =============================================
-- 1. REFERENCE TABLES (Lookup/Master Data)
-- =============================================

CREATE TABLE menu_categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_categories_active ON menu_categories(is_active);

-- ----

CREATE TABLE order_statuses (
    status_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_statuses_code ON order_statuses(code);

-- ----

CREATE TABLE kitchen_statuses (
    status_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kitchen_statuses_code ON kitchen_statuses(code);

-- ----

CREATE TABLE payment_statuses (
    status_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_statuses_code ON payment_statuses(code);

-- ----

CREATE TABLE payment_methods (
    method_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    requires_gateway BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_methods_code ON payment_methods(code);

-- =============================================
-- 2. CORE ENTITY TABLES
-- =============================================

CREATE TABLE restaurant_tables (
    table_id SERIAL PRIMARY KEY,
    table_number VARCHAR(20) UNIQUE NOT NULL,
    table_type VARCHAR(50) DEFAULT 'standard',
    capacity INTEGER NOT NULL,
    location_zone VARCHAR(100),
    location_description TEXT,
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_restaurant_tables_active ON restaurant_tables(is_active);
CREATE INDEX idx_restaurant_tables_available ON restaurant_tables(is_available);

-- ----

CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE,
    name VARCHAR(200),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_session_id ON customers(session_id);
CREATE INDEX idx_customers_active ON customers(is_active);

-- ----

CREATE TABLE menu_items (
    item_id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES menu_categories(category_id) ON DELETE SET NULL,
    item_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    cost_price DECIMAL(10, 2),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    preparation_time_min INTEGER DEFAULT 15,
    spicy_level INTEGER CHECK (spicy_level BETWEEN 0 AND 5),
    calories INTEGER,
    dietary_tags VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_featured ON menu_items(is_featured);

-- ----

CREATE TABLE managers (
    manager_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(200),
    role VARCHAR(50) DEFAULT 'manager',
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_managers_username ON managers(username);
CREATE INDEX idx_managers_active ON managers(is_active);

-- =============================================
-- 3. TRANSACTION TABLES
-- =============================================

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(customer_id) ON DELETE SET NULL,
    table_id INTEGER REFERENCES restaurant_tables(table_id) ON DELETE SET NULL,
    order_status_id INTEGER REFERENCES order_statuses(status_id),
    kitchen_status_id INTEGER REFERENCES kitchen_statuses(status_id),
    payment_status_id INTEGER REFERENCES payment_statuses(status_id),
    payment_method_id INTEGER REFERENCES payment_methods(method_id) ON DELETE SET NULL,
    special_instructions TEXT,
    estimated_prep_time INTEGER,
    approved_at TIMESTAMP,
    expected_completion TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_by VARCHAR(100) DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_order_status ON orders(order_status_id);
CREATE INDEX idx_orders_kitchen_status ON orders(kitchen_status_id);
CREATE INDEX idx_orders_payment_status ON orders(payment_status_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ----

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(item_id) ON DELETE RESTRICT,
    item_name VARCHAR(255) NOT NULL,
    item_price DECIMAL(10, 2) NOT NULL,
    item_description TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    special_instructions TEXT,
    item_status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);
CREATE INDEX idx_order_items_status ON order_items(item_status);

-- ----

CREATE TABLE payment_transactions (
    transaction_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    payment_method_id INTEGER REFERENCES payment_methods(method_id),
    transaction_reference VARCHAR(100) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PKR',
    status VARCHAR(50) DEFAULT 'pending',
    gateway_name VARCHAR(100),
    gateway_response JSONB,
    gateway_transaction_id VARCHAR(100),
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    refunded_at TIMESTAMP,
    refund_amount DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_reference ON payment_transactions(transaction_reference);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);

-- ----

CREATE TABLE feedback (
    feedback_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    customer_id INTEGER REFERENCES customers(customer_id) ON DELETE SET NULL,
    food_quality INTEGER CHECK (food_quality BETWEEN 1 AND 5),
    service_speed INTEGER CHECK (service_speed BETWEEN 1 AND 5),
    overall_experience INTEGER CHECK (overall_experience BETWEEN 1 AND 5),
    order_accuracy INTEGER CHECK (order_accuracy BETWEEN 1 AND 5),
    value_for_money INTEGER CHECK (value_for_money BETWEEN 1 AND 5),
    comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_order_id ON feedback(order_id);
CREATE INDEX idx_feedback_customer_id ON feedback(customer_id);
CREATE INDEX idx_feedback_submitted_at ON feedback(submitted_at DESC);

-- =============================================
-- 4. AUDIT & LOGGING TABLES
-- =============================================

CREATE TABLE kitchen_logs (
    log_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    status_id INTEGER REFERENCES kitchen_statuses(status_id),
    updated_by INTEGER REFERENCES managers(manager_id) ON DELETE SET NULL,
    notes TEXT,
    previous_status_id INTEGER REFERENCES kitchen_statuses(status_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kitchen_logs_order_id ON kitchen_logs(order_id);
CREATE INDEX idx_kitchen_logs_created_at ON kitchen_logs(created_at DESC);

-- ----

CREATE TABLE system_logs (
    log_id SERIAL PRIMARY KEY,
    log_level VARCHAR(20),
    module VARCHAR(100),
    message TEXT,
    user_id INTEGER,
    user_type VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_module ON system_logs(module);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);

-- =============================================
-- 5. SUPPORTING TABLES
-- =============================================

CREATE TABLE restaurant_settings (
    setting_id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_restaurant_settings_key ON restaurant_settings(setting_key);

-- ----

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    user_type VARCHAR(50),
    notification_type VARCHAR(50),
    title VARCHAR(200),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    action_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =============================================
-- CREATE VIEWS FOR COMMON QUERIES
-- =============================================

-- View: Order Summary with All Related Info
CREATE VIEW vw_order_summary AS
SELECT 
    o.order_id,
    o.order_number,
    c.name as customer_name,
    c.phone_number,
    rt.table_number,
    os.name as order_status,
    ks.name as kitchen_status,
    ps.name as payment_status,
    pm.name as payment_method,
    o.special_instructions,
    o.created_at,
    o.completed_at,
    COUNT(oi.order_item_id) as item_count,
    SUM(oi.item_price * oi.quantity) as total_amount
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
LEFT JOIN payment_statuses ps ON o.payment_status_id = ps.status_id
LEFT JOIN payment_methods pm ON o.payment_method_id = pm.method_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY o.order_id, c.customer_id, rt.table_id, os.status_id, ks.status_id, ps.status_id, pm.method_id;

-- View: Menu Items with Category Info
CREATE VIEW vw_menu_with_category AS
SELECT 
    mi.item_id,
    mi.item_code,
    mi.name as item_name,
    mi.description,
    mi.price,
    mi.image_url,
    mi.is_available,
    mi.is_featured,
    mi.preparation_time_min,
    mi.spicy_level,
    mi.calories,
    mc.name as category_name,
    mc.category_id
FROM menu_items mi
LEFT JOIN menu_categories mc ON mi.category_id = mc.category_id;

-- View: Available Tables
CREATE VIEW vw_available_tables AS
SELECT *
FROM restaurant_tables
WHERE is_active = true AND is_available = true;

-- =============================================
-- END OF SCHEMA
-- =============================================
