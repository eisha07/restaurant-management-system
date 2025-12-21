-- =============================================
-- SEED DATA - Restaurant Management System
-- =============================================

-- =============================================
-- 1. POPULATE REFERENCE TABLES
-- =============================================

-- Menu Categories
INSERT INTO menu_categories (name, description, display_order, is_active) VALUES
('Appetizers', 'Starters and small bites', 1, true),
('Main Courses', 'Entrees and main dishes', 2, true),
('Desserts', 'Sweet treats and desserts', 3, true),
('Beverages', 'Drinks and beverages', 4, true),
('Salads', 'Fresh salads and sides', 5, true),
('Soups', 'Warm soups and broths', 6, true);

-- Order Statuses
INSERT INTO order_statuses (code, name, description, display_order, is_active) VALUES
('pending', 'Pending', 'Order received, awaiting approval', 1, true),
('approved', 'Approved', 'Order approved by kitchen', 2, true),
('preparing', 'Preparing', 'Kitchen is preparing the order', 3, true),
('ready', 'Ready', 'Order is ready for delivery', 4, true),
('completed', 'Completed', 'Order has been completed and served', 5, true),
('cancelled', 'Cancelled', 'Order has been cancelled', 6, true),
('on_hold', 'On Hold', 'Order is on hold', 7, true);

-- Kitchen Statuses
INSERT INTO kitchen_statuses (code, name, description, display_order, is_active) VALUES
('not_started', 'Not Started', 'Order not yet started in kitchen', 1, true),
('in_progress', 'In Progress', 'Order is being prepared', 2, true),
('ready', 'Ready', 'Order is ready for serving', 3, true),
('delivered', 'Delivered', 'Order has been delivered to table', 4, true),
('delayed', 'Delayed', 'Order preparation is delayed', 5, true),
('issue', 'Issue', 'There is an issue with the order', 6, true);

-- Payment Statuses
INSERT INTO payment_statuses (code, name, description, display_order, is_active) VALUES
('pending', 'Pending', 'Payment awaiting', 1, true),
('processing', 'Processing', 'Payment is being processed', 2, true),
('completed', 'Completed', 'Payment has been completed', 3, true),
('failed', 'Failed', 'Payment has failed', 4, true),
('refunded', 'Refunded', 'Payment has been refunded', 5, true),
('partial', 'Partial', 'Partial payment received', 6, true);

-- Payment Methods
INSERT INTO payment_methods (code, name, description, requires_gateway, is_active) VALUES
('cash', 'Cash', 'Cash payment at the restaurant', false, true),
('card', 'Credit/Debit Card', 'Payment via credit or debit card', true, true),
('online', 'Online Payment', 'Online payment gateway', true, true),
('wallet', 'Digital Wallet', 'Digital wallet payment', true, true),
('cheque', 'Cheque', 'Cheque payment', false, true),
('bank_transfer', 'Bank Transfer', 'Bank transfer payment', false, true);

-- =============================================
-- 2. POPULATE ENTITY TABLES
-- =============================================

-- Restaurant Tables
INSERT INTO restaurant_tables (table_number, table_type, capacity, location_zone, location_description, is_available, is_active) VALUES
('T01', 'standard', 2, 'Main Hall', 'Near window', true, true),
('T02', 'standard', 2, 'Main Hall', 'Center', true, true),
('T03', 'standard', 4, 'Main Hall', 'Corner booth', true, true),
('T04', 'premium', 4, 'VIP Area', 'Private booth', true, true),
('T05', 'large', 6, 'Main Hall', 'Family table', true, true),
('T06', 'standard', 2, 'Patio', 'Outdoor seating', true, true),
('T07', 'large', 8, 'Event Room', 'Banquet table', false, true),
('T08', 'standard', 4, 'Main Hall', 'Bar adjacent', true, true),
('T09', 'premium', 2, 'VIP Area', 'Private table', true, true),
('T10', 'standard', 3, 'Patio', 'Outdoor high-top', true, true);

-- Managers
INSERT INTO managers (username, password_hash, email, full_name, role, phone_number, is_active) VALUES
('admin', '$2b$10$YjJ6Ujd4Z0g0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M', 'admin@restaurant.com', 'Admin User', 'admin', '03001234567', true),
('manager1', '$2b$10$YjJ6Ujd4Z0g0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M', 'manager1@restaurant.com', 'John Manager', 'manager', '03009876543', true),
('manager2', '$2b$10$YjJ6Ujd4Z0g0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M', 'manager2@restaurant.com', 'Sarah Manager', 'manager', '03005555555', true),
('kitchen_staff', '$2b$10$YjJ6Ujd4Z0g0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M3Z0M', 'kitchen@restaurant.com', 'Kitchen Staff', 'kitchen', '03004444444', true);

-- Menu Items - Appetizers
INSERT INTO menu_items (category_id, item_code, name, description, price, cost_price, is_available, is_featured, preparation_time_min, spicy_level, calories, dietary_tags) VALUES
(1, 'APP001', 'Spring Rolls', 'Crispy spring rolls with sweet and sour sauce', 350.00, 120.00, true, true, 10, 1, 180, 'vegetarian'),
(1, 'APP002', 'Chicken Wings', 'Spicy buffalo wings with ranch dip', 450.00, 150.00, true, false, 15, 3, 280, 'gluten-free'),
(1, 'APP003', 'Samosa', 'Golden fried samosa with tamarind chutney', 200.00, 60.00, true, true, 8, 2, 150, 'vegetarian'),
(1, 'APP004', 'Cheese Balls', 'Fried cheese-filled balls', 300.00, 100.00, true, false, 10, 1, 220, 'vegetarian');

-- Menu Items - Main Courses
INSERT INTO menu_items (category_id, item_code, name, description, price, cost_price, is_available, is_featured, preparation_time_min, spicy_level, calories, dietary_tags) VALUES
(2, 'MAIN001', 'Biryani (Chicken)', 'Fragrant basmati rice with tender chicken', 650.00, 200.00, true, true, 30, 2, 520, ''),
(2, 'MAIN002', 'Biryani (Mutton)', 'Premium biryani with tender mutton', 750.00, 250.00, true, false, 35, 2, 620, ''),
(2, 'MAIN003', 'Karahi Chicken', 'Spicy chicken curry cooked in karahi', 550.00, 180.00, true, true, 25, 4, 480, ''),
(2, 'MAIN004', 'Pasta Carbonara', 'Classic Italian pasta with creamy sauce', 450.00, 140.00, true, false, 20, 1, 380, 'vegetarian'),
(2, 'MAIN005', 'Grilled Fish', 'Fresh fish grilled with herbs and lemon', 800.00, 300.00, true, false, 30, 1, 420, 'gluten-free'),
(2, 'MAIN006', 'Butter Chicken', 'Tender chicken in rich tomato and butter sauce', 520.00, 170.00, true, true, 25, 2, 450, '');

-- Menu Items - Desserts
INSERT INTO menu_items (category_id, item_code, name, description, price, cost_price, is_available, is_featured, preparation_time_min, spicy_level, calories, dietary_tags) VALUES
(3, 'DES001', 'Chocolate Cake', 'Rich chocolate layer cake', 300.00, 80.00, true, true, 5, 0, 350, 'vegetarian'),
(3, 'DES002', 'Gulab Jamun', 'Traditional Indian sweet dumplings in syrup', 250.00, 70.00, true, false, 5, 0, 300, 'vegetarian'),
(3, 'DES003', 'Ice Cream', 'Assorted ice cream flavors', 200.00, 50.00, true, true, 2, 0, 220, 'vegetarian'),
(3, 'DES004', 'Cheesecake', 'Creamy New York style cheesecake', 350.00, 100.00, true, false, 5, 0, 380, 'vegetarian');

-- Menu Items - Beverages
INSERT INTO menu_items (category_id, item_code, name, description, price, cost_price, is_available, is_featured, preparation_time_min, spicy_level, calories, dietary_tags) VALUES
(4, 'BEV001', 'Coca Cola', 'Cold carbonated soft drink', 100.00, 20.00, true, false, 1, 0, 140, 'vegan'),
(4, 'BEV002', 'Fresh Lemonade', 'Freshly squeezed lemon juice', 150.00, 40.00, true, true, 3, 0, 80, 'vegan'),
(4, 'BEV003', 'Iced Tea', 'Cold brewed iced tea', 120.00, 25.00, true, false, 2, 0, 50, 'vegan'),
(4, 'BEV004', 'Lassi', 'Traditional yogurt drink', 180.00, 50.00, true, true, 2, 0, 120, 'vegetarian'),
(4, 'BEV005', 'Coffee', 'Hot espresso coffee', 200.00, 60.00, true, true, 5, 0, 30, 'vegan');

-- Menu Items - Salads
INSERT INTO menu_items (category_id, item_code, name, description, price, cost_price, is_available, is_featured, preparation_time_min, spicy_level, calories, dietary_tags) VALUES
(5, 'SAL001', 'Garden Salad', 'Fresh mixed vegetables with vinaigrette', 250.00, 70.00, true, false, 5, 0, 120, 'vegan'),
(5, 'SAL002', 'Caesar Salad', 'Romaine lettuce with caesar dressing', 300.00, 90.00, true, true, 5, 0, 200, 'vegetarian'),
(5, 'SAL003', 'Falafel Salad', 'Crispy falafel over mixed greens', 350.00, 100.00, true, false, 10, 1, 280, 'vegan');

-- Menu Items - Soups
INSERT INTO menu_items (category_id, item_code, name, description, price, cost_price, is_available, is_featured, preparation_time_min, spicy_level, calories, dietary_tags) VALUES
(6, 'SOU001', 'Tomato Soup', 'Creamy tomato soup with croutons', 200.00, 50.00, true, true, 10, 0, 150, 'vegetarian'),
(6, 'SOU002', 'Chicken Soup', 'Hearty chicken broth with vegetables', 250.00, 70.00, true, false, 15, 0, 180, ''),
(6, 'SOU003', 'Lentil Soup', 'Protein-rich lentil soup with spices', 220.00, 60.00, true, false, 12, 2, 160, 'vegan');

-- Customers (Sample)
INSERT INTO customers (session_id, name, phone_number, email, is_active) VALUES
('session_001', 'Ahmed Khan', '03001111111', 'ahmed@example.com', true),
('session_002', 'Fatima Ali', '03002222222', 'fatima@example.com', true),
('session_003', 'Hassan Raza', '03003333333', 'hassan@example.com', true),
('session_004', 'Zainab Malik', '03004444444', 'zainab@example.com', true),
('session_005', 'Muhammad Aziz', '03005555555', 'aziz@example.com', true);

-- =============================================
-- 3. POPULATE TRANSACTION TABLES (Sample Data)
-- =============================================

-- Sample Orders
INSERT INTO orders (
    order_number, customer_id, table_id, order_status_id, kitchen_status_id, 
    payment_status_id, payment_method_id, special_instructions, estimated_prep_time, 
    created_by, created_at
) VALUES
('ORD20250101001', 1, 1, 1, 1, 1, 1, 'No onions please', 30, 'customer', NOW()),
('ORD20250101002', 2, 2, 2, 2, 1, 2, 'Extra spice', 35, 'customer', NOW() - INTERVAL '30 minutes'),
('ORD20250101003', 3, 3, 3, 3, 2, 3, '', 25, 'customer', NOW() - INTERVAL '60 minutes'),
('ORD20250101004', 4, 4, 5, 4, 3, 1, 'Well done', 40, 'customer', NOW() - INTERVAL '120 minutes'),
('ORD20250101005', 5, 5, 5, 4, 3, 2, '', 45, 'customer', NOW() - INTERVAL '150 minutes');

-- Sample Order Items
INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, item_description, quantity, special_instructions, item_status) VALUES
(1, 1, 'Spring Rolls', 350.00, 'Crispy spring rolls with sweet and sour sauce', 2, 'No onions', 'pending'),
(1, 6, 'Butter Chicken', 520.00, 'Tender chicken in rich tomato and butter sauce', 1, 'No onions', 'pending'),
(2, 3, 'Biryani (Chicken)', 650.00, 'Fragrant basmati rice with tender chicken', 2, 'Extra spice', 'completed'),
(2, 12, 'Chocolate Cake', 300.00, 'Rich chocolate layer cake', 1, '', 'completed'),
(3, 4, 'Karahi Chicken', 550.00, 'Spicy chicken curry cooked in karahi', 1, '', 'completed'),
(3, 16, 'Lassi', 180.00, 'Traditional yogurt drink', 2, '', 'completed'),
(4, 7, 'Grilled Fish', 800.00, 'Fresh fish grilled with herbs and lemon', 1, 'Well done', 'completed'),
(4, 14, 'Caesar Salad', 300.00, 'Romaine lettuce with caesar dressing', 1, '', 'completed'),
(5, 2, 'Biryani (Mutton)', 750.00, 'Premium biryani with tender mutton', 2, '', 'completed'),
(5, 18, 'Tomato Soup', 200.00, 'Creamy tomato soup with croutons', 3, '', 'completed');

-- Sample Payment Transactions
INSERT INTO payment_transactions (order_id, payment_method_id, transaction_reference, amount, status, initiated_at, completed_at) VALUES
(2, 2, 'TXN20250101001', 1300.00, 'completed', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '25 minutes'),
(3, 3, 'TXN20250101002', 1030.00, 'completed', NOW() - INTERVAL '60 minutes', NOW() - INTERVAL '55 minutes'),
(4, 1, 'TXN20250101003', 1400.00, 'completed', NOW() - INTERVAL '120 minutes', NOW() - INTERVAL '115 minutes'),
(5, 2, 'TXN20250101004', 1900.00, 'completed', NOW() - INTERVAL '150 minutes', NOW() - INTERVAL '145 minutes');

-- Sample Feedback
INSERT INTO feedback (order_id, customer_id, food_quality, service_speed, overall_experience, order_accuracy, value_for_money, comment) VALUES
(2, 2, 5, 4, 5, 5, 4, 'Excellent food and service! Highly recommended.'),
(3, 3, 4, 4, 4, 4, 4, 'Very good. Would come back again.'),
(4, 4, 5, 5, 5, 5, 5, 'Outstanding! Best restaurant in town.'),
(5, 5, 4, 3, 4, 4, 4, 'Good food but a bit slow on service.');

-- Sample Kitchen Logs
INSERT INTO kitchen_logs (order_id, status_id, updated_by, notes, previous_status_id) VALUES
(1, 1, 1, 'Order created', NULL),
(2, 1, 1, 'Order created', NULL),
(2, 2, 2, 'Started preparation', 1),
(2, 3, 2, 'Ready for serving', 2),
(3, 1, 1, 'Order created', NULL),
(3, 2, 2, 'Started preparation', 1),
(3, 3, 2, 'Ready for serving', 2),
(3, 4, 2, 'Delivered to table', 3);

-- =============================================
-- 4. POPULATE SETTINGS AND CONFIGURATION
-- =============================================

-- Restaurant Settings
INSERT INTO restaurant_settings (setting_key, setting_value, setting_type, description) VALUES
('restaurant_name', 'Fine Dining Express', 'string', 'Official name of the restaurant'),
('restaurant_phone', '03001234567', 'string', 'Main contact phone number'),
('restaurant_email', 'info@finedining.com', 'string', 'Main email address'),
('cuisine_type', 'Multi-Cuisine', 'string', 'Type of cuisine served'),
('currency', 'PKR', 'string', 'Currency used for transactions'),
('timezone', 'Asia/Karachi', 'string', 'Restaurant timezone'),
('business_hours_open', '11:00 AM', 'string', 'Opening time'),
('business_hours_close', '11:00 PM', 'string', 'Closing time'),
('tax_percentage', '17', 'numeric', 'GST/Sales tax percentage'),
('min_order_value', '300', 'numeric', 'Minimum order value in PKR'),
('delivery_charge', '100', 'numeric', 'Standard delivery charge'),
('kitchen_prep_time_default', '30', 'numeric', 'Default kitchen preparation time in minutes'),
('payment_gateway', 'stripe', 'string', 'Primary payment gateway'),
('enable_loyalty_program', 'true', 'boolean', 'Enable loyalty rewards program'),
('enable_table_reservations', 'true', 'boolean', 'Enable table reservation system'),
('max_table_reservation_days', '30', 'numeric', 'Maximum days in advance for reservations');

-- =============================================
-- 5. SAMPLE NOTIFICATIONS
-- =============================================

INSERT INTO notifications (user_id, user_type, notification_type, title, message, is_read, action_url) VALUES
(1, 'manager', 'order_received', 'New Order Received', 'Order ORD20250101001 has been placed', true, '/orders/1'),
(2, 'kitchen_staff', 'order_ready', 'Order Ready', 'Order ORD20250101004 is ready for serving', true, '/kitchen/4'),
(1, 'manager', 'payment_completed', 'Payment Confirmed', 'Payment for order ORD20250101002 has been processed', true, '/orders/2'),
(3, 'manager', 'low_inventory', 'Low Stock Alert', 'Butter Chicken inventory is low', false, '/inventory'),
(4, 'kitchen_staff', 'order_cancelled', 'Order Cancelled', 'Order ORD20250101005 has been cancelled', false, '/kitchen/orders');

-- =============================================
-- PRINT SUMMARY
-- =============================================

SELECT '========== DATA POPULATION COMPLETE ==========' as status;
SELECT COUNT(*) as menu_categories FROM menu_categories;
SELECT COUNT(*) as menu_items FROM menu_items;
SELECT COUNT(*) as restaurants_tables FROM restaurant_tables;
SELECT COUNT(*) as managers FROM managers;
SELECT COUNT(*) as customers FROM customers;
SELECT COUNT(*) as orders FROM orders;
SELECT COUNT(*) as order_items FROM order_items;
SELECT COUNT(*) as feedback FROM feedback;
SELECT COUNT(*) as payment_transactions FROM payment_transactions;

