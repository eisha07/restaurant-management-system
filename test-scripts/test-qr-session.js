const axios = require('axios');
const assert = require('assert');

async function testQrSessionEndpoint() {
  const baseUrls = [
    'http://localhost:5002/api/qr/session',
    'http://localhost:5000/api/qr/session',
    'http://localhost:5001/api/qr/session'
  ];
  let response;
  let urlUsed;
  for (const url of baseUrls) {
    try {
      response = await axios.get(url);
      urlUsed = url;
      break;
    } catch (e) {
      // Try next port
    }
  }
  if (!response) {
    throw new Error('QR session endpoint not reachable on any known port');
  }
  const data = response.data;
  assert(data.success === true, 'Response success should be true');
  assert(data.data, 'Response should have data property');
  assert(typeof data.data.qrCode === 'string', 'qrCode should be a string');
  assert(data.data.qrCode.startsWith('data:image/png;base64,'), 'qrCode should be a base64 PNG');
  assert(typeof data.data.url === 'string', 'url should be a string');
  assert(data.data.url.includes('sessionId='), 'url should contain sessionId');
  assert(typeof data.data.sessionId === 'string', 'sessionId should be a string');
  console.log('✅ QR session endpoint test passed on', urlUsed);
}

testQrSessionEndpoint().catch(err => {
  console.error('❌ QR session endpoint test failed:', err.message);
  process.exit(1);
});
