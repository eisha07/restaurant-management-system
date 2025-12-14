// Authentication routes for manager login and verification
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateManager } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'restaurant_secret_key_2024';

// Login endpoint - check database
router.post('/manager/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Query database for manager
        const managers = await db.sequelize.query(
            'SELECT id, username, password_hash, email FROM managers WHERE username = ?',
            {
                replacements: [username],
                type: db.sequelize.QueryTypes.SELECT
            }
        );

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
                id: manager.id,
                username: manager.username,
                name: manager.name,
                email: manager.email
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            manager: {
                id: manager.id,
                username: manager.username,
                name: manager.name,
                email: manager.email
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
