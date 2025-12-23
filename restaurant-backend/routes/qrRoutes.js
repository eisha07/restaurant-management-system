// routes/qrRoutes.js - UPDATED VERSION
const express = require('express');
const router = express.Router();

let QRCode;
try {
    QRCode = require('qrcode');
} catch (error) {
    console.warn('⚠️ QRCode module not installed. Install with: npm install qrcode');
    QRCode = null;
}

// GET /api/qr/table/:tableNumber - Generate table QR
router.get('/table/:tableNumber', async (req, res) => {
    try {
        const { tableNumber } = req.params;
        
        if (!QRCode) {
            return res.status(501).json({
                success: false,
                message: 'QR Code functionality not available. Install qrcode package.',
                instructions: 'Run: npm install qrcode'
            });
        }
        
        const url = `http://localhost:3000/table/${tableNumber}`;
        
        // Generate QR code as data URL
        const qrCode = await QRCode.toDataURL(url);
        
        res.json({
            success: true,
            data: {
                tableNumber,
                url,
                qrCode // Base64 encoded QR image
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Failed to generate QR code'
        });
    }
});

// GET /api/qr/session - Generate a unique QR code for a new customer session
router.get('/session', async (req, res) => {
    try {
        if (!QRCode) {
            return res.status(501).json({
                success: false,
                message: 'QR Code functionality not available. Install qrcode package.',
                instructions: 'Run: npm install qrcode'
            });
        }
        // Generate a unique session ID
        const sessionId = `customer-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        // The URL the QR code will point to (customer landing page with session)
        const url = `/customer?sessionId=${sessionId}`;
        // Generate QR code as data URL
        const qrCode = await QRCode.toDataURL(url);
        res.json({
            success: true,
            data: {
                sessionId,
                url,
                qrCode
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to generate session QR code'
        });
    }
});

// Simple test route
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'QR Routes are working',
        qrCodeAvailable: !!QRCode
    });
});

module.exports = router;