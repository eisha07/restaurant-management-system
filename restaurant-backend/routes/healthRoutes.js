const express = require('express');
const router = express.Router();
const { testConnection } = require('../config/database');

router.get('/health', async (req, res) => {
    try {
        const dbConnected = await testConnection();
        
        res.json({
            success: true,
            status: 'database is healthy',
            timestamp: new Date().toISOString(),
            services: {
                server: 'running',
                database: dbConnected ? 'connected' : 'disconnected',
                api: 'responsive'
            },
            uptime: `${process.uptime().toFixed(2)} seconds`,
            environment: process.env.NODE_ENV,
            message: 'all systems are operational'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            message: 'Health check failed'
        });
    }
});

// GET /health/detailed - Comprehensive health check
router.get('/health/detailed', async (req, res) => {
    try {
        const healthReport = {
            timestamp: new Date().toISOString(),
            system: {},
            database: {},
            application: {},
            checks: []
        };

        // this is check one to see if the db is connected
        try {
            const dbConnected = await testConnection();
            healthReport.checks.push({
                service: 'Database Connection',
                status: dbConnected ? 'healthy' : 'failed',
                details: dbConnected ? 'Connected to PostgreSQL' : 'Connection failed'
            });
            healthReport.database.connected = dbConnected;
        } catch (error) {
            healthReport.checks.push({
                service: 'Database Connection',
                status: 'failed',
                details: error.message
            });
            healthReport.database.connected = false;
        }

        // this is checking for server's uptime
        healthReport.checks.push({
            service: 'Server Uptime',
            status: 'healthy',
            details: `${process.uptime().toFixed(2)} seconds`
        });

        // checking how much memory the database uses
        const memoryUsage = process.memoryUsage();
        healthReport.checks.push({
            service: 'Memory Usage',
            status: 'healthy',
            details: `RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
        });

        // CHECK 4: Environment
        healthReport.checks.push({
            service: 'Environment',
            status: 'configured',
            details: process.env.NODE_ENV || 'development'
        });

        // CHECK 5: API Responsiveness
        healthReport.checks.push({
            service: 'API Responsiveness',
            status: 'responsive',
            details: 'express server is handling requests'
        });

        // what's the overall status of the db
        const failedChecks = healthReport.checks.filter(check => check.status.includes('❌'));
        const overallStatus = failedChecks.length > 0 ? 'unhealthy' : 'healthy';

        res.json({
            success: true,
            status: overallStatus,
            report: healthReport,
            summary: {
                total_checks: healthReport.checks.length,
                healthy: healthReport.checks.filter(c => c.status.includes('✅')).length,
                failed: failedChecks.length
            },
            message: overallStatus === 'healthy' ? 
                'all systems are healthy and operational' : 
                `${failedChecks.length} service(s) need attention`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'critical failure',
            error: error.message,
            message: 'detailed health check failed completely'
        });
    }
});

// load balancer check
router.get('/health/readiness', async (req, res) => {
    try {
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            return res.status(503).json({
                success: false,
                status: 'not ready',
                message: 'd not connected - system not ready to handle traffic'
            });
        }

        res.json({
            success: true,
            status: 'ready',
            timestamp: new Date().toISOString(),
            message: 'System is ready to handle requests'
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'not ready',
            error: error.message,
            message: 'System is not ready'
        });
    }
});

// GET /health/liveness - Liveness check (for Kubernetes/containers)
router.get('/health/liveness', (req, res) => {
    // Simple check - is the process alive?
    res.json({
        success: true,
        status: '✅ Live',
        timestamp: new Date().toISOString(),
        message: 'Application is running and responsive'
    });
});

// GET /health/db - Database-specific health check
router.get('/health/db', async (req, res) => {
    try {
        const { sequelize } = require('../config/database');
        
        // Test basic query performance
        const startTime = Date.now();
        await sequelize.query('SELECT 1 as health_check;');
        const queryTime = Date.now() - startTime;

        // Get database metrics
        const [dbInfo] = await sequelize.query(`
            SELECT 
                current_database() as name,
                (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
                (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections
        `);

        res.json({
            success: true,
            status: '✅ Healthy',
            database: {
                name: dbInfo[0].name,
                connection: '✅ Stable',
                performance: queryTime < 100 ? '✅ Fast' : '⚠️ Slow',
                query_time: `${queryTime}ms`,
                connections: {
                    active: dbInfo[0].active_connections,
                    max: dbInfo[0].max_connections
                }
            },
            message: 'Database is healthy and responsive'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            status: '❌ Unhealthy',
            error: error.message,
            message: 'Database health check failed'
        });
    }
});

// GET /health/system - System resource health
router.get('/health/system', (req, res) => {
    const healthReport = {
        timestamp: new Date().toISOString(),
        nodejs: {
            version: process.version,
            platform: process.platform,
            architecture: process.arch
        },
        memory: {
            rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`
        },
        uptime: {
            seconds: process.uptime(),
            human_readable: `${Math.floor(process.uptime() / 60)} minutes ${Math.floor(process.uptime() % 60)} seconds`
        },
        environment: process.env.NODE_ENV || 'development'
    };

    res.json({
        success: true,
        status: 'healthy',
        system: healthReport,
        message: 'system resources functioning normally'
    });
});

module.exports = router;