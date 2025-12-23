const http = require('http');

console.log('Testing backend connection...');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/db/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log('✅ Got response! Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { 
    console.log('Response:', data);
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Request timeout');
  req.destroy();
  process.exit(1);
});

req.end();
