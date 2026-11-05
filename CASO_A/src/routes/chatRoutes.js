const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas las rutas de chat requieren Token JWT
router.use(authMiddleware);

router.post('/ask', chatController.askQuestion);
router.post('/conversations', chatController.createConversation);
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/actions/:actionId/execute', chatController.executeAction);

module.exports = router;

