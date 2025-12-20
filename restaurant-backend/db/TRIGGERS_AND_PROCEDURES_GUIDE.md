# Database Triggers & Stored Procedures Documentation

## Current Status

✅ **Triggers Added**: 9 new triggers  
✅ **Stored Procedures Added**: 7 procedures  
✅ **Views Added**: 3 useful views  
❌ **Previously**: No stored procedures or advanced triggers

---

## Triggers Implemented

### 1. **Auto-timestamp Updates**
- **Trigger**: `trigger_update_menu_items_timestamp`
- **Purpose**: Automatically update `updated_at` when menu items change
- **Event**: BEFORE UPDATE on menu_items

- **Trigger**: `trigger_update_orders_timestamp`
- **Purpose**: Automatically update `updated_at` when orders change
- **Event**: BEFORE UPDATE on orders

### 2. **Kitchen Status Logging**
- **Trigger**: `trigger_log_kitchen_status`
- **Purpose**: Auto-create kitchen log entry when `kitchen_status` changes
- **Event**: AFTER UPDATE on orders
- **Example**: When order moves from "pending" → "preparing", creates log entry automatically

- **Trigger**: `trigger_log_order_status`
- **Purpose**: Auto-create kitchen log entry when order `status` changes
- **Event**: AFTER UPDATE on orders

### 3. **Data Validation**
- **Trigger**: `trigger_validate_payment_status`
- **Purpose**: Prevent invalid payment statuses (only: pending, paid, failed, refunded)
- **Event**: BEFORE INSERT/UPDATE on orders
- **Protection**: Rejects invalid data at database level

- **Trigger**: `trigger_validate_order_status`
- **Purpose**: Prevent invalid order statuses (only: pending_approval, approved, in_progress, ready, completed, cancelled)
- **Event**: BEFORE INSERT/UPDATE on orders

- **Trigger**: `trigger_validate_order_number`
- **Purpose**: Enforce unique order numbers
- **Event**: BEFORE INSERT/UPDATE on orders

### 4. **Feedback Processing**
- **Trigger**: `trigger_calculate_feedback_average`
- **Purpose**: Auto-calculate average rating from 5 metrics
- **Formula**: (food_quality + service_speed + overall_experience + accuracy + value_for_money) / 5
- **Event**: BEFORE INSERT/UPDATE on feedback

### 5. **Auto-initialization**
- **Trigger**: `trigger_create_initial_kitchen_log`
- **Purpose**: Create first kitchen log entry when new order is created
- **Event**: AFTER INSERT on orders
- **Log Info**: Records table number or "TAKEAWAY"

---

## Stored Procedures

### 1. **create_order_with_items()**
**Purpose**: Create complete order with items in single transaction

**Parameters**:
```sql
p_order_number VARCHAR      -- Unique order ID
p_customer_id VARCHAR       -- Customer reference
p_table_number VARCHAR      -- Table or "TAKEAWAY"
p_payment_method VARCHAR    -- Payment type
p_items JSON                -- Array of items with quantities
p_special_instructions TEXT -- Optional instructions
```

**Returns**: success (BOOLEAN), order_id (INTEGER), message (VARCHAR)

**Example**:
```sql
SELECT * FROM create_order_with_items(
    'ORD-12345',
    'CUST-001', 
    '5',
    'card',
    '[
        {"menu_item_id": 1, "name": "Biryani", "quantity": 2, "special_instructions": "Extra spicy"},
        {"menu_item_id": 6, "name": "Burger", "quantity": 1, "special_instructions": null}
    ]'::json,
    'No nuts'
);
```

**Benefits**:
- Single transaction (all-or-nothing)
- Auto-calculates taxes (8%)
- Auto-computes totals
- Validates menu items exist

---

### 2. **update_order_status()**
**Purpose**: Update order status with validation and logging

**Parameters**:
```sql
p_order_id INTEGER          -- Order to update
p_new_status VARCHAR        -- New status
p_notes TEXT DEFAULT NULL   -- Optional notes for log
```

**Returns**: success (BOOLEAN), message (VARCHAR), old_status, new_status

**Valid Transitions**:
- pending_approval → approved, cancelled
- approved → in_progress, cancelled
- in_progress → ready, approved
- ready → completed, in_progress

**Example**:
```sql
SELECT * FROM update_order_status(
    5, 
    'in_progress', 
    'Started cooking steak'
);
```

---

### 3. **get_order_details()**
**Purpose**: Get complete order with all items and details

**Parameters**:
```sql
p_order_id INTEGER          -- Order ID to fetch
```

**Returns**: Complete order data with JSON-formatted items

**Example**:
```sql
SELECT * FROM get_order_details(5);
```

---

### 4. **get_kitchen_statistics()**
**Purpose**: Get daily kitchen performance metrics

**Returns**:
- total_orders - All orders today
- completed_orders - Finished orders
- in_progress_orders - Being prepared
- pending_orders - Awaiting approval
- average_prep_time - Average time from creation to ready
- most_popular_item - Best-selling item
- revenue - Total revenue today

**Example**:
```sql
SELECT * FROM get_kitchen_statistics();
```

---

### 5. **get_feedback_summary()**
**Purpose**: Get feedback analytics for date range

**Parameters**:
```sql
p_start_date DATE
p_end_date DATE
```

**Returns**:
- total_feedback_count
- average_rating
- food_quality_avg
- service_speed_avg
- accuracy_avg
- value_for_money_avg

**Example**:
```sql
SELECT * FROM get_feedback_summary('2024-12-01', '2024-12-31');
```

---

### 6. **complete_ready_orders()**
**Purpose**: Auto-mark orders as completed if they've exceeded expected time

**Returns**: Count of completed orders and message

**Example**:
```sql
SELECT * FROM complete_ready_orders();
```

---

### 7. **archive_old_orders()**
**Purpose**: Find orders ready for archival

**Parameters**:
```sql
p_days_old INTEGER          -- Orders older than this many days
```

**Returns**: Count of archivable orders and message

**Example**:
```sql
SELECT * FROM archive_old_orders(90);  -- Find orders 90+ days old
```

---

## Views

### 1. **v_active_orders**
Shows all orders currently being prepared or pending

**Columns**:
- order_number, table_number, status, kitchen_status
- total, item_count, elapsed_time, expected_completion

### 2. **v_revenue_report**
Daily revenue breakdown

**Columns**:
- order_date, order_count, total_revenue, total_tax, grand_total, average_order_value

### 3. **v_menu_performance**
Which items are most popular

**Columns**:
- name, category, price, times_ordered, total_quantity, revenue, is_available

---

## How to Apply to Database

Run this command in your PostgreSQL terminal:

```bash
# Using psql command line:
$env:PGPASSWORD='Student@123'; &"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -d restaurant_db -f "C:\Users\acer\Desktop\SE Project Final\restaurant-backend\db\triggers-and-procedures.sql"
```

Or import directly from PgAdmin:
1. Open Query Tool
2. Copy entire content of `triggers-and-procedures.sql`
3. Execute

---

## Backend Integration

To use these procedures in your Express backend:

```javascript
// Example: Create order with items
const createOrderWithItems = async (orderData) => {
  const query = `
    SELECT * FROM create_order_with_items(
      $1, $2, $3, $4, $5::json, $6
    )
  `;
  
  const result = await db.query(query, [
    orderData.orderNumber,
    orderData.customerId,
    orderData.tableNumber,
    orderData.paymentMethod,
    JSON.stringify(orderData.items),
    orderData.specialInstructions
  ]);
  
  return result.rows[0];
};

// Example: Get kitchen statistics
const getKitchenStats = async () => {
  const result = await db.query('SELECT * FROM get_kitchen_statistics()');
  return result.rows[0];
};
```

---

## Additional Constraints Added

✅ menu_items.price > 0  
✅ orders.total > 0  
✅ orders.tax >= 0  
✅ order_items.quantity > 0  
✅ order_items.price > 0  

---

## Benefits

1. **Data Integrity**: Triggers enforce rules automatically
2. **Automation**: No manual logging needed
3. **Performance**: Calculations done in database (faster)
4. **Consistency**: All changes go through same logic
5. **Audit Trail**: Full history in kitchen_logs
6. **Validation**: Bad data rejected at database level
7. **Complex Operations**: Multi-step transactions in single call

---

## Testing Examples

```sql
-- Test creating order
SELECT * FROM create_order_with_items(
    'TEST-001', 'CUST-TEST', '1', 'cash',
    '[{"menu_item_id": 1, "name": "Test Item", "quantity": 1}]'::json
);

-- Test status update
SELECT * FROM update_order_status(1, 'approved', 'Ready to cook');

-- Test kitchen stats
SELECT * FROM get_kitchen_statistics();

-- Test active orders view
SELECT * FROM v_active_orders;

-- Test feedback summary
SELECT * FROM get_feedback_summary(CURRENT_DATE - 7, CURRENT_DATE);
```

---

## Next Steps

1. Apply the triggers-and-procedures.sql file to your database
2. Test each procedure with sample data
3. Integrate procedures into your Express routes
4. Update your API to use procedures instead of raw queries
5. Add error handling for procedure results

---

**Created**: December 14, 2025  
**Database**: PostgreSQL 18  
**Status**: Ready to deploy
