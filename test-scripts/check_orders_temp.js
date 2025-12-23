
const db = require('./restaurant-backend/config/database');
async function checkOrders() {
    try {
        const orders = await db.sequelize.query(`
            SELECT o.order_id, o.order_number, os.name as order_status, ks.name as kitchen_status
            FROM orders o
            LEFT JOIN order_statuses os ON o.order_status_id = os.status_id
            LEFT JOIN kitchen_statuses ks ON o.kitchen_status_id = ks.status_id
            ORDER BY o.created_at DESC
            LIMIT 10
        `, { type: db.sequelize.QueryTypes.SELECT });
        console.log('Recent Orders:', JSON.stringify(orders, null, 2));
        
        const nullKitchen = await db.sequelize.query(`
            SELECT COUNT(*) as count FROM orders WHERE kitchen_status_id IS NULL
        `, { type: db.sequelize.QueryTypes.SELECT });
        console.log('Orders with NULL kitchen_status_id:', nullKitchen[0].count);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkOrders();
