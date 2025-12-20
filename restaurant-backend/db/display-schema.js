#!/usr/bin/env node

/**
 * Display Database Tables and Attributes
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'restaurant_db'
});

async function displaySchema() {
    try {
        console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
        console.log('║          DATABASE SCHEMA - Tables and Attributes                       ║');
        console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

        // Get all tables
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        const tables = tablesResult.rows;
        console.log(`Total Tables: ${tables.length}\n`);

        // Get columns for each table
        for (const tableRow of tables) {
            const tableName = tableRow.table_name;

            const columnsResult = await pool.query(`
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    ordinal_position
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position
            `, [tableName]);

            const columns = columnsResult.rows;

            // Get constraints
            const constraintsResult = await pool.query(`
                SELECT 
                    tc.constraint_type,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints tc
                LEFT JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                LEFT JOIN information_schema.constraint_column_usage ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.table_schema = 'public' AND tc.table_name = $1
            `, [tableName]);

            const constraints = constraintsResult.rows;

            // Get indexes
            const indexesResult = await pool.query(`
                SELECT 
                    indexname,
                    indexdef
                FROM pg_indexes
                WHERE tablename = $1 AND schemaname = 'public'
            `, [tableName]);

            const indexes = indexesResult.rows;

            // Display table info
            console.log(`┌─ TABLE: ${tableName}`);
            console.log(`│  Columns: ${columns.length}`);
            console.log(`│`);

            columns.forEach((col, idx) => {
                const isLast = idx === columns.length - 1;
                const prefix = isLast ? '└─' : '├─';
                const nullable = col.is_nullable === 'YES' ? ' [NULL]' : '';
                const defaultVal = col.column_default ? ` [DEFAULT: ${col.column_default}]` : '';
                console.log(`│  ${prefix} ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)}${nullable}${defaultVal}`);
            });

            if (constraints.length > 0) {
                console.log(`│`);
                console.log(`│  Constraints:`);
                constraints.forEach(constr => {
                    if (constr.constraint_type === 'PRIMARY KEY') {
                        console.log(`│    🔑 PRIMARY KEY: ${constr.column_name}`);
                    } else if (constr.constraint_type === 'FOREIGN KEY') {
                        console.log(`│    🔗 FK: ${constr.column_name} → ${constr.foreign_table_name}(${constr.foreign_column_name})`);
                    } else if (constr.constraint_type === 'UNIQUE') {
                        console.log(`│    🔐 UNIQUE: ${constr.column_name}`);
                    }
                });
            }

            if (indexes.length > 0) {
                console.log(`│`);
                console.log(`│  Indexes:`);
                indexes.forEach(idx => {
                    if (!idx.indexname.includes('_pkey')) {
                        console.log(`│    📇 ${idx.indexname}`);
                    }
                });
            }

            console.log(`└\n`);
        }

        // Summary Statistics
        console.log('╔════════════════════════════════════════════════════════════════════════╗');
        console.log('║                         SCHEMA SUMMARY                                 ║');
        console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_tables,
                SUM(ARRAY_LENGTH(ARRAY_AGG(column_name), 1)) as total_columns
            FROM information_schema.columns
            WHERE table_schema = 'public'
            GROUP BY table_schema
        `);

        if (statsResult.rows.length > 0) {
            const stats = statsResult.rows[0];
            console.log(`📊 Total Tables: ${stats.total_tables}`);
            console.log(`📊 Total Columns: ${stats.total_columns}`);
        }

        // Views
        const viewsResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'VIEW'
            ORDER BY table_name
        `);

        if (viewsResult.rows.length > 0) {
            console.log(`\n📋 Views (${viewsResult.rows.length}):`);
            viewsResult.rows.forEach(view => {
                console.log(`   • ${view.table_name}`);
            });
        }

        console.log('\n✅ Schema display complete\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

displaySchema();
