const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/status', authController.getStatus);

// Rutas protegidas por JWT
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;

