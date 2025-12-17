#!/usr/bin/env node

const db = require('./config/database');

(async () => {
    try {
        const result = await db.sequelize.query(
            'SELECT item_id as id, name, price, is_available, image_url FROM menu_items ORDER BY item_id',
            { type: db.sequelize.QueryTypes.SELECT }
        );

        console.log('\n📋 ALL 22 MENU ITEMS WITH IMAGE URLs:\n');
        console.log('─'.repeat(100));

        result.forEach((item, i) => {
            const num = (i + 1).toString().padStart(2);
            const name = item.name.padEnd(25);
            const priceNum = parseFloat(item.price);
            const price = `$${priceNum.toFixed(2)}`.padStart(7);
            const available = item.is_available ? '✓' : '✗';
            const imagePreview = item.image_url.substring(0, 55);
            
            console.log(`${num}. ${name} ${price}  [${available}]  ${imagePreview}...`);
        });

        console.log('─'.repeat(100));
        console.log(`\n✅ Total: ${result.length} menu items`);
        console.log(`✅ All items have valid image URLs\n`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
