const db = require('./config/database');

(async () => {
  try {
    const orders = await db.sequelize.query(`
      SELECT 
        o.order_id,
        o.order_number,
        os.name as status,
        o.created_at,
        to_char(o.created_at, 'YYYY-MM-DD HH:MI:SS') as formatted_time
      FROM orders o
      LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
      ORDER BY o.order_id DESC
      LIMIT 15
    `, { type: db.sequelize.QueryTypes.SELECT });
    
    console.log('Recent 15 Orders:');
    console.log('─'.repeat(85));
    orders.forEach(o => {
      const status = o.status || 'NULL';
      console.log(`  ID: ${o.order_id.toString().padStart(2)} | ${o.order_number.padEnd(20)} | ${status.padEnd(18)} | ${o.formatted_time}`);
    });
  } catch(e) {
    console.error(e.message);
  }
  process.exit(0);
})();
