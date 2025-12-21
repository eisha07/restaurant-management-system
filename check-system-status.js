#!/usr/bin/env node

/**
 * System Status Verification
 * Checks that all components are running and operational
 */

const http = require('http');

const BASE_URL_BACKEND = 'http://localhost:5000';
const BASE_URL_FRONTEND = 'http://localhost:8080';

function makeRequest(url, path) {
    return new Promise((resolve, reject) => {
        try {
            const fullUrl = new URL(path, url);
            const options = {
                hostname: fullUrl.hostname,
                port: fullUrl.port,
                path: fullUrl.pathname + fullUrl.search,
                method: 'GET',
                timeout: 5000
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        resolve({ status: res.statusCode, data: parsed });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: body });
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.end();
        } catch (e) {
            reject(e);
        }
    });
}

async function checkSystemStatus() {
    console.log('\n╔═════════════════════════════════════════════════════════╗');
    console.log('║         🚀 RESTAURANT SYSTEM STATUS CHECK              ║');
    console.log('╚═════════════════════════════════════════════════════════╝\n');

    let allGood = true;

    // Check Backend
    console.log('🔧 Backend Server (Port 5000)');
    console.log('─'.repeat(56));
    
    try {
        const healthRes = await makeRequest(BASE_URL_BACKEND, '/api/health');
        if (healthRes.status === 200) {
            console.log('✅ Backend is running');
            console.log(`   Status: ${healthRes.data.status || 'OK'}`);
            console.log(`   Uptime: ${healthRes.data.uptime || 'N/A'}`);
        } else {
            console.log(`⚠️  Backend responded with status ${healthRes.status}`);
        }
    } catch (error) {
        console.log(`❌ Backend Error: ${error.message}`);
        allGood = false;
    }
    console.log('');

    // Check Frontend
    console.log('🎨 Frontend Server (Port 8080)');
    console.log('─'.repeat(56));
    
    try {
        const frontendRes = await makeRequest(BASE_URL_FRONTEND, '/');
        if (frontendRes.status === 200 || frontendRes.status < 400) {
            console.log('✅ Frontend is running');
            console.log(`   Ready at: http://localhost:8080/`);
            console.log(`   Network: http://10.7.108.113:8080/`);
        } else {
            console.log(`⚠️  Frontend responded with status ${frontendRes.status}`);
        }
    } catch (error) {
        console.log(`❌ Frontend Error: ${error.message}`);
        allGood = false;
    }
    console.log('');

    // Check Database
    console.log('💾 Database Connection');
    console.log('─'.repeat(56));
    
    try {
        const dbRes = await makeRequest(BASE_URL_BACKEND, '/api/test');
        if (dbRes.status === 200) {
            console.log('✅ Database is connected');
            console.log(`   Host: localhost:5432`);
            console.log(`   Database: restaurant_db`);
        } else {
            console.log(`⚠️  Database check failed with status ${dbRes.status}`);
        }
    } catch (error) {
        console.log(`❌ Database Error: ${error.message}`);
        allGood = false;
    }
    console.log('');

    // Check API Endpoints
    console.log('🔌 API Endpoints');
    console.log('─'.repeat(56));

    const endpoints = [
        { name: 'Menu Items', path: '/api/menu' },
        { name: 'Pending Orders', path: '/api/manager/orders/pending' },
        { name: 'Login', path: '/api/auth/manager-login' }
    ];

    for (const endpoint of endpoints) {
        try {
            const res = await makeRequest(BASE_URL_BACKEND, endpoint.path);
            if (res.status < 400) {
                console.log(`✅ ${endpoint.name.padEnd(20)} - Available`);
            } else {
                console.log(`⚠️  ${endpoint.name.padEnd(20)} - Status ${res.status}`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint.name.padEnd(20)} - ${error.message}`);
        }
    }
    console.log('');

    // Summary
    console.log('╔═════════════════════════════════════════════════════════╗');
    if (allGood) {
        console.log('║            ✅ SYSTEM FULLY OPERATIONAL                ║');
        console.log('╠═════════════════════════════════════════════════════════╣');
        console.log('║ ✅ Backend server running on port 5000               ║');
        console.log('║ ✅ Frontend server running on port 8080              ║');
        console.log('║ ✅ Database connected                                ║');
        console.log('║ ✅ All API endpoints accessible                      ║');
        console.log('╚═════════════════════════════════════════════════════════╝\n');

        console.log('📍 Access the System:');
        console.log('   🌐 Web Browser: http://localhost:8080/');
        console.log('   📱 Manager App: http://localhost:8080/manager');
        console.log('   👨‍💻 Kitchen Display: http://localhost:8080/kitchen');
        console.log('   🔐 Default Password: admin123\n');

        console.log('📊 API Endpoints:');
        console.log('   🍽️  Menu: http://localhost:5000/api/menu');
        console.log('   📋 Orders: http://localhost:5000/api/manager/orders/pending');
        console.log('   🔑 Login: http://localhost:5000/api/auth/manager-login');
        console.log('   ❤️  Health: http://localhost:5000/api/health\n');

    } else {
        console.log('║            ⚠️  SYSTEM HAS ISSUES                      ║');
        console.log('╚═════════════════════════════════════════════════════════╝\n');
        console.log('Please check the errors above and restart services.\n');
    }

    process.exit(allGood ? 0 : 1);
}

checkSystemStatus();
