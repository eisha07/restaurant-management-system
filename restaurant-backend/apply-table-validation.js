#!/usr/bin/env node

/**
 * Apply table validation constraints to database
 */

const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function applyTableValidation() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║       🔒 APPLYING TABLE NUMBER VALIDATION             ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Read the SQL migration file
        const migrationPath = path.join(__dirname, 'db', 'add-table-validation.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Executing migration...\n');

        // Execute the migration
        await db.sequelize.query(sql);

        console.log('\n✅ Table validation constraints applied successfully!');
        console.log('\nConstraints added:');
        console.log('  • CHECK constraint: table_number must be 1-22');
        console.log('  • Trigger: validate_table_number');
        console.log('  • Trigger: validate_order_table_id');
        console.log('\n✓ All tables can now only have numbers 1-22');
        console.log('✓ Invalid values will be rejected at database level\n');

    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('ℹ️  Constraints already applied (or partially applied)');
            console.log('Checking current state...\n');
            
            // Check current table ranges
            const tables = await db.sequelize.query(`
                SELECT COUNT(*) as total, 
                       MIN(CAST(table_number AS INTEGER)) as min_table,
                       MAX(CAST(table_number AS INTEGER)) as max_table
                FROM restaurant_tables
            `, { type: db.sequelize.QueryTypes.SELECT });

            if (tables[0]) {
                console.log(`Current tables: ${tables[0].total}`);
                console.log(`Range: ${tables[0].min_table || 'N/A'} to ${tables[0].max_table || 'N/A'}`);
            }
        } else {
            console.error('❌ Error applying constraints:', error.message);
            if (error.original) {
                console.error('   Details:', error.original.message);
            }
        }
    }

    process.exit(0);
}

applyTableValidation();
