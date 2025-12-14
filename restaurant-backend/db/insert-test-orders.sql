-- Insert Test Orders for Kitchen Display
-- This script creates orders with different kitchen statuses for testing

-- Insert orders with different statuses
INSERT INTO orders (order_number, customer_id, table_number, subtotal, tax, total, payment_method, payment_status, status, kitchen_status, special_instructions, created_at) VALUES

-- RECEIVED - New orders waiting to be approved
('KDS-001', 'CUST-001', '5', 25.97, 2.08, 28.05, 'cash', 'pending', 'pending_approval', 'received', 'Extra spicy biryani', NOW() - INTERVAL '5 minutes'),
('KDS-002', 'CUST-002', '8', 18.97, 1.52, 20.49, 'card', 'paid', 'approved', 'received', 'No onions in burger', NOW() - INTERVAL '2 minutes'),

-- PREPARING - Orders currently being cooked
('KDS-003', 'CUST-003', '3', 38.96, 3.12, 42.08, 'card', 'paid', 'in_progress', 'preparing', 'Well done steak', NOW() - INTERVAL '10 minutes'),
('KDS-004', 'CUST-004', '12', 34.97, 2.80, 37.77, 'cash', 'paid', 'in_progress', 'preparing', 'Extra lemon on salmon', NOW() - INTERVAL '8 minutes'),

-- READY - Orders ready for pickup
('KDS-005', 'CUST-005', '7', 22.97, 1.84, 24.81, 'card', 'paid', 'ready', 'ready', 'No nuts', NOW() - INTERVAL '15 minutes'),
('KDS-006', 'CUST-006', 'TAKEAWAY', 29.98, 2.40, 32.38, 'online', 'paid', 'ready', 'ready', NULL, NOW() - INTERVAL '12 minutes')

ON CONFLICT (order_number) DO NOTHING;

-- Insert order items for the test orders
INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, special_instructions) VALUES

-- Order KDS-001 items
((SELECT id FROM orders WHERE order_number = 'KDS-001'), 1, 'Chicken Biryani', 12.99, 2, 'Extra spicy'),

-- Order KDS-002 items
((SELECT id FROM orders WHERE order_number = 'KDS-002'), 6, 'Beef Burger', 9.99, 1, 'No onions'),
((SELECT id FROM orders WHERE order_number = 'KDS-002'), 7, 'French Fries', 4.99, 1, NULL),
((SELECT id FROM orders WHERE order_number = 'KDS-002'), 17, 'Coca-Cola', 2.99, 1, NULL),

-- Order KDS-003 items
((SELECT id FROM orders WHERE order_number = 'KDS-003'), 12, 'Grilled Salmon', 22.99, 1, 'Extra lemon'),
((SELECT id FROM orders WHERE order_number = 'KDS-003'), 13, 'Beef Steak', 24.99, 1, 'Well done'),

-- Order KDS-004 items
((SELECT id FROM orders WHERE order_number = 'KDS-004'), 11, 'Pasta Carbonara', 14.99, 2, NULL),
((SELECT id FROM orders WHERE order_number = 'KDS-004'), 18, 'Fresh Lime Soda', 3.99, 1, NULL),

-- Order KDS-005 items
((SELECT id FROM orders WHERE order_number = 'KDS-005'), 6, 'Beef Burger', 9.99, 1, NULL),
((SELECT id FROM orders WHERE order_number = 'KDS-005'), 7, 'French Fries', 4.99, 1, NULL),
((SELECT id FROM orders WHERE order_number = 'KDS-005'), 14, 'Caesar Salad', 9.99, 1, NULL),

-- Order KDS-006 items
((SELECT id FROM orders WHERE order_number = 'KDS-006'), 3, 'Pizza Margherita', 16.99, 1, NULL),
((SELECT id FROM orders WHERE order_number = 'KDS-006'), 7, 'French Fries', 4.99, 1, NULL),
((SELECT id FROM orders WHERE order_number = 'KDS-006'), 17, 'Coca-Cola', 2.99, 1, NULL),
((SELECT id FROM orders WHERE order_number = 'KDS-006'), 19, 'Mango Lassi', 4.99, 1, NULL)

ON CONFLICT DO NOTHING;

-- Insert kitchen logs for tracking
INSERT INTO kitchen_logs (order_id, status, notes, created_at) VALUES

-- KDS-001 logs
((SELECT id FROM orders WHERE order_number = 'KDS-001'), 'received', 'Order received from table 5. Awaiting approval.', NOW() - INTERVAL '5 minutes'),

-- KDS-002 logs
((SELECT id FROM orders WHERE order_number = 'KDS-002'), 'received', 'Order received from table 8', NOW() - INTERVAL '2 minutes'),

-- KDS-003 logs
((SELECT id FROM orders WHERE order_number = 'KDS-003'), 'received', 'Order received from table 3', NOW() - INTERVAL '10 minutes'),
((SELECT id FROM orders WHERE order_number = 'KDS-003'), 'preparing', 'Steak and salmon started cooking', NOW() - INTERVAL '9 minutes'),

-- KDS-004 logs
((SELECT id FROM orders WHERE order_number = 'KDS-004'), 'received', 'Order received from table 12', NOW() - INTERVAL '8 minutes'),
((SELECT id FROM orders WHERE order_number = 'KDS-004'), 'preparing', 'Pasta carbonara in progress', NOW() - INTERVAL '7 minutes'),

-- KDS-005 logs
((SELECT id FROM orders WHERE order_number = 'KDS-005'), 'received', 'Order received from table 7', NOW() - INTERVAL '15 minutes'),
((SELECT id FROM orders WHERE order_number = 'KDS-005'), 'preparing', 'Burger and fries cooking', NOW() - INTERVAL '13 minutes'),
((SELECT id FROM orders WHERE order_number = 'KDS-005'), 'ready', 'Order ready for pickup', NOW() - INTERVAL '12 minutes'),

-- KDS-006 logs
((SELECT id FROM orders WHERE order_number = 'KDS-006'), 'received', 'Takeaway order received', NOW() - INTERVAL '15 minutes'),
((SELECT id FROM orders WHERE order_number = 'KDS-006'), 'preparing', 'Pizza and sides being prepared', NOW() - INTERVAL '14 minutes'),
((SELECT id FROM orders WHERE order_number = 'KDS-006'), 'ready', 'Takeaway ready for pickup', NOW() - INTERVAL '12 minutes')

ON CONFLICT DO NOTHING;

-- Verify data
SELECT 'Test orders inserted successfully!' as status;
SELECT COUNT(*) as total_orders FROM orders WHERE order_number LIKE 'KDS-%';
SELECT COUNT(*) as total_items FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'KDS-%');
SELECT COUNT(*) as total_logs FROM kitchen_logs WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'KDS-%');

-- Show the orders by status
SELECT kitchen_status, COUNT(*) as count FROM orders WHERE order_number LIKE 'KDS-%' GROUP BY kitchen_status ORDER BY kitchen_status;
