
const db = require('./restaurant-backend/config/database');
async function checkIds() {
    try {
        const kitchenStatuses = await db.sequelize.query('SELECT status_id, code, name FROM kitchen_statuses', { type: db.sequelize.QueryTypes.SELECT });
        console.log('Kitchen Statuses:', JSON.stringify(kitchenStatuses, null, 2));
        
        const orderStatuses = await db.sequelize.query('SELECT status_id, code, name FROM order_statuses', { type: db.sequelize.QueryTypes.SELECT });
        console.log('Order Statuses:', JSON.stringify(orderStatuses, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkIds();
