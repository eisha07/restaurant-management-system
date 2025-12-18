-- Insert Test Orders for Kitchen Display
-- This script creates orders with different kitchen statuses for testing
-- Wrapped in transaction for atomicity and uses correct schema (FK-based)

BEGIN;

-- First, ensure we have test customers (use existing or create)
INSERT INTO customers (session_id, name, phone_number, email) VALUES
('CUST-006', 'Test Customer 6', '03061234567', 'test6@example.com'),
('CUST-007', 'Test Customer 7', '03071234567', 'test7@example.com'),
('CUST-008', 'Test Customer 8', '03081234567', 'test8@example.com')
ON CONFLICT (session_id) DO NOTHING;

-- Insert orders with different statuses using FK references
-- Get status IDs via subqueries for proper FK references
INSERT INTO orders (
    order_number, 
    customer_id, 
    table_id, 
    order_status_id, 
    kitchen_status_id, 
    payment_status_id, 
    payment_method_id, 
    special_instructions, 
    estimated_prep_time,
    created_at
) VALUES
-- PENDING - New orders waiting to be approved
(
    'KDS-001', 
    (SELECT customer_id FROM customers WHERE session_id = 'CUST-001'),
    (SELECT table_id FROM restaurant_tables WHERE table_number = '5'),
    (SELECT status_id FROM order_statuses WHERE code = 'pending_approval'),
    (SELECT status_id FROM kitchen_statuses WHERE code = 'pending'),
    (SELECT status_id FROM payment_statuses WHERE code = 'pending'),
    (SELECT method_id FROM payment_methods WHERE code = 'cash'),
    'Extra spicy biryani',
    25,
    NOW() - INTERVAL '5 minutes'
),
(
    'KDS-002', 
    (SELECT customer_id FROM customers WHERE session_id = 'CUST-002'),
    (SELECT table_id FROM restaurant_tables WHERE table_number = '8'),
    (SELECT status_id FROM order_statuses WHERE code = 'approved'),
    (SELECT status_id FROM kitchen_statuses WHERE code = 'pending'),
    (SELECT status_id FROM payment_statuses WHERE code = 'paid'),
    (SELECT method_id FROM payment_methods WHERE code = 'card'),
    'No onions in burger',
    15,
    NOW() - INTERVAL '2 minutes'
),

-- PREPARING - Orders currently being cooked
(
    'KDS-003', 
    (SELECT customer_id FROM customers WHERE session_id = 'CUST-003'),
    (SELECT table_id FROM restaurant_tables WHERE table_number = '3'),
    (SELECT status_id FROM order_statuses WHERE code = 'in_progress'),
    (SELECT status_id FROM kitchen_statuses WHERE code = 'preparing'),
    (SELECT status_id FROM payment_statuses WHERE code = 'paid'),
    (SELECT method_id FROM payment_methods WHERE code = 'card'),
    'Well done steak',
    30,
    NOW() - INTERVAL '10 minutes'
),
(
    'KDS-004', 
    (SELECT customer_id FROM customers WHERE session_id = 'CUST-004'),
    (SELECT table_id FROM restaurant_tables WHERE table_number = '12'),
    (SELECT status_id FROM order_statuses WHERE code = 'in_progress'),
    (SELECT status_id FROM kitchen_statuses WHERE code = 'preparing'),
    (SELECT status_id FROM payment_statuses WHERE code = 'paid'),
    (SELECT method_id FROM payment_methods WHERE code = 'cash'),
    'Extra lemon on salmon',
    25,
    NOW() - INTERVAL '8 minutes'
),

-- READY - Orders ready for pickup
(
    'KDS-005', 
    (SELECT customer_id FROM customers WHERE session_id = 'CUST-005'),
    (SELECT table_id FROM restaurant_tables WHERE table_number = '7'),
    (SELECT status_id FROM order_statuses WHERE code = 'ready'),
    (SELECT status_id FROM kitchen_statuses WHERE code = 'ready'),
    (SELECT status_id FROM payment_statuses WHERE code = 'paid'),
    (SELECT method_id FROM payment_methods WHERE code = 'card'),
    'No nuts',
    20,
    NOW() - INTERVAL '15 minutes'
),
(
    'KDS-006', 
    (SELECT customer_id FROM customers WHERE session_id = 'CUST-006'),
    NULL, -- TAKEAWAY - no table
    (SELECT status_id FROM order_statuses WHERE code = 'ready'),
    (SELECT status_id FROM kitchen_statuses WHERE code = 'ready'),
    (SELECT status_id FROM payment_statuses WHERE code = 'paid'),
    (SELECT method_id FROM payment_methods WHERE code = 'online'),
    NULL,
    25,
    NOW() - INTERVAL '12 minutes'
)
ON CONFLICT (order_number) DO NOTHING;

-- Insert order items for the test orders (using correct column names)
INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, special_instructions, item_status) VALUES

-- Order KDS-001 items
((SELECT order_id FROM orders WHERE order_number = 'KDS-001'), 1, 'Chicken Biryani', 12.99, 2, 'Extra spicy', 'pending'),

-- Order KDS-002 items
((SELECT order_id FROM orders WHERE order_number = 'KDS-002'), 6, 'Beef Burger', 9.99, 1, 'No onions', 'pending'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-002'), 7, 'French Fries', 4.99, 1, NULL, 'pending'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-002'), 17, 'Coca-Cola', 2.99, 1, NULL, 'pending'),

-- Order KDS-003 items
((SELECT order_id FROM orders WHERE order_number = 'KDS-003'), 12, 'Grilled Salmon', 22.99, 1, 'Extra lemon', 'preparing'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-003'), 13, 'Beef Steak', 24.99, 1, 'Well done', 'preparing'),

-- Order KDS-004 items
((SELECT order_id FROM orders WHERE order_number = 'KDS-004'), 11, 'Pasta Carbonara', 14.99, 2, NULL, 'preparing'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-004'), 18, 'Fresh Lime Soda', 3.99, 1, NULL, 'preparing'),

-- Order KDS-005 items
((SELECT order_id FROM orders WHERE order_number = 'KDS-005'), 6, 'Beef Burger', 9.99, 1, NULL, 'ready'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-005'), 7, 'French Fries', 4.99, 1, NULL, 'ready'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-005'), 14, 'Caesar Salad', 9.99, 1, NULL, 'ready'),

-- Order KDS-006 items
((SELECT order_id FROM orders WHERE order_number = 'KDS-006'), 8, 'Pizza Margherita', 16.99, 1, NULL, 'ready'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-006'), 7, 'French Fries', 4.99, 1, NULL, 'ready'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-006'), 17, 'Coca-Cola', 2.99, 1, NULL, 'ready'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-006'), 19, 'Mango Lassi', 4.99, 1, NULL, 'ready')

ON CONFLICT DO NOTHING;

-- Insert kitchen logs for tracking (using correct FK column: status_id)
INSERT INTO kitchen_logs (order_id, status_id, notes, created_at) VALUES

-- KDS-001 logs
((SELECT order_id FROM orders WHERE order_number = 'KDS-001'), 
 (SELECT status_id FROM kitchen_statuses WHERE code = 'pending'), 
 'Order received from table 5. Awaiting approval.', 
 NOW() - INTERVAL '5 minutes'),

-- KDS-002 logs
((SELECT order_id FROM orders WHERE order_number = 'KDS-002'), 
 (SELECT status_id FROM kitchen_statuses WHERE code = 'pending'), 
 'Order received from table 8', 
 NOW() - INTERVAL '2 minutes'),

-- KDS-003 logs
((SELECT order_id FROM orders WHERE order_number = 'KDS-003'), 
 (SELECT status_id FROM kitchen_statuses WHERE code = 'pending'), 
 'Order received from table 3', 
 NOW() - INTERVAL '10 minutes'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-003'), 
 (SELECT status_id FROM kitchen_statuses WHERE code = 'preparing'), 
 'Steak and salmon started cooking', 
 NOW() - INTERVAL '9 minutes'),

-- KDS-004 logs
((SELECT order_id FROM orders WHERE order_number = 'KDS-004'), 
 (SELECT status_id FROM kitchen_statuses WHERE code = 'pending'), 
 'Order received from table 12', 
 NOW() - INTERVAL '8 minutes'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-004'), 
 (SELECT status_id FROM kitchen_statuses WHERE code = 'preparing'), 
 'Pasta carbonara in progress', 
 NOW() - INTERVAL '7 minutes'),

-- KDS-005 logs
((SELECT order_id FROM orders WHERE order_number = 'KDS-005'), 
 (SELECT status_id FROM kitchen_statuses WHERE code = 'pending'), 
 'Order received from table 7', 
 NOW() - INTERVAL '15 minutes'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-005'), 
 (SELECT status_id FROM kitchen_statuses WHERE code = 'preparing'), 
 'Burger and fries cooking', 
 NOW() - INTERVAL '13 minutes'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-005'), 
 (SELECT status_id FROM kitchen_statuses WHERE code = 'ready'), 
 'Order ready for pickup', 
 NOW() - INTERVAL '12 minutes'),

-- KDS-006 logs
((SELECT order_id FROM orders WHERE order_number = 'KDS-006'), 
 (SELECT status_id FROM kitchen_statuses WHERE code = 'pending'), 
 'Takeaway order received', 
 NOW() - INTERVAL '15 minutes'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-006'), 
 (SELECT status_id FROM kitchen_statuses WHERE code = 'preparing'), 
 'Pizza and sides being prepared', 
 NOW() - INTERVAL '14 minutes'),
((SELECT order_id FROM orders WHERE order_number = 'KDS-006'), 
 (SELECT status_id FROM kitchen_statuses WHERE code = 'ready'), 
 'Takeaway ready for pickup', 
 NOW() - INTERVAL '12 minutes')

ON CONFLICT DO NOTHING;

COMMIT;

-- Verify data (outside transaction)
SELECT 'Test orders inserted successfully!' as status;
SELECT COUNT(*) as total_orders FROM orders WHERE order_number LIKE 'KDS-%';
SELECT COUNT(*) as total_items FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE order_number LIKE 'KDS-%');
SELECT COUNT(*) as total_logs FROM kitchen_logs WHERE order_id IN (SELECT order_id FROM orders WHERE order_number LIKE 'KDS-%');

-- Show the orders by kitchen status
SELECT ks.code as kitchen_status, COUNT(*) as count 
FROM orders o
JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
WHERE o.order_number LIKE 'KDS-%' 
GROUP BY ks.code 
ORDER BY ks.code;
