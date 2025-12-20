/**
 * Check if restaurant tables exist in database
 */
const db = require('./restaurant-backend/config/database');

async function checkTables() {
  try {
    console.log('🔍 Checking restaurant_tables...\n');
    
    const result = await db.sequelize.query(`
      SELECT table_id, table_number, seating_capacity, status 
      FROM restaurant_tables 
      ORDER BY table_number 
      LIMIT 25
    `, { type: db.sequelize.QueryTypes.SELECT });

    if (result.length === 0) {
      console.log('❌ No tables found! Need to initialize database.');
      console.log('\nRun: npm run init-db\n');
      return false;
    }

    console.log(`✓ Found ${result.length} tables:\n`);
    result.forEach(t => {
      console.log(`  Table ${t.table_number}: ID=${t.table_id}, Capacity=${t.seating_capacity}, Status=${t.status}`);
    });

    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await db.sequelize.close();
  }
}

checkTables().then(success => {
  process.exit(success ? 0 : 1);
});
