#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');

const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;

async function checkMenuCategories() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'menu_categories' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 menu_categories columns:');
    cols.rows.forEach(r => {
      console.log(`   - ${r.column_name} (${r.data_type})`);
    });
    
    const data = await client.query('SELECT * FROM menu_categories LIMIT 3');
    console.log(`\n📊 Sample data (${data.rows.length} rows):`);
    data.rows.forEach(r => console.log('   ', JSON.stringify(r)));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkMenuCategories();
