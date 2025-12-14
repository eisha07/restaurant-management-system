// server/middleware/kitchenAuth.js
const jwt = require('jsonwebtoken');

const authenticateKitchen = (req, res, next) => {
    // Kitchen can use simple token or device ID
    const token = req.header('X-Kitchen-Token') || 
                  req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        // For demo, allow kitchen access without auth
        // In production, use proper authentication
        req.kitchen = { id: 'kitchen-station-1', role: 'kitchen' };
        return next();
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kitchen-secret');
        req.kitchen = decoded;
        next();
    } catch (error) {
        // Demo mode: allow access even with invalid token
        req.kitchen = { id: 'kitchen-station-1', role: 'kitchen' };
        return next();
    }
};

module.exports = { authenticateKitchen };