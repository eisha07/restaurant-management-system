// Dynamic QR and session management for menu access
const express = require('express');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// In-memory session store (replace with Redis/DB for production)
const sessionStore = {};

const router = express.Router();

// GET /api/qr/menu/:tableId - Generate dynamic QR for menu access
router.get('/menu/:tableId', async (req, res) => {
  const { tableId } = req.params;
  const session_token = uuidv4();
  const timestamp = new Date().toISOString();
  const expires_in = 3600; // 1 hour

  // Store session
  sessionStore[session_token] = {
    table_id: tableId,
    created_at: timestamp,
    expires_in,
    valid: true
  };

  // Compose QR URL
  const url = `http://localhost:3000/customer?table_id=${tableId}&session_token=${session_token}&timestamp=${encodeURIComponent(timestamp)}&expires_in=${expires_in}`;
  const qrCode = await QRCode.toDataURL(url);

  res.json({
    success: true,
    data: {
      table_id: tableId,
      session_token,
      url,
      qrCode
    }
  });
});

// POST /api/qr/validate - Validate session
router.post('/validate', express.json(), (req, res) => {
  const { table_id, session_token } = req.body;
  const session = sessionStore[session_token];
  if (!session || session.table_id !== String(table_id)) {
    return res.status(400).json({ success: false, message: 'Invalid session or table.' });
  }
  // Check expiry
  const created = new Date(session.created_at);
  const now = new Date();
  if ((now - created) / 1000 > session.expires_in) {
    session.valid = false;
    return res.status(400).json({ success: false, message: 'Session expired.' });
  }
  if (!session.valid) {
    return res.status(400).json({ success: false, message: 'Session invalid.' });
  }
  res.json({ success: true, message: 'Session valid.' });
});

module.exports = router;
