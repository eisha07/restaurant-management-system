
const db = require('./restaurant-backend/config/database');
async function updateConstraints() {
    try {
        await db.sequelize.query(`
            ALTER TABLE restaurant_tables DROP CONSTRAINT IF EXISTS check_table_number_range;
            ALTER TABLE restaurant_tables ADD CONSTRAINT check_table_number_range CHECK (table_number::INTEGER >= 1 AND table_number::INTEGER <= 50);
        `);
        console.log('Updated check_table_number_range to allow up to 50');
        
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
updateConstraints();
