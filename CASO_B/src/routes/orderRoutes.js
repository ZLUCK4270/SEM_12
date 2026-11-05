const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

// Consulta pública de orden por código de rastreo o número de orden
router.get('/track/:orderNumber', orderController.trackOrder);

// Pedidos del cliente logueado
router.get('/my-orders', authenticateToken, orderController.listCustomerOrders);

// Lista completa de órdenes (sólo agentes o administradores)
router.get('/', authenticateToken, authorizeRoles('agent', 'admin'), orderController.listAllOrders);

module.exports = router;

