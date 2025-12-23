#!/usr/bin/env node

/**
 * Database Setup Script - Complete Normalized Schema (3NF)
 * This script creates and populates the entire database schema
 * Run: node db-setup-script.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'restaurant_db'
};

const schemaPath = path.join(__dirname, 'schema-3nf.sql');
const seedPath = path.join(__dirname, 'seed-data-3nf.sql');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║       Restaurant Management System - DB Setup Script       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Validate files exist
if (!fs.existsSync(schemaPath)) {
    console.error('❌ Error: schema-3nf.sql not found');
    process.exit(1);
}

if (!fs.existsSync(seedPath)) {
    console.error('❌ Error: seed-data-3nf.sql not found');
    process.exit(1);
}

console.log('📋 Database Configuration:');
console.log(`   Host: ${dbConfig.host}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   Username: ${dbConfig.username}`);
console.log(`   Database: ${dbConfig.database}`);
console.log();

// Function to execute SQL file
const executeSQLFile = (filePath, description) => {
    return new Promise((resolve, reject) => {
        console.log(`${description}...`);

        // Build psql command
        const cmd = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f "${filePath}"`;

        const child = exec(cmd, { 
            env: { ...process.env, PGPASSWORD: dbConfig.password }
        }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                if (stderr) console.error(`   ${stderr}`);
                reject(error);
            } else {
                console.log(`Complete`);
                if (stdout && stdout.includes('DATA POPULATION')) {
                    console.log(stdout);
                }
                resolve();
            }
        });

        child.on('error', reject);
    });
};

// Function to test database connection
const testConnection = () => {
    return new Promise((resolve, reject) => {
        console.log('🔌 Testing database connection...');

        const cmd = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -c "SELECT version();"`;

        const child = exec(cmd, { 
            env: { ...process.env, PGPASSWORD: dbConfig.password }
        }, (error, stdout, stderr) => {
            if (error) {
                console.error('Connection failed');
                console.error(`   Error: ${error.message}`);
                reject(error);
            } else {
                console.log('Connection successful');
                resolve();
            }
        });

        child.on('error', reject);
    });
};

// Function to get schema statistics
const getStatistics = () => {
    return new Promise((resolve, reject) => {
        const queries = [
            'SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\';',
            'SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname = \'public\';',
            'SELECT COUNT(*) FROM menu_items;',
            'SELECT COUNT(*) FROM orders;',
            'SELECT COUNT(*) FROM customers;',
            'SELECT COUNT(*) FROM managers;'
        ];

        const cmd = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -c "
            ${queries.map(q => `${q}`).join('\\n')}
        "`;

        const child = exec(cmd, { 
            env: { ...process.env, PGPASSWORD: dbConfig.password }
        }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });

        child.on('error', reject);
    });
};

// Main execution
(async () => {
    try {
        // Test connection first
        await testConnection();
        console.log();

        // Create schema
        await executeSQLFile(schemaPath, 'Creating database schema (3NF)');
        console.log();

        // Seed data
        await executeSQLFile(seedPath, 'Populating sample data');
        console.log();

        // Get statistics
        console.log('Database Statistics:');
        const stats = await getStatistics();
        console.log(stats);

        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                   Setup Complete!                        ║');
        console.log('║                                                            ║');
        console.log('║  The normalized schema is now ready to use.                ║');
        console.log('║  Start your backend server with: npm test              ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        process.exit(0);
    } catch (error) {
        console.error('\nSetup failed. Please check the error above.');
        console.error('   Make sure PostgreSQL is running and credentials are correct.');
        process.exit(1);
    }
})();
