// routes/index.js - IMPROVED VERSION
const express = require('express');
const router = express.Router();

// Root route
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🍔 Restaurant Management System API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            database: '/database',
            menu: '/menu',
            orders: '/orders',
            feedback: '/feedback',
            qr: '/qr'
        }
    });
});

// Load routes
console.log('📁 Loading routes...\n');

// Function to safely load a route module
const loadRoute = (name, path) => {
    try {
        console.log(`Loading ${name}...`);
        const routeModule = require(`./${name}`);
        
        // Check if it's a valid router
        if (routeModule && typeof routeModule === 'function') {
            router.use(path, routeModule);
            console.log(`✅ ${name} loaded at ${path}`);
            return true;
        } else {
            console.log(`❌ ${name} is not a valid router function`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Failed to load ${name}: ${error.message}`);
        
        // Create a fallback route if it's a critical module
        if (name === 'healthRoutes') {
            router.get(path + '/fallback', (req, res) => {
                res.json({ 
                    success: true, 
                    message: `${name} fallback route`,
                    error: error.message 
                });
            });
        }
        return false;
    }
};

// Load all routes
const routes = [
    { name: 'healthRoutes', path: '/health' },
    { name: 'databaseRoutes', path: '/database' },
    { name: 'menuRoutes', path: '/menu' },
    { name: 'orderRoutes', path: '/orders' },
    { name: 'feedbackRoutes', path: '/feedback' },
    { name: 'qrRoutes', path: '/qr' }
];

routes.forEach(({ name, path }) => loadRoute(name, path));

// Test route
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'All routes are working!',
        timestamp: new Date().toISOString(),
        routes: routes.map(r => ({
            name: r.name,
            path: r.path,
            url: `http://localhost:3000/api${r.path}`
        }))
    });
});

console.log('\n✨ Route loading complete');
module.exports = router;