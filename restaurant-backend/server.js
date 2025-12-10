const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const cors = require('cors');

// Allow frontend origin
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:3001'],
  credentials: true
}));

// Routes
app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/qr', require('./routes/qrRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});