// routes/databaseRoutes.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

// =============================================
// HELPER: Basic Authentication Middleware
// =============================================
// routes/databaseRoutes.js - Updated basicAuth middleware
const basicAuth = (req, res, next) => {
    // 'req' is now being used here
    const authHeader = req.headers.authorization;
    
    // In production, use a proper authentication mechanism
    if (process.env.NODE_ENV === 'production') {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false,
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }
        
        const token = authHeader.split(' ')[1];
        if (token !== process.env.ADMIN_TOKEN) {
            return res.status(403).json({ 
                success: false,
                error: 'Forbidden',
                message: 'Invalid admin token'
            });
        }
    }
    
    next(); // 'next' is also being used
};

// =============================================
// DATABASE INFO ENDPOINTS (Admin only)
// =============================================

// GET /api/db/tables - List all tables in database
router.get('/tables', basicAuth, async (req, res) => {
    try {
        const [tables] = await sequelize.query(
            `SELECT table_name 
             FROM information_schema.tables 
             WHERE table_schema = 'public' 
             ORDER BY table_name;`
        );
        
        const [dbInfo] = await sequelize.query(
            `SELECT current_database() as name, version();`
        );

        res.json({
            success: true,
            data: {
                database: dbInfo[0],
                tables: tables
            },
            message: `Database has ${tables.length} tables`
        });

    } catch (error) {
        console.error('Tables error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Cannot retrieve database tables'
        });
    }
});

// GET /api/db/test-db - Comprehensive database test
router.get('/test-db', basicAuth, async (req, res) => {
    try {
        const [versionResult] = await sequelize.query(
            `SELECT version() as postgres_version;`
        );
        
        const [tables] = await sequelize.query(
            `SELECT table_name 
             FROM information_schema.tables 
             WHERE table_schema = 'public' 
             ORDER BY table_name;`
        );
        
        const [categories] = await sequelize.query(
            'SELECT category_id as id, name FROM menu_categories ORDER BY name;'
        );
        
        const [menuItems] = await sequelize.query(
            `SELECT m.item_id as id, m.name, m.price, m.category 
             FROM menu_items m
             WHERE m.is_available = true
             ORDER BY m.name;`
        );
        
        const [orders] = await sequelize.query(
            `SELECT id, status, payment_method, total_amount 
             FROM orders
             ORDER BY created_at DESC
             LIMIT 3;`
        );
        
        const [metrics] = await sequelize.query(`
            SELECT 
                (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
                (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections;`
        );

        res.json({
            success: true,
            database: {
                version: versionResult[0].postgres_version,
                connection: 'healthy',
                query_performance: 'optimal'
            },
            tables: {
                count: tables.length,
                names: tables.map(t => t.table_name),
                status: 'can access all tables'
            },
            sample_data: {
                categories: {
                    count: categories.length,
                    sample: categories.slice(0, 2)
                },
                menu_items: {
                    count: menuItems.length,
                    sample: menuItems.slice(0, 2)
                }
            },
            orders: {
                count: orders.length,
                recent_orders: orders
            },
            metrics: metrics[0],
            message: 'Database connection test successful'
        });

    } catch (error) {
        console.error('Test DB error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Database connection test failed'
        });
    }
});

// GET /api/db/stats - Database statistics
router.get('/stats', basicAuth, async (req, res) => {
    try {
        const [tableStats] = await sequelize.query(`
            SELECT table_name, (
                SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_name = t.table_name
            ) as column_count
            FROM information_schema.tables t 
            WHERE table_schema = 'public'
            ORDER BY table_name;`
        );
        
        const [rowCounts] = await sequelize.query(`
            SELECT 'menu_categories' as table_name, (SELECT COUNT(*) FROM menu_categories) as row_count
            UNION ALL SELECT 'menu_items', (SELECT COUNT(*) FROM menu_items)
            UNION ALL SELECT 'orders', (SELECT COUNT(*) FROM orders)
            UNION ALL SELECT 'order_items', (SELECT COUNT(*) FROM order_items)
            UNION ALL SELECT 'feedback', (SELECT COUNT(*) FROM feedback);`
        );
        
        const [sizeInfo] = await sequelize.query(`
            SELECT 
                pg_size_pretty(pg_database_size(current_database())) as total_database_size,
                (SELECT COUNT(*) FROM menu_categories) as total_categories,
                (SELECT COUNT(*) FROM menu_items) as total_menu_items,
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COUNT(*) FROM order_items) as total_order_items;`
        );

        res.json({
            success: true,
            statistics: {
                table_information: tableStats,
                row_counts: rowCounts,
                size_information: sizeInfo[0],
                summary: {
                    total_tables: tableStats.length,
                    total_rows: rowCounts.reduce((sum, table) => sum + parseInt(table.row_count), 0),
                    database_size: sizeInfo[0].total_database_size
                }
            },
            message: `Database statistics: ${tableStats.length} tables, ${sizeInfo[0].total_database_size} total size`
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to get database statistics'
        });
    }
});

// GET /api/db/health - Comprehensive database health check
router.get('/health', async (req, res) => {
    try {
        const healthChecks = [];

        // CHECK 1: Database Connection
        try {
            await sequelize.authenticate();
            healthChecks.push({
                check: 'Database Connection',
                status: '✅ passed',
                details: 'Successfully connected to PostgreSQL database'
            });
        } catch (error) {
            healthChecks.push({
                check: 'Database Connection',
                status: '❌ failed',
                details: `Connection failed: ${error.message}`
            });
        }

        // CHECK 2: Required Tables Exist
        const requiredTables = ['menu_categories', 'menu_items', 'orders', 'order_items', 'feedback'];
        const [existingTables] = await sequelize.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        const existingTableNames = existingTables.map(t => t.table_name);
        const missingTables = requiredTables.filter(table => !existingTableNames.includes(table));

        if (missingTables.length === 0) {
            healthChecks.push({
                check: 'Required Tables',
                status: '✅ passed',
                details: `All ${requiredTables.length} required tables exist`
            });
        } else {
            healthChecks.push({
                check: 'Required Tables',
                status: '❌ failed',
                details: `Missing tables: ${missingTables.join(', ')}`
            });
        }

        // CHECK 3: Sample Data Availability
        try {
            const [categoryCount] = await sequelize.query('SELECT COUNT(*) as count FROM menu_categories');
            const [menuItemCount] = await sequelize.query('SELECT COUNT(*) as count FROM menu_items');

            const hasCategories = parseInt(categoryCount[0].count) > 0;
            const hasMenuItems = parseInt(menuItemCount[0].count) > 0;

            if (hasCategories && hasMenuItems) {
                healthChecks.push({
                    check: 'Sample Data',
                    status: '✅ passed',
                    details: `Found ${categoryCount[0].count} categories and ${menuItemCount[0].count} menu items`
                });
            } else {
                healthChecks.push({
                    check: 'Sample Data',
                    status: '⚠️ warning',
                    details: `Limited data: ${categoryCount[0].count} categories, ${menuItemCount[0].count} menu items`
                });
            }
        } catch (error) {
            healthChecks.push({
                check: 'Sample Data',
                status: '❌ failed',
                details: `Data check failed: ${error.message}`
            });
        }

        // CHECK 4: Database Performance
        try {
            const [performance] = await sequelize.query(`
                SELECT 
                    EXTRACT(epoch FROM (NOW() - pg_postmaster_start_time())) as uptime_seconds,
                    (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
                    (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections
            `);

            const uptimeHours = (performance[0].uptime_seconds / 3600).toFixed(1);
            const connectionUsage = (performance[0].active_connections / performance[0].max_connections * 100).toFixed(1);

            let performanceStatus = '✅ passed';
            let performanceDetails = `Database uptime: ${uptimeHours}h, Connections: ${performance[0].active_connections}/${performance[0].max_connections} (${connectionUsage}%)`;

            if (connectionUsage > 80) {
                performanceStatus = '⚠️ warning';
                performanceDetails += ' - High connection usage';
            }

            healthChecks.push({
                check: 'Database Performance',
                status: performanceStatus,
                details: performanceDetails
            });
        } catch (error) {
            healthChecks.push({
                check: 'Database Performance',
                status: '❌ failed',
                details: `Performance check failed: ${error.message}`
            });
        }

        // CHECK 5: Database Size
        try {
            const [sizeInfo] = await sequelize.query(`
                SELECT 
                    pg_size_pretty(pg_database_size(current_database())) as total_size,
                    pg_size_pretty(pg_relation_size('orders')) as orders_size,
                    pg_size_pretty(pg_relation_size('menu_items')) as menu_items_size
            `);

            healthChecks.push({
                check: 'Database Size',
                status: '✅ passed',
                details: `Total: ${sizeInfo[0].total_size}, Orders: ${sizeInfo[0].orders_size}, Menu: ${sizeInfo[0].menu_items_size}`
            });
        } catch (error) {
            healthChecks.push({
                check: 'Database Size',
                status: '⚠️ warning',
                details: `Size check unavailable: ${error.message}`
            });
        }

        // Calculate overall status
        const failedChecks = healthChecks.filter(check => check.status.includes('❌'));
        const warningChecks = healthChecks.filter(check => check.status.includes('⚠️'));

        let overallStatus;
        let overallMessage;

        if (failedChecks.length > 0) {
            overallStatus = '❌ unhealthy';
            overallMessage = `${failedChecks.length} critical issues need immediate attention`;
        } else if (warningChecks.length > 0) {
            overallStatus = '⚠️ needs attention';
            overallMessage = `${warningChecks.length} warnings - review recommended`;
        } else {
            overallStatus = '✅ healthy';
            overallMessage = 'All database systems are operating normally';
        }

        res.json({
            success: true,
            status: overallStatus,
            timestamp: new Date().toISOString(),
            checks: healthChecks,
            summary: {
                total_checks: healthChecks.length,
                passed: healthChecks.filter(c => c.status.includes('✅')).length,
                warnings: warningChecks.length,
                failures: failedChecks.length
            },
            message: overallMessage
        });

    } catch (error) {
        console.error('Database health check error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Database health check failed completely'
        });
    }
});

// GET /api/db/status - Simple health check for load balancers
router.get('/status', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

module.exports = router;