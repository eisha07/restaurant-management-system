
const db = require('./restaurant-backend/config/database');
async function addTables() {
    try {
        for (let i = 13; i <= 25; i++) {
            await db.sequelize.query(`
                INSERT INTO restaurant_tables (table_number, table_type, capacity, location_zone, is_available, is_active)
                VALUES ($1, 'standard', 4, 'Main Hall', true, true)
                ON CONFLICT (table_number) DO NOTHING
            `, { bind: [i.toString()], type: db.sequelize.QueryTypes.INSERT });
        }
        console.log('Added tables 13-25 to restaurant_tables');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
addTables();
