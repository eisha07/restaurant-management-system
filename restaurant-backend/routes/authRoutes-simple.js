const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { sequelize, QueryTypes } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

// POST /api/auth/manager-login - Manager login
router.post('/manager-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Simple hardcoded auth for now (update to use database if needed)
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { username: 'admin', role: 'manager' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({ 
        success: true, 
        token,
        user: { username: 'admin', role: 'manager' }
      });
    }
    
    res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('Error in manager login:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/verify - Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
