#!/usr/bin/env node

/**
 * Update menu items to use local /images assets instead of remote placeholders.
 * Assumes the images live in /public/images and keeps URLs relative
 * (e.g. /images/chicken%20biryani.jpg).
 */

const db = require('./config/database');

const imagePath = (filename) => `/images/${encodeURIComponent(filename)}`;

const menuItemUpdates = [
  { code: 'BIRYANI', filename: 'chicken biryani.jpg' },
  { code: 'KARAHI', filename: 'chicken karahi.jpg' },
  { code: 'TIKKA', filename: 'chicken tikka.jpg' },
  { code: 'NIHARI', filename: 'beef nihari.jpg' },
  { code: 'CHANA', filename: 'chana masala.jpg' },
  { code: 'BURGER', filename: 'beef burger.jpg' },
  { code: 'FRIES', filename: 'french fries.jpg' },
  { code: 'PIZZA', filename: 'pizza margherita.jpg' },
  { code: 'WINGS', filename: 'chicken wings.jpg' },
  { code: 'SANDWICH', filename: 'club sandwich.jpg' },
  { code: 'PASTA', filename: 'pasta carbonara.jpg' },
  { code: 'SALMON', filename: 'grilled salmon.jpg' },
  { code: 'STEAK', filename: 'beef steak.jpg' },
  { code: 'SALAD', filename: 'caesar salad.jpg' },
  { code: 'RISOTTO', filename: 'mushroom risotto.jpg' },
  { code: 'COLA', filename: 'coca cola.jpg' },
  { code: 'LIME', filename: 'fresh lime soda.jpg' },
  { code: 'LASSI', filename: 'mango lassi.jpg' },
  { code: 'WATER', filename: 'mineral water.jpg' },
  { code: 'BROWNIE', filename: 'chocolate brownie.jpg' },
  { code: 'CHEESE', filename: 'cheesecake.jpg' },
  { code: 'GULAB', filename: 'gulab jamun.jpg' }
];

async function updateMenuImages() {
  try {
    console.log('🔄 Updating menu items with proper image URLs...\n');

    for (const item of menuItemUpdates) {
      const query = `
        UPDATE menu_items 
        SET image_url = $1 
        WHERE item_code = $2 
        RETURNING item_id, name, image_url
      `;

      const result = await db.sequelize.query(query, {
        bind: [imagePath(item.filename), item.code],
        type: db.sequelize.QueryTypes.UPDATE
      });

      if (result && result.length > 0) {
        console.log(`✅ Updated ${item.code}`);
      } else {
        console.log(`⚠️  No rows updated for ${item.code}`);
      }
    }

    console.log('\n✅ Menu image URLs updated successfully!');
    console.log('\nVerifying updates...\n');

    const verification = await db.sequelize.query(
      'SELECT item_id, name, image_url FROM menu_items ORDER BY item_id LIMIT 5',
      { type: db.sequelize.QueryTypes.SELECT }
    );

    console.log('Sample items after update:');
    verification.forEach(item => {
      console.log(`  • ${item.name}: ${item.image_url}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating menu:', error.message);
    process.exit(1);
  }
}

updateMenuImages();
