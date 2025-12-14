// Auth middleware for manager authentication
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'restaurant_secret_key_2024';

// Authenticate manager token
const authenticateManager = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        
        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'Missing authorization header' 
            });
        }

        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Missing token' 
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.manager = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        
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
