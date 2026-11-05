const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const supportRoutes = require('./supportRoutes');
const orderRoutes = require('./orderRoutes');

router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'API Inteligente para Soporte al Cliente - E-Commerce',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

router.use('/auth', authRoutes);
router.use('/support', supportRoutes);
router.use('/orders', orderRoutes);

module.exports = router;

