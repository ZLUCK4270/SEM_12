const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticateToken, optionalAuth } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

// Endpoint principal con IA/NLP (público o con token opcional)
router.post('/query', optionalAuth, supportController.processQuery);

// Métricas y estadísticas de soporte con IA (abierto o agentes/admin)
router.get('/stats', supportController.getStats);

// Gestión de tickets
router.get('/tickets', optionalAuth, supportController.getTickets);
router.get('/tickets/:id', optionalAuth, supportController.getTicketById);
router.patch('/tickets/:id/status', authenticateToken, authorizeRoles('agent', 'admin'), supportController.updateTicketStatus);

module.exports = router;

