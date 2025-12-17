// Auth middleware for manager authentication
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'restaurant_secret_key_2024';

// Authenticate manager token (optional in dev mode)
const authenticateManager = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const isDev = process.env.NODE_ENV !== 'production';
        
        // In development, auth is optional
        if (!authHeader && isDev) {
            console.log('ℹ️ Dev mode: Skipping auth check');
            req.manager = { id: 1, username: 'dev-manager', role: 'manager' };
            return next();
        }

        if (!authHeader && !isDev) {
            return res.status(401).json({ 
                success: false, 
                message: 'Missing authorization header' 
            });
        }

        const token = authHeader?.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (!token && !isDev) {
            return res.status(401).json({ 
                success: false, 
                message: 'Missing token' 
            });
        }

        // In dev mode without token, allow through
        if (!token && isDev) {
            req.manager = { id: 1, username: 'dev-manager', role: 'manager' };
            return next();
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.manager = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        const isDev = process.env.NODE_ENV !== 'production';
        
        if (isDev) {
            // In dev mode, allow through even with invalid token
            req.manager = { id: 1, username: 'dev-manager', role: 'manager' };
            return next();
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token has expired' 
            });
        }
        
        res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

// Authorize manager (check role if needed)
const authorizeManager = (req, res, next) => {
    try {
        if (!req.manager) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        // You can add role-based authorization here
        // For now, just check if manager is authenticated
        next();
    } catch (error) {
        console.error('Authorization error:', error);
        res.status(403).json({ 
            success: false, 
            message: 'Not authorized' 
        });
    }
};

module.exports = {
    authenticateManager,
    authorizeManager
};
