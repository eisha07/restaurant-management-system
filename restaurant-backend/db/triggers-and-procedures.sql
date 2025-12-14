-- =====================================================
-- RESTAURANT MANAGEMENT SYSTEM - TRIGGERS & PROCEDURES
-- =====================================================
-- This file adds advanced database features including:
-- 1. Triggers for automation and data consistency
-- 2. Stored Procedures for complex operations
-- 3. Additional constraints and validations
-- =====================================================

-- =====================================================
-- SECTION 1: ADDITIONAL CONSTRAINTS & VALIDATIONS
-- =====================================================

-- Add constraints if not already present
ALTER TABLE menu_items
ADD CONSTRAINT check_price_positive CHECK (price > 0),
ADD CONSTRAINT check_category_not_empty CHECK (category IS NOT NULL AND category != '');

ALTER TABLE orders
ADD CONSTRAINT check_total_positive CHECK (total > 0),
ADD CONSTRAINT check_tax_non_negative CHECK (tax >= 0),
ADD CONSTRAINT check_subtotal_positive CHECK (subtotal > 0);

ALTER TABLE order_items
ADD CONSTRAINT check_quantity_positive CHECK (quantity > 0),
ADD CONSTRAINT check_item_price_positive CHECK (price > 0);

-- =====================================================
-- SECTION 2: TRIGGERS
-- =====================================================

-- TRIGGER 1: Auto-update menu_items updated_at timestamp
CREATE OR REPLACE FUNCTION update_menu_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_menu_items_timestamp ON menu_items;
CREATE TRIGGER trigger_update_menu_items_timestamp
BEFORE UPDATE ON menu_items
FOR EACH ROW
EXECUTE FUNCTION update_menu_items_timestamp();

-- TRIGGER 2: Auto-update orders updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_orders_timestamp ON orders;
CREATE TRIGGER trigger_update_orders_timestamp
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_orders_timestamp();

-- TRIGGER 3: Auto-log kitchen status changes
CREATE OR REPLACE FUNCTION log_kitchen_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if kitchen_status actually changed
    IF OLD.kitchen_status IS DISTINCT FROM NEW.kitchen_status THEN
        INSERT INTO kitchen_logs (order_id, status, notes, created_at)
        VALUES (NEW.id, NEW.kitchen_status, 'Status changed from ' || OLD.kitchen_status || ' to ' || NEW.kitchen_status, CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_kitchen_status ON orders;
CREATE TRIGGER trigger_log_kitchen_status
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.kitchen_status IS DISTINCT FROM NEW.kitchen_status)
EXECUTE FUNCTION log_kitchen_status_change();

-- TRIGGER 4: Auto-log order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log to kitchen_logs when order status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO kitchen_logs (order_id, status, notes, created_at)
        VALUES (NEW.id, NEW.status, 'Order status: ' || NEW.status, CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_order_status ON orders;
CREATE TRIGGER trigger_log_order_status
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_order_status_change();

-- TRIGGER 5: Calculate average rating when feedback is inserted
CREATE OR REPLACE FUNCTION calculate_feedback_average()
RETURNS TRIGGER AS $$
BEGIN
    NEW.average_rating = (
        (COALESCE(NEW.food_quality, 0) + 
         COALESCE(NEW.service_speed, 0) + 
         COALESCE(NEW.overall_experience, 0) + 
         COALESCE(NEW.accuracy, 0) + 
         COALESCE(NEW.value_for_money, 0)) / 5.0
    )::DECIMAL(3, 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_feedback_average ON feedback;
CREATE TRIGGER trigger_calculate_feedback_average
BEFORE INSERT OR UPDATE ON feedback
FOR EACH ROW
EXECUTE FUNCTION calculate_feedback_average();

-- TRIGGER 6: Prevent duplicate order numbers
CREATE OR REPLACE FUNCTION validate_unique_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM orders WHERE order_number = NEW.order_number AND id != NEW.id) THEN
        RAISE EXCEPTION 'Order number % already exists', NEW.order_number;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_order_number ON orders;
CREATE TRIGGER trigger_validate_order_number
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_unique_order_number();

-- TRIGGER 7: Enforce valid payment status values
CREATE OR REPLACE FUNCTION validate_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status NOT IN ('pending', 'paid', 'failed', 'refunded') THEN
        RAISE EXCEPTION 'Invalid payment status: %', NEW.payment_status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_payment_status ON orders;
CREATE TRIGGER trigger_validate_payment_status
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_payment_status();

-- TRIGGER 8: Enforce valid order status values
CREATE OR REPLACE FUNCTION validate_order_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status NOT IN ('pending_approval', 'approved', 'in_progress', 'ready', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid order status: %', NEW.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_order_status ON orders;
CREATE TRIGGER trigger_validate_order_status
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_order_status();

-- TRIGGER 9: Auto-generate kitchen logs on new orders
CREATE OR REPLACE FUNCTION create_initial_kitchen_log()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.kitchen_status = 'pending' THEN
        INSERT INTO kitchen_logs (order_id, status, notes, created_at)
        VALUES (NEW.id, 'received', 'New order received. Table: ' || COALESCE(NEW.table_number, 'TAKEAWAY'), CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_initial_kitchen_log ON orders;
CREATE TRIGGER trigger_create_initial_kitchen_log
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION create_initial_kitchen_log();

-- =====================================================
-- SECTION 3: STORED PROCEDURES
-- =====================================================

-- PROCEDURE 1: Create new order with items (Transaction)
CREATE OR REPLACE FUNCTION create_order_with_items(
    p_order_number VARCHAR,
    p_customer_id VARCHAR,
    p_table_number VARCHAR,
    p_payment_method VARCHAR,
    p_items JSON,
    p_special_instructions TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    order_id INTEGER,
    message VARCHAR
) AS $$
DECLARE
    v_order_id INTEGER;
    v_subtotal DECIMAL(10, 2) := 0;
    v_tax DECIMAL(10, 2);
    v_total DECIMAL(10, 2);
    v_item JSON;
    v_menu_price DECIMAL(10, 2);
BEGIN
    BEGIN
        -- Start transaction
        INSERT INTO orders (
            order_number, customer_id, table_number, payment_method, 
            payment_status, status, kitchen_status, special_instructions
        ) VALUES (
            p_order_number, p_customer_id, p_table_number, p_payment_method,
            'pending', 'pending_approval', 'pending', p_special_instructions
        ) RETURNING id INTO v_order_id;

        -- Insert order items and calculate subtotal
        FOR v_item IN SELECT * FROM json_array_elements(p_items)
        LOOP
            -- Get menu item price
            SELECT price INTO v_menu_price 
            FROM menu_items 
            WHERE id = (v_item->>'menu_item_id')::INTEGER;

            IF v_menu_price IS NOT NULL THEN
                INSERT INTO order_items (
                    order_id, menu_item_id, name, price, quantity, special_instructions
                ) VALUES (
                    v_order_id,
                    (v_item->>'menu_item_id')::INTEGER,
                    v_item->>'name',
                    v_menu_price,
                    (v_item->>'quantity')::INTEGER,
                    v_item->>'special_instructions'
                );

                v_subtotal := v_subtotal + (v_menu_price * (v_item->>'quantity')::INTEGER);
            END IF;
        END LOOP;

        -- Calculate tax (assume 8% tax rate)
        v_tax := ROUND((v_subtotal * 0.08)::NUMERIC, 2)::DECIMAL;
        v_total := v_subtotal + v_tax;

        -- Update order with totals
        UPDATE orders SET 
            subtotal = v_subtotal,
            tax = v_tax,
            total = v_total
        WHERE id = v_order_id;

        RETURN QUERY SELECT 
            TRUE, 
            v_order_id, 
            'Order created successfully with ID: ' || v_order_id;

    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, 
            NULL::INTEGER, 
            'Error creating order: ' || SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE 2: Update order status with validation
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id INTEGER,
    p_new_status VARCHAR,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message VARCHAR,
    old_status VARCHAR,
    new_status VARCHAR
) AS $$
DECLARE
    v_old_status VARCHAR;
    v_valid_transitions BOOLEAN;
BEGIN
    BEGIN
        -- Get current status
        SELECT status INTO v_old_status FROM orders WHERE id = p_order_id;

        IF v_old_status IS NULL THEN
            RETURN QUERY SELECT FALSE, 'Order not found', NULL, NULL;
            RETURN;
        END IF;

        -- Validate status transition (simple rules)
        v_valid_transitions := CASE
            WHEN v_old_status = 'pending_approval' THEN p_new_status IN ('approved', 'cancelled')
            WHEN v_old_status = 'approved' THEN p_new_status IN ('in_progress', 'cancelled')
            WHEN v_old_status = 'in_progress' THEN p_new_status IN ('ready', 'approved')
            WHEN v_old_status = 'ready' THEN p_new_status IN ('completed', 'in_progress')
            ELSE FALSE
        END;

        IF NOT v_valid_transitions THEN
            RETURN QUERY SELECT 
                FALSE, 
                'Invalid status transition from ' || v_old_status || ' to ' || p_new_status,
                v_old_status,
                NULL;
            RETURN;
        END IF;

        -- Update status
        UPDATE orders SET status = p_new_status WHERE id = p_order_id;

        -- Log if notes provided
        IF p_notes IS NOT NULL THEN
            INSERT INTO kitchen_logs (order_id, status, notes, created_at)
            VALUES (p_order_id, p_new_status, p_notes, CURRENT_TIMESTAMP);
        END IF;

        RETURN QUERY SELECT 
            TRUE,
            'Order status updated successfully',
            v_old_status,
            p_new_status;

    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE,
            'Error updating status: ' || SQLERRM,
            v_old_status,
            NULL;
    END;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE 3: Get order details with items
CREATE OR REPLACE FUNCTION get_order_details(p_order_id INTEGER)
RETURNS TABLE(
    order_id INTEGER,
    order_number VARCHAR,
    customer_id VARCHAR,
    table_number VARCHAR,
    status VARCHAR,
    kitchen_status VARCHAR,
    total DECIMAL,
    item_count INTEGER,
    items_json JSON,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.order_number,
        o.customer_id,
        o.table_number,
        o.status,
        o.kitchen_status,
        o.total,
        COUNT(oi.id)::INTEGER,
        json_agg(
            json_build_object(
                'id', oi.id,
                'name', oi.name,
                'price', oi.price,
                'quantity', oi.quantity,
                'special_instructions', oi.special_instructions
            )
        ),
        o.created_at
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.id = p_order_id
    GROUP BY o.id, o.order_number, o.customer_id, o.table_number, 
             o.status, o.kitchen_status, o.total, o.created_at;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE 4: Get today's kitchen statistics
CREATE OR REPLACE FUNCTION get_kitchen_statistics()
RETURNS TABLE(
    total_orders INTEGER,
    completed_orders INTEGER,
    in_progress_orders INTEGER,
    pending_orders INTEGER,
    average_prep_time INTERVAL,
    most_popular_item VARCHAR,
    revenue DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(o.id)::INTEGER,
        COUNT(CASE WHEN o.status = 'completed' THEN 1 END)::INTEGER,
        COUNT(CASE WHEN o.status IN ('in_progress', 'approved') THEN 1 END)::INTEGER,
        COUNT(CASE WHEN o.status = 'pending_approval' THEN 1 END)::INTEGER,
        AVG(o.expected_completion - o.created_at) FILTER (WHERE o.status = 'completed'),
        (SELECT oi.name FROM order_items oi 
         WHERE oi.order_id IN (SELECT id FROM orders WHERE DATE(created_at) = CURRENT_DATE)
         GROUP BY oi.name 
         ORDER BY SUM(oi.quantity) DESC LIMIT 1),
        COALESCE(SUM(o.total) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE), 0)
    FROM orders o
    WHERE DATE(o.created_at) = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE 5: Batch complete orders by status
CREATE OR REPLACE FUNCTION complete_ready_orders()
RETURNS TABLE(
    completed_count INTEGER,
    message VARCHAR
) AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE orders 
    SET status = 'completed' 
    WHERE status = 'ready' AND expected_completion < CURRENT_TIMESTAMP
    RETURNING id INTO TEMP temp_completed_ids;

    SELECT COUNT(*) INTO v_count FROM TEMP temp_completed_ids;

    RETURN QUERY SELECT 
        v_count,
        'Completed ' || v_count || ' orders that exceeded expected time';

    DROP TABLE TEMP temp_completed_ids;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE 6: Get feedback summary for a date range
CREATE OR REPLACE FUNCTION get_feedback_summary(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    total_feedback_count INTEGER,
    average_rating DECIMAL,
    food_quality_avg DECIMAL,
    service_speed_avg DECIMAL,
    accuracy_avg DECIMAL,
    value_for_money_avg DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(f.id)::INTEGER,
        ROUND(AVG(f.average_rating)::NUMERIC, 2)::DECIMAL,
        ROUND(AVG(f.food_quality)::NUMERIC, 2)::DECIMAL,
        ROUND(AVG(f.service_speed)::NUMERIC, 2)::DECIMAL,
        ROUND(AVG(f.accuracy)::NUMERIC, 2)::DECIMAL,
        ROUND(AVG(f.value_for_money)::NUMERIC, 2)::DECIMAL
    FROM feedback f
    JOIN orders o ON f.order_id = o.id
    WHERE DATE(o.created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE 7: Archive old orders (for maintenance)
CREATE OR REPLACE FUNCTION archive_old_orders(p_days_old INTEGER)
RETURNS TABLE(
    archived_count INTEGER,
    message VARCHAR
) AS $$
DECLARE
    v_count INTEGER;
    v_cutoff_date TIMESTAMP;
BEGIN
    v_cutoff_date := CURRENT_TIMESTAMP - (p_days_old || ' days')::INTERVAL;
    
    -- In a real system, you'd archive to another table
    -- For now, we just count and report
    SELECT COUNT(*) INTO v_count 
    FROM orders 
    WHERE created_at < v_cutoff_date AND status = 'completed';

    RETURN QUERY SELECT 
        v_count,
        'Found ' || v_count || ' completed orders older than ' || p_days_old || ' days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 4: VIEWS FOR COMMON QUERIES
-- =====================================================

-- VIEW 1: Active Orders Dashboard
DROP VIEW IF EXISTS v_active_orders CASCADE;
CREATE VIEW v_active_orders AS
SELECT 
    o.id,
    o.order_number,
    o.table_number,
    o.status,
    o.kitchen_status,
    o.total,
    COUNT(oi.id) as item_count,
    AGE(CURRENT_TIMESTAMP, o.created_at) as elapsed_time,
    o.expected_completion,
    o.created_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.status IN ('pending_approval', 'approved', 'in_progress', 'ready')
GROUP BY o.id, o.order_number, o.table_number, o.status, o.kitchen_status, 
         o.total, o.expected_completion, o.created_at
ORDER BY o.created_at ASC;

-- VIEW 2: Revenue Report
DROP VIEW IF EXISTS v_revenue_report CASCADE;
CREATE VIEW v_revenue_report AS
SELECT 
    DATE(o.created_at) as order_date,
    COUNT(o.id) as order_count,
    SUM(o.subtotal) as total_revenue,
    SUM(o.tax) as total_tax,
    SUM(o.total) as grand_total,
    AVG(o.total) as average_order_value
FROM orders o
WHERE o.status IN ('completed', 'ready')
GROUP BY DATE(o.created_at)
ORDER BY order_date DESC;

-- VIEW 3: Menu Performance
DROP VIEW IF EXISTS v_menu_performance CASCADE;
CREATE VIEW v_menu_performance AS
SELECT 
    m.id,
    m.name,
    m.category,
    m.price,
    COUNT(oi.id) as times_ordered,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.price * oi.quantity) as revenue,
    m.is_available
FROM menu_items m
LEFT JOIN order_items oi ON m.id = oi.menu_item_id
GROUP BY m.id, m.name, m.category, m.price, m.is_available
ORDER BY times_ordered DESC;

-- =====================================================
-- SECTION 5: SECURITY & PERMISSIONS (OPTIONAL)
-- =====================================================

-- Create a role for the application (optional)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
--         CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';
--     END IF;
-- END $$;

-- Grant appropriate permissions
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- =====================================================
-- VERIFICATION & TESTING
-- =====================================================

SELECT '
╔════════════════════════════════════════════════╗
║   TRIGGERS & PROCEDURES INSTALLED SUCCESSFULLY ║
╚════════════════════════════════════════════════╝
' as status;

-- Verify triggers are installed
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Verify procedures are installed
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
