-- =============================================
-- INSTALLATION & DEPLOYMENT GUIDE
-- =============================================

This directory contains the complete normalized database schema (3NF) for the Restaurant Management System.

## Files Overview

1. **schema-3nf.sql**
   - Complete normalized database schema (Third Normal Form)
   - All reference tables (categories, statuses, methods)
   - Core entity tables (menu items, customers, managers, tables)
   - Transaction tables (orders, order items, payments)
   - Audit and logging tables
   - Views for common queries
   - Comprehensive indexes for performance

2. **seed-data-3nf.sql**
   - Sample reference data (categories, statuses, payment methods)
   - Sample restaurants, managers, customers
   - Sample menu items across all categories
   - Sample orders with complete transaction history
   - Sample feedback and kitchen logs
   - Configuration and settings
   - Notifications

## Installation Steps

### Option 1: Using psql Command Line

```bash
# From the backend directory
cd restaurant-backend

# Create schema
psql -U your_db_user -d restaurant_db -f db/schema-3nf.sql

# Seed data
psql -U your_db_user -d restaurant_db -f db/seed-data-3nf.sql
```

### Option 2: Using Node.js Script

```bash
cd restaurant-backend
npm install pg
node db-setup-script.js
```

### Option 3: Using Docker PostgreSQL

```bash
# Create container and run scripts
docker exec -i postgres_container psql -U postgres -d restaurant_db -f db/schema-3nf.sql
docker exec -i postgres_container psql -U postgres -d restaurant_db -f db/seed-data-3nf.sql
```

## Database Configuration

Update your `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=restaurant_db
DB_USER=postgres
DB_PASSWORD=your_password
NODE_ENV=development
```

## Schema Overview

### Reference Tables (Lookup Data)
- `menu_categories` - Categories for menu items
- `order_statuses` - Possible order statuses (pending, approved, preparing, ready, completed, cancelled)
- `kitchen_statuses` - Kitchen order statuses
- `payment_statuses` - Payment tracking statuses
- `payment_methods` - Accepted payment methods

### Core Entity Tables
- `restaurant_tables` - Physical dining tables
- `customers` - Customer information
- `menu_items` - Menu items with pricing and details
- `managers` - Restaurant staff management

### Transaction Tables
- `orders` - Customer orders
- `order_items` - Items within orders
- `payment_transactions` - Payment records
- `feedback` - Customer feedback and ratings

### Audit & Support Tables
- `kitchen_logs` - Kitchen activity logs
- `system_logs` - System events and errors
- `restaurant_settings` - Configuration settings
- `notifications` - User notifications

## Key Features

### Data Integrity
✓ Foreign key constraints with cascade/restrict options
✓ CHECK constraints for data validation
✓ UNIQUE constraints for critical fields
✓ Default values for timestamps and statuses

### Performance Optimization
✓ Strategic indexes on frequently queried columns
✓ Composite indexes for common filter combinations
✓ Optimized JOIN paths with foreign keys

### Scalability
✓ Normalized structure (3NF) eliminates data redundancy
✓ Partitioning-ready design
✓ Archive-friendly structure

### Views for Common Queries
✓ `vw_order_summary` - Complete order information
✓ `vw_menu_with_category` - Menu with category details
✓ `vw_available_tables` - Available dining tables

## Common Queries

### Get Active Menu Items
```sql
SELECT * FROM vw_menu_with_category
WHERE is_available = true
ORDER BY category_id, display_order;
```

### Get Orders with Customer Details
```sql
SELECT * FROM vw_order_summary
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Get Available Tables
```sql
SELECT * FROM vw_available_tables
ORDER BY table_number;
```

### Get Order with Items and Pricing
```sql
SELECT 
    o.order_id,
    o.order_number,
    c.name as customer_name,
    STRING_AGG(oi.item_name || ' x' || oi.quantity, ', ') as items,
    SUM(oi.item_price * oi.quantity) as total_amount
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.order_id = ?
GROUP BY o.order_id, c.name;
```

## Database Maintenance

### Regular Backups
```bash
# Backup entire database
pg_dump -U postgres restaurant_db > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U postgres restaurant_db < backup_20250101.sql
```

### Check Database Health
```sql
-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname != 'pg_catalog'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index sizes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_indexes
WHERE schemaname != 'pg_catalog';
```

### Vacuum and Analyze (Regular Maintenance)
```sql
VACUUM ANALYZE;
```

## Backend Integration

### Example: NodeJS + Sequelize Query

```javascript
// Get all orders with related data
const orders = await sequelize.query(`
    SELECT * FROM vw_order_summary
    WHERE created_at >= NOW() - INTERVAL '7 days'
    ORDER BY created_at DESC
`, { type: QueryTypes.SELECT });
```

### Example: Express Route with Normalized Data

```javascript
app.get('/api/orders/:id', async (req, res) => {
    try {
        const order = await sequelize.query(`
            SELECT * FROM vw_order_summary
            WHERE order_id = ?
        `, {
            replacements: [req.params.id],
            type: QueryTypes.SELECT
        });
        res.json(order[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## Troubleshooting

### Issue: "relation does not exist"
- Ensure schema-3nf.sql was executed first
- Run: `psql -l` to verify database exists
- Check .env file for correct database name

### Issue: "permission denied"
- Verify user permissions: `ALTER USER username CREATEDB;`
- Ensure user owns the database

### Issue: Slow Queries
- Run: `ANALYZE;` to update statistics
- Check for missing indexes
- Review execution plan: `EXPLAIN ANALYZE SELECT ...;`

### Issue: Duplicate Key Violation
- Check unique constraints:
  ```sql
  SELECT * FROM pg_indexes WHERE tablename = 'target_table';
  ```

## Performance Tips

1. **Add indexes** on frequently filtered columns
2. **Use EXPLAIN ANALYZE** to optimize slow queries
3. **Schedule VACUUM ANALYZE** during off-peak hours
4. **Monitor slow query logs** for optimization opportunities
5. **Partition large tables** (orders, system_logs) if they grow very large

## Security Considerations

1. ✓ Use environment variables for credentials
2. ✓ Implement row-level security (RLS) for multi-tenant support
3. ✓ Use parameterized queries to prevent SQL injection
4. ✓ Regular backups and disaster recovery testing
5. ✓ Audit logging for sensitive operations
6. ✓ Encrypt sensitive data (passwords, payment info)

## Next Steps

1. Execute `schema-3nf.sql` to create tables
2. Execute `seed-data-3nf.sql` to populate sample data
3. Test connections from backend application
4. Update API routes to use new schema
5. Run comprehensive test suite
6. Monitor query performance in production

---

For questions or issues, refer to the main README.md or contact the development team.
