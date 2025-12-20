const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { sequelize, QueryTypes } = require('sequelize');

// GET /api/qr/table/:number - Generate QR for table
router.get('/table/:number', async (req, res) => {
  try {
    const { number } = req.params;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const qrData = `${baseUrl}/order?table=${number}`;
    
    const qrCode = await QRCode.toDataURL(qrData);
    res.json({ success: true, qrCode, tableNumber: number, url: qrData });
  } catch (error) {
    console.error('Error generating table QR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/qr/order/:id - Generate QR for order
router.get('/order/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const qrData = `${baseUrl}/order-status?order=${id}`;
    
    const qrCode = await QRCode.toDataURL(qrData);
    res.json({ success: true, qrCode, orderId: id, url: qrData });
  } catch (error) {
    console.error('Error generating order QR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
