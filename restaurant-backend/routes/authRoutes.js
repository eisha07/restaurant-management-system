// Authentication routes for manager login and verification
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
// Don't import db here - it's not needed for simple password auth and may cause hangs
const { authenticateManager } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'restaurant_secret_key_2024';

// Simple manager login with password (for development)
// This route should be fast and not depend on database
router.post('/manager-login', (req, res) => {
    // Set response timeout to prevent hanging
    req.setTimeout(5000); // 5 second timeout
    
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        // Default manager password for development
        const DEFAULT_PASSWORD = process.env.MANAGER_PASSWORD || 'admin123';

        if (password !== DEFAULT_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // Generate JWT token (synchronous operation, should be fast)
        const token = jwt.sign(
            {
                id: 1,
                username: 'manager',
                name: 'Manager',
                email: 'manager@restaurant.com',
                role: 'manager'
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('✅ Manager login successful');
        res.json({
            success: true,
            message: 'Login successful',
            token,
            manager: {
                id: 1,
                username: 'manager',
                name: 'Manager',
                email: 'manager@restaurant.com',
                role: 'manager'
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// Login endpoint - check database (lazy load db to avoid startup hangs)
router.post('/manager/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Lazy load database only when needed
        const db = require('../config/database');
        
        // Query database for manager with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timeout')), 5000)
        );
        
        const managers = await Promise.race([
            db.sequelize.query(
                'SELECT manager_id, username, password_hash, email, full_name, role FROM managers WHERE username = $1',
                {
                    bind: [username],
                    type: db.sequelize.QueryTypes.SELECT
                }
            ),
            timeoutPromise
        ]);

        const manager = managers[0];

        if (!manager || manager.password_hash !== password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: manager.manager_id,
                username: manager.username,
                name: manager.full_name,
                email: manager.email,
                role: manager.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            manager: {
                id: manager.manager_id,
                username: manager.username,
                name: manager.full_name,
                email: manager.email,
                role: manager.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Alias for frontend convenience - simple auth without DB dependency
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Default credentials for development
        const DEFAULT_USERNAME = 'manager';
        const DEFAULT_PASSWORD = process.env.MANAGER_PASSWORD || 'admin123';

        // Try database lookup first, but fallback to default credentials
        let manager = null;
        
        try {
            const db = require('../config/database');
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database query timeout')), 3000)
            );
            
            const managers = await Promise.race([
                db.sequelize.query(
                    'SELECT manager_id, username, password_hash, email, full_name, role FROM managers WHERE username = $1',
                    {
                        bind: [username],
                        type: db.sequelize.QueryTypes.SELECT
                    }
                ),
                timeoutPromise
            ]);

            manager = managers[0];
            
            // Validate against database
            if (manager && manager.password_hash === password) {
                const token = jwt.sign(
                    {
                        id: manager.manager_id,
                        username: manager.username,
                        name: manager.full_name,
                        email: manager.email,
                        role: manager.role
                    },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                return res.json({
                    success: true,
                    message: 'Login successful',
                    token,
                    manager: {
                        id: manager.manager_id,
                        username: manager.username,
                        name: manager.full_name,
                        email: manager.email,
                        role: manager.role
                    }
                });
            }
        } catch (dbError) {
            console.log('⚠️  Database lookup failed, using default credentials:', dbError.message);
        }

        // Fallback: Use default credentials if DB lookup failed or no match
        if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
            const token = jwt.sign(
                {
                    id: 1,
                    username: DEFAULT_USERNAME,
                    name: 'Manager',
                    email: 'manager@restaurant.com',
                    role: 'manager'
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            console.log('✅ Manager login successful (default credentials)');
            return res.json({
                success: true,
                message: 'Login successful',
                token,
                manager: {
                    id: 1,
                    username: DEFAULT_USERNAME,
                    name: 'Manager',
                    email: 'manager@restaurant.com',
                    role: 'manager'
                }
            });
        }

        // Invalid credentials
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Verify token endpoint
router.get('/verify', authenticateManager, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Token is valid',
            manager: req.manager
        });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Logout endpoint (client-side token deletion, server-side can validate)
router.post('/logout', authenticateManager, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
