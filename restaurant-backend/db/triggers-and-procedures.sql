-- =====================================================
-- RESTAURANT MANAGEMENT SYSTEM - TRIGGERS & PROCEDURES
-- =====================================================
-- This file adds advanced database features including:
-- 1. Triggers for automation and data consistency
-- 2. Stored Procedures for complex operations
-- 3. Additional constraints and validations
-- 
-- SCHEMA NOTES:
-- - orders uses: order_id, order_status_id, kitchen_status_id, payment_status_id (FKs)
-- - menu_items uses: item_id, category_id (FK)
-- - order_items uses: order_item_id, item_price
-- =====================================================

BEGIN;

-- =====================================================
-- SECTION 1: ADDITIONAL CONSTRAINTS & VALIDATIONS
-- =====================================================

-- Add constraints if not already present (using correct column names)
DO $$
BEGIN
    -- menu_items constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_price_positive') THEN
        ALTER TABLE menu_items ADD CONSTRAINT check_price_positive CHECK (price > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_category_id_not_null') THEN
        ALTER TABLE menu_items ADD CONSTRAINT check_category_id_not_null CHECK (category_id IS NOT NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_cost_less_than_price') THEN
        ALTER TABLE menu_items ADD CONSTRAINT check_cost_less_than_price CHECK (cost_price IS NULL OR cost_price <= price);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_prep_time_positive') THEN
        ALTER TABLE menu_items ADD CONSTRAINT check_prep_time_positive CHECK (preparation_time_min IS NULL OR preparation_time_min > 0);
    END IF;

    -- order_items constraints (using correct column: item_price)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_item_price_positive') THEN
        ALTER TABLE order_items ADD CONSTRAINT check_item_price_positive CHECK (item_price > 0);
    END IF;
    
    -- orders temporal constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_completed_after_created') THEN
        ALTER TABLE orders ADD CONSTRAINT check_completed_after_created CHECK (completed_at IS NULL OR completed_at >= created_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_approved_after_created') THEN
        ALTER TABLE orders ADD CONSTRAINT check_approved_after_created CHECK (approved_at IS NULL OR approved_at >= created_at);
    END IF;
    
    -- payment_transactions constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_refund_not_exceed') THEN
        ALTER TABLE payment_transactions ADD CONSTRAINT check_refund_not_exceed CHECK (refund_amount IS NULL OR refund_amount <= amount);
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some constraints may already exist: %', SQLERRM;
END $$;

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

-- TRIGGER 3: Auto-log kitchen status changes (using correct FK: kitchen_status_id)
CREATE OR REPLACE FUNCTION log_kitchen_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_old_status_code VARCHAR;
    v_new_status_code VARCHAR;
BEGIN
    -- Only log if kitchen_status_id actually changed
    IF OLD.kitchen_status_id IS DISTINCT FROM NEW.kitchen_status_id THEN
        -- Get status codes for logging
        SELECT code INTO v_old_status_code FROM kitchen_statuses WHERE status_id = OLD.kitchen_status_id;
        SELECT code INTO v_new_status_code FROM kitchen_statuses WHERE status_id = NEW.kitchen_status_id;
        
        INSERT INTO kitchen_logs (order_id, status_id, previous_status_id, notes, created_at)
        VALUES (NEW.order_id, NEW.kitchen_status_id, OLD.kitchen_status_id, 
                'Status changed from ' || COALESCE(v_old_status_code, 'none') || ' to ' || COALESCE(v_new_status_code, 'none'), 
                CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_kitchen_status ON orders;
CREATE TRIGGER trigger_log_kitchen_status
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.kitchen_status_id IS DISTINCT FROM NEW.kitchen_status_id)
EXECUTE FUNCTION log_kitchen_status_change();

-- TRIGGER 4: Auto-log order status changes (using correct FK: order_status_id)
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_new_status_code VARCHAR;
BEGIN
    -- Log to kitchen_logs when order status changes
    IF OLD.order_status_id IS DISTINCT FROM NEW.order_status_id THEN
        SELECT code INTO v_new_status_code FROM order_statuses WHERE status_id = NEW.order_status_id;
        
        INSERT INTO kitchen_logs (order_id, status_id, notes, created_at)
        VALUES (NEW.order_id, NEW.kitchen_status_id, 'Order status changed to: ' || COALESCE(v_new_status_code, 'unknown'), CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_order_status ON orders;
CREATE TRIGGER trigger_log_order_status
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.order_status_id IS DISTINCT FROM NEW.order_status_id)
EXECUTE FUNCTION log_order_status_change();

-- TRIGGER 5: Calculate average rating when feedback is inserted
-- Note: feedback table uses order_accuracy not accuracy
CREATE OR REPLACE FUNCTION calculate_feedback_average()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate average from the 5 rating fields
    -- Store in a computed manner (feedback table doesn't have average_rating column)
    -- This trigger validates the ratings are within bounds
    IF NEW.food_quality IS NOT NULL AND (NEW.food_quality < 1 OR NEW.food_quality > 5) THEN
        RAISE EXCEPTION 'food_quality must be between 1 and 5';
    END IF;
    IF NEW.service_speed IS NOT NULL AND (NEW.service_speed < 1 OR NEW.service_speed > 5) THEN
        RAISE EXCEPTION 'service_speed must be between 1 and 5';
    END IF;
    IF NEW.overall_experience IS NOT NULL AND (NEW.overall_experience < 1 OR NEW.overall_experience > 5) THEN
        RAISE EXCEPTION 'overall_experience must be between 1 and 5';
    END IF;
    IF NEW.order_accuracy IS NOT NULL AND (NEW.order_accuracy < 1 OR NEW.order_accuracy > 5) THEN
        RAISE EXCEPTION 'order_accuracy must be between 1 and 5';
    END IF;
    IF NEW.value_for_money IS NOT NULL AND (NEW.value_for_money < 1 OR NEW.value_for_money > 5) THEN
        RAISE EXCEPTION 'value_for_money must be between 1 and 5';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_feedback_ratings ON feedback;
CREATE TRIGGER trigger_validate_feedback_ratings
BEFORE INSERT OR UPDATE ON feedback
FOR EACH ROW
EXECUTE FUNCTION calculate_feedback_average();

-- TRIGGER 6: Prevent duplicate order numbers (using correct PK: order_id)
CREATE OR REPLACE FUNCTION validate_unique_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM orders WHERE order_number = NEW.order_number AND order_id != COALESCE(NEW.order_id, 0)) THEN
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

-- TRIGGER 7: Validate payment_status_id references valid status (FK-based validation)
CREATE OR REPLACE FUNCTION validate_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM payment_statuses WHERE status_id = NEW.payment_status_id AND is_active = true) THEN
            RAISE EXCEPTION 'Invalid payment status ID: %', NEW.payment_status_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_payment_status ON orders;
CREATE TRIGGER trigger_validate_payment_status
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_payment_status();

-- TRIGGER 8: Validate order_status_id references valid status (FK-based validation)
CREATE OR REPLACE FUNCTION validate_order_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_status_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM order_statuses WHERE status_id = NEW.order_status_id AND is_active = true) THEN
            RAISE EXCEPTION 'Invalid order status ID: %', NEW.order_status_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_order_status ON orders;
CREATE TRIGGER trigger_validate_order_status
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_order_status();

-- TRIGGER 9: Auto-generate kitchen logs on new orders (using correct columns)
CREATE OR REPLACE FUNCTION create_initial_kitchen_log()
RETURNS TRIGGER AS $$
DECLARE
    v_pending_status_id INTEGER;
    v_table_number VARCHAR;
BEGIN
    -- Get pending kitchen status ID
    SELECT status_id INTO v_pending_status_id FROM kitchen_statuses WHERE code = 'pending';
    
    IF NEW.kitchen_status_id = v_pending_status_id THEN
        -- Get table number if table_id is set
        IF NEW.table_id IS NOT NULL THEN
            SELECT table_number INTO v_table_number FROM restaurant_tables WHERE table_id = NEW.table_id;
        END IF;
        
        INSERT INTO kitchen_logs (order_id, status_id, notes, created_at)
        VALUES (NEW.order_id, v_pending_status_id, 
                'New order received. Table: ' || COALESCE(v_table_number, 'TAKEAWAY'), 
                CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_initial_kitchen_log ON orders;
CREATE TRIGGER trigger_create_initial_kitchen_log
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION create_initial_kitchen_log();

-- TRIGGER 10: Auto-update customers updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customers_timestamp ON customers;
CREATE TRIGGER trigger_update_customers_timestamp
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_customers_timestamp();

-- TRIGGER 11: Auto-update restaurant_tables updated_at timestamp
CREATE OR REPLACE FUNCTION update_tables_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tables_timestamp ON restaurant_tables;
CREATE TRIGGER trigger_update_tables_timestamp
BEFORE UPDATE ON restaurant_tables
FOR EACH ROW
EXECUTE FUNCTION update_tables_timestamp();

-- TRIGGER 12: Auto-update managers updated_at timestamp
CREATE OR REPLACE FUNCTION update_managers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_managers_timestamp ON managers;
CREATE TRIGGER trigger_update_managers_timestamp
BEFORE UPDATE ON managers
FOR EACH ROW
EXECUTE FUNCTION update_managers_timestamp();

-- =====================================================
-- SECTION 3: STORED PROCEDURES (Using correct schema)
-- =====================================================

-- PROCEDURE 1: Create new order with items (Transaction)
-- Note: This procedure uses the normalized schema with FK references
CREATE OR REPLACE FUNCTION create_order_with_items(
    p_order_number VARCHAR,
    p_customer_id INTEGER,
    p_table_id INTEGER,
    p_payment_method_id INTEGER,
    p_items JSON,
    p_special_instructions TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    new_order_id INTEGER,
    message VARCHAR
) AS $$
DECLARE
    v_order_id INTEGER;
    v_item JSON;
    v_menu_price DECIMAL(10, 2);
    v_menu_name VARCHAR;
    v_pending_order_status INTEGER;
    v_pending_payment_status INTEGER;
    v_pending_kitchen_status INTEGER;
BEGIN
    -- Get status IDs
    SELECT status_id INTO v_pending_order_status FROM order_statuses WHERE code = 'pending_approval';
    SELECT status_id INTO v_pending_payment_status FROM payment_statuses WHERE code = 'pending';
    SELECT status_id INTO v_pending_kitchen_status FROM kitchen_statuses WHERE code = 'pending';
    
    -- Create order
    INSERT INTO orders (
        order_number, customer_id, table_id, payment_method_id, 
        payment_status_id, order_status_id, kitchen_status_id, special_instructions
    ) VALUES (
        p_order_number, p_customer_id, p_table_id, p_payment_method_id,
        v_pending_payment_status, v_pending_order_status, v_pending_kitchen_status, p_special_instructions
    ) RETURNING order_id INTO v_order_id;

    -- Insert order items
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        -- Get menu item details
        SELECT price, name INTO v_menu_price, v_menu_name
        FROM menu_items 
        WHERE item_id = (v_item->>'menu_item_id')::INTEGER;

        IF v_menu_price IS NULL THEN
            RAISE EXCEPTION 'Menu item % not found', (v_item->>'menu_item_id');
        END IF;
        
        INSERT INTO order_items (
            order_id, menu_item_id, item_name, item_price, quantity, special_instructions
        ) VALUES (
            v_order_id,
            (v_item->>'menu_item_id')::INTEGER,
            COALESCE(v_item->>'name', v_menu_name),
            v_menu_price,
            (v_item->>'quantity')::INTEGER,
            v_item->>'special_instructions'
        );
    END LOOP;

    RETURN QUERY SELECT 
        TRUE, 
        v_order_id, 
        ('Order created successfully with ID: ' || v_order_id)::VARCHAR;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        FALSE, 
        NULL::INTEGER, 
        ('Error creating order: ' || SQLERRM)::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE 2: Update order status with validation (using FK-based schema)
CREATE OR REPLACE FUNCTION update_order_status_proc(
    p_order_id INTEGER,
    p_new_status_code VARCHAR,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message VARCHAR,
    old_status_code VARCHAR,
    new_status_code VARCHAR
) AS $$
DECLARE
    v_old_status_id INTEGER;
    v_new_status_id INTEGER;
    v_old_status_code VARCHAR;
    v_valid_transitions BOOLEAN;
BEGIN
    -- Get current status
    SELECT os.code, o.order_status_id INTO v_old_status_code, v_old_status_id
    FROM orders o
    JOIN order_statuses os ON o.order_status_id = os.status_id
    WHERE o.order_id = p_order_id;

    IF v_old_status_code IS NULL THEN
        RETURN QUERY SELECT FALSE::BOOLEAN, 'Order not found'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR;
        RETURN;
    END IF;

    -- Get new status ID
    SELECT status_id INTO v_new_status_id FROM order_statuses WHERE code = p_new_status_code;
    
    IF v_new_status_id IS NULL THEN
        RETURN QUERY SELECT FALSE::BOOLEAN, ('Invalid status code: ' || p_new_status_code)::VARCHAR, v_old_status_code, NULL::VARCHAR;
        RETURN;
    END IF;

    -- Validate status transition
    v_valid_transitions := CASE
        WHEN v_old_status_code = 'pending_approval' THEN p_new_status_code IN ('approved', 'cancelled')
        WHEN v_old_status_code = 'approved' THEN p_new_status_code IN ('in_progress', 'cancelled')
        WHEN v_old_status_code = 'in_progress' THEN p_new_status_code IN ('ready', 'approved')
        WHEN v_old_status_code = 'ready' THEN p_new_status_code IN ('completed', 'in_progress')
        ELSE FALSE
    END;

    IF NOT v_valid_transitions THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN, 
            ('Invalid status transition from ' || v_old_status_code || ' to ' || p_new_status_code)::VARCHAR,
            v_old_status_code,
            NULL::VARCHAR;
        RETURN;
    END IF;

    -- Update status
    UPDATE orders SET order_status_id = v_new_status_id WHERE order_id = p_order_id;

    -- Log if notes provided
    IF p_notes IS NOT NULL THEN
        INSERT INTO kitchen_logs (order_id, status_id, notes, created_at)
        VALUES (p_order_id, (SELECT status_id FROM kitchen_statuses LIMIT 1), p_notes, CURRENT_TIMESTAMP);
    END IF;

    RETURN QUERY SELECT 
        TRUE::BOOLEAN,
        'Order status updated successfully'::VARCHAR,
        v_old_status_code,
        p_new_status_code;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        FALSE::BOOLEAN,
        ('Error updating status: ' || SQLERRM)::VARCHAR,
        v_old_status_code,
        NULL::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE 3: Get order details with items (using correct schema)
CREATE OR REPLACE FUNCTION get_order_details(p_order_id INTEGER)
RETURNS TABLE(
    out_order_id INTEGER,
    out_order_number VARCHAR,
    out_customer_id INTEGER,
    out_table_number VARCHAR,
    out_status VARCHAR,
    out_kitchen_status VARCHAR,
    out_item_count INTEGER,
    out_items_json JSON,
    out_created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.order_id,
        o.order_number,
        o.customer_id,
        rt.table_number,
        os.code,
        ks.code,
        COUNT(oi.order_item_id)::INTEGER,
        json_agg(
            json_build_object(
                'id', oi.order_item_id,
                'name', oi.item_name,
                'price', oi.item_price,
                'quantity', oi.quantity,
                'special_instructions', oi.special_instructions
            )
        ),
        o.created_at
    FROM orders o
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
    LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
    LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
    WHERE o.order_id = p_order_id
    GROUP BY o.order_id, o.order_number, o.customer_id, rt.table_number, 
             os.code, ks.code, o.created_at;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE 4: Get today's kitchen statistics (using correct schema)
CREATE OR REPLACE FUNCTION get_kitchen_statistics()
RETURNS TABLE(
    total_orders INTEGER,
    completed_orders INTEGER,
    in_progress_orders INTEGER,
    pending_orders INTEGER,
    average_prep_time INTERVAL,
    most_popular_item VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(o.order_id)::INTEGER,
        COUNT(CASE WHEN os.code = 'completed' THEN 1 END)::INTEGER,
        COUNT(CASE WHEN os.code IN ('in_progress', 'approved') THEN 1 END)::INTEGER,
        COUNT(CASE WHEN os.code = 'pending_approval' THEN 1 END)::INTEGER,
        AVG(o.expected_completion - o.created_at) FILTER (WHERE os.code = 'completed'),
        (SELECT oi.item_name FROM order_items oi 
         JOIN orders ord ON oi.order_id = ord.order_id
         WHERE DATE(ord.created_at) = CURRENT_DATE
         GROUP BY oi.item_name 
         ORDER BY SUM(oi.quantity) DESC LIMIT 1)
    FROM orders o
    JOIN order_statuses os ON o.order_status_id = os.status_id
    WHERE DATE(o.created_at) = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE 5: Batch complete orders by status (FIXED - correct syntax)
CREATE OR REPLACE FUNCTION complete_ready_orders()
RETURNS TABLE(
    completed_count INTEGER,
    message VARCHAR
) AS $$
DECLARE
    v_count INTEGER;
    v_ready_status_id INTEGER;
    v_completed_status_id INTEGER;
BEGIN
    -- Get status IDs
    SELECT status_id INTO v_ready_status_id FROM order_statuses WHERE code = 'ready';
    SELECT status_id INTO v_completed_status_id FROM order_statuses WHERE code = 'completed';
    
    -- Update and count in one operation
    WITH updated AS (
        UPDATE orders 
        SET order_status_id = v_completed_status_id,
            completed_at = CURRENT_TIMESTAMP
        WHERE order_status_id = v_ready_status_id 
          AND expected_completion < CURRENT_TIMESTAMP
        RETURNING order_id
    )
    SELECT COUNT(*) INTO v_count FROM updated;

    RETURN QUERY SELECT 
        v_count,
        ('Completed ' || v_count || ' orders that exceeded expected time')::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- PROCEDURE 6: Get feedback summary for a date range (using correct schema)
CREATE OR REPLACE FUNCTION get_feedback_summary(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    total_feedback_count INTEGER,
    food_quality_avg DECIMAL,
    service_speed_avg DECIMAL,
    order_accuracy_avg DECIMAL,
    value_for_money_avg DECIMAL,
    overall_experience_avg DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(f.feedback_id)::INTEGER,
        ROUND(AVG(f.food_quality)::NUMERIC, 2)::DECIMAL,
        ROUND(AVG(f.service_speed)::NUMERIC, 2)::DECIMAL,
        ROUND(AVG(f.order_accuracy)::NUMERIC, 2)::DECIMAL,
        ROUND(AVG(f.value_for_money)::NUMERIC, 2)::DECIMAL,
        ROUND(AVG(f.overall_experience)::NUMERIC, 2)::DECIMAL
    FROM feedback f
    JOIN orders o ON f.order_id = o.order_id
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
    v_completed_status_id INTEGER;
BEGIN
    v_cutoff_date := CURRENT_TIMESTAMP - (p_days_old || ' days')::INTERVAL;
    SELECT status_id INTO v_completed_status_id FROM order_statuses WHERE code = 'completed';
    
    -- Count orders that would be archived
    SELECT COUNT(*) INTO v_count 
    FROM orders 
    WHERE created_at < v_cutoff_date AND order_status_id = v_completed_status_id;

    RETURN QUERY SELECT 
        v_count,
        ('Found ' || v_count || ' completed orders older than ' || p_days_old || ' days')::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 4: VIEWS FOR COMMON QUERIES (Using correct schema)
-- =====================================================

-- VIEW 1: Active Orders Dashboard
DROP VIEW IF EXISTS v_active_orders CASCADE;
CREATE VIEW v_active_orders AS
SELECT 
    o.order_id,
    o.order_number,
    rt.table_number,
    os.code as status,
    ks.code as kitchen_status,
    COUNT(oi.order_item_id) as item_count,
    AGE(CURRENT_TIMESTAMP, o.created_at) as elapsed_time,
    o.expected_completion,
    o.created_at
FROM orders o
LEFT JOIN order_items oi ON o.order_id = oi.order_id
LEFT JOIN restaurant_tables rt ON o.table_id = rt.table_id
LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
WHERE os.code IN ('pending_approval', 'approved', 'in_progress', 'ready')
GROUP BY o.order_id, o.order_number, rt.table_number, os.code, ks.code, 
         o.expected_completion, o.created_at
ORDER BY o.created_at ASC;

-- VIEW 2: Revenue Report (calculated from order_items since orders doesn't have total)
DROP VIEW IF EXISTS v_revenue_report CASCADE;
CREATE VIEW v_revenue_report AS
SELECT 
    DATE(o.created_at) as order_date,
    COUNT(DISTINCT o.order_id) as order_count,
    SUM(oi.item_price * oi.quantity) as total_revenue,
    ROUND(SUM(oi.item_price * oi.quantity) * 0.1, 2) as estimated_tax,
    ROUND(SUM(oi.item_price * oi.quantity) * 1.1, 2) as grand_total,
    ROUND(AVG(order_totals.order_total), 2) as average_order_value
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
JOIN order_statuses os ON o.order_status_id = os.status_id
JOIN (
    SELECT order_id, SUM(item_price * quantity) as order_total
    FROM order_items
    GROUP BY order_id
) order_totals ON o.order_id = order_totals.order_id
WHERE os.code IN ('completed', 'ready')
GROUP BY DATE(o.created_at)
ORDER BY order_date DESC;

-- VIEW 3: Menu Performance
DROP VIEW IF EXISTS v_menu_performance CASCADE;
CREATE VIEW v_menu_performance AS
SELECT 
    m.item_id,
    m.name,
    mc.name as category,
    m.price,
    COUNT(oi.order_item_id) as times_ordered,
    COALESCE(SUM(oi.quantity), 0) as total_quantity,
    COALESCE(SUM(oi.item_price * oi.quantity), 0) as revenue,
    m.is_available
FROM menu_items m
LEFT JOIN menu_categories mc ON m.category_id = mc.category_id
LEFT JOIN order_items oi ON m.item_id = oi.menu_item_id
GROUP BY m.item_id, m.name, mc.name, m.price, m.is_available
ORDER BY times_ordered DESC;

-- =====================================================
-- SECTION 5: ADDITIONAL INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(order_status_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_kitchen_created ON orders(kitchen_status_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(item_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_submitted ON feedback(submitted_at);

COMMIT;

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
