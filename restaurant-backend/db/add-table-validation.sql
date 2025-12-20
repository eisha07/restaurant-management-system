-- =====================================================
-- TABLE NUMBER VALIDATION (1-22)
-- =====================================================
-- This migration adds constraints to ensure table numbers are valid integers from 1-22

-- Add check constraint to restaurant_tables
ALTER TABLE restaurant_tables
DROP CONSTRAINT IF EXISTS check_table_number_range CASCADE;

ALTER TABLE restaurant_tables
ADD CONSTRAINT check_table_number_range 
CHECK (
    -- Ensure table_number is numeric and between 1-22
    table_number ~ '^\d+$' AND 
    CAST(table_number AS INTEGER) >= 1 AND 
    CAST(table_number AS INTEGER) <= 22
);

-- Add a function to validate table numbers before insert/update
CREATE OR REPLACE FUNCTION validate_table_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if table_number is a valid integer between 1-22
    IF NOT (NEW.table_number ~ '^\d+$') THEN
        RAISE EXCEPTION 'Table number must be numeric';
    END IF;
    
    IF CAST(NEW.table_number AS INTEGER) < 1 OR CAST(NEW.table_number AS INTEGER) > 22 THEN
        RAISE EXCEPTION 'Table number must be between 1 and 22';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_validate_table_number ON restaurant_tables;

-- Create trigger
CREATE TRIGGER trigger_validate_table_number
BEFORE INSERT OR UPDATE ON restaurant_tables
FOR EACH ROW
EXECUTE FUNCTION validate_table_number();

-- Function to validate table_id references in orders
CREATE OR REPLACE FUNCTION validate_order_table_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If table_id is provided, verify it exists and is valid
    IF NEW.table_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM restaurant_tables 
            WHERE table_id = NEW.table_id 
            AND CAST(table_number AS INTEGER) >= 1 
            AND CAST(table_number AS INTEGER) <= 22
        ) THEN
            RAISE EXCEPTION 'Invalid table ID. Table must be in valid range (1-22).';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_validate_order_table_id ON orders;

-- Create trigger for orders
CREATE TRIGGER trigger_validate_order_table_id
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_order_table_id();

-- Output confirmation
SELECT 'Table validation constraints added successfully' as status;
