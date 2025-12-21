const express = require('express');
const router = express.Router();
const { sequelize, QueryTypes } = require('sequelize');

// GET /api/db/health - Database health check
router.get('/health', async (req, res) => {
  try {
    const result = await sequelize.query('SELECT 1', { type: QueryTypes.SELECT });
    res.json({ 
      success: true, 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      database: 'disconnected', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/db/info - Get database info
router.get('/info', async (req, res) => {
  try {
    const info = await sequelize.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as version,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
    `, { type: QueryTypes.SELECT });
    
    res.json({ success: true, info: info[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/db/tables - List all tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await sequelize.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `, { type: QueryTypes.SELECT });
    
    res.json({ success: true, tables });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
