#!/usr/bin/env node

/**
 * Update menu items with proper placeholder URLs
 */

const db = require('./config/database');

const menuItemUpdates = [
  { code: 'BIRYANI', url: 'https://via.placeholder.com/800x600/FF6B6B/FFFFFF?text=Chicken+Biryani' },
  { code: 'KARAHI', url: 'https://via.placeholder.com/800x600/4ECDC4/FFFFFF?text=Chicken+Karahi' },
  { code: 'TIKKA', url: 'https://via.placeholder.com/800x600/FFD93D/FFFFFF?text=Chicken+Tikka' },
  { code: 'NIHARI', url: 'https://via.placeholder.com/800x600/F72585/FFFFFF?text=Beef+Nihari' },
  { code: 'CHANA', url: 'https://via.placeholder.com/800x600/95E1D3/333333?text=Chana+Masala' },
  { code: 'BURGER', url: 'https://via.placeholder.com/800x600/F38181/FFFFFF?text=Beef+Burger' },
  { code: 'FRIES', url: 'https://via.placeholder.com/800x600/FCE38A/333333?text=French+Fries' },
  { code: 'PIZZA', url: 'https://via.placeholder.com/800x600/95E1D3/FFFFFF?text=Pizza+Margherita' },
  { code: 'WINGS', url: 'https://via.placeholder.com/800x600/E7717D/FFFFFF?text=Chicken+Wings' },
  { code: 'SANDWICH', url: 'https://via.placeholder.com/800x600/C2BBF0/FFFFFF?text=Club+Sandwich' },
  { code: 'PASTA', url: 'https://via.placeholder.com/800x600/FFC75F/FFFFFF?text=Pasta+Carbonara' },
  { code: 'SALMON', url: 'https://via.placeholder.com/800x600/F08A5D/FFFFFF?text=Grilled+Salmon' },
  { code: 'STEAK', url: 'https://via.placeholder.com/800x600/B83B5E/FFFFFF?text=Beef+Steak' },
  { code: 'SALAD', url: 'https://via.placeholder.com/800x600/6A994E/FFFFFF?text=Caesar+Salad' },
  { code: 'RISOTTO', url: 'https://via.placeholder.com/800x600/BC4749/FFFFFF?text=Mushroom+Risotto' },
  { code: 'COLA', url: 'https://via.placeholder.com/800x600/D62828/FFFFFF?text=Coca-Cola' },
  { code: 'LIME', url: 'https://via.placeholder.com/800x600/80ED99/333333?text=Fresh+Lime+Soda' },
  { code: 'LASSI', url: 'https://via.placeholder.com/800x600/FAA307/FFFFFF?text=Mango+Lassi' },
  { code: 'WATER', url: 'https://via.placeholder.com/800x600/06AED5/FFFFFF?text=Mineral+Water' },
  { code: 'BROWNIE', url: 'https://via.placeholder.com/800x600/6F4C3E/FFFFFF?text=Chocolate+Brownie' },
  { code: 'CHEESE', url: 'https://via.placeholder.com/800x600/FFE5B4/333333?text=Cheesecake' },
  { code: 'GULAB', url: 'https://via.placeholder.com/800x600/FF8C42/FFFFFF?text=Gulab+Jamun' }
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
        bind: [item.url, item.code],
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
      console.log(`  • ${item.name}: ${item.image_url.substring(0, 80)}...`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating menu:', error.message);
    process.exit(1);
  }
}

updateMenuImages();
