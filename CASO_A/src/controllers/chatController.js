const db = require('../config/db');
const { interpretCustomerQuestion } = require('../services/nlpService');

// Crear una nueva conversación
exports.createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title = 'Consulta de cliente' } = req.body;

    const [result] = await db.execute(
      'INSERT INTO conversations (user_id, title) VALUES (?, ?)',
      [userId, title]
    );

    res.status(201).json({
      message: 'Conversación creada exitosamente',
      conversation: {
        id: result.insertId,
        user_id: userId,
        title,
        status: 'open'
      }
    });
  } catch (error) {
    console.error('Error al crear conversación:', error);
    res.status(500).json({ message: 'Error interno al crear conversación' });
  }
};

// Listar conversaciones del usuario autenticado
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.execute(
      'SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json({ message: 'Error al consultar conversaciones' });
  }
};

// Obtener mensajes de una conversación
exports.getMessages = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId, 10);
    const userId = req.user.id;

    // Verificar pertenencia de la conversación
    const [convRows] = await db.execute(
      'SELECT id, user_id FROM conversations WHERE id = ?',
      [conversationId]
    );

    if (!convRows || convRows.length === 0) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    if (convRows[0].user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No tienes acceso a esta conversación' });
    }

    const [messages] = await db.execute(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ message: 'Error al consultar historial de mensajes' });
  }
};

/**
 * Endpoint principal: Recibe la pregunta del cliente,
 * la procesa con IA/NLP y devuelve la respuesta con acción sugerida
 */
exports.askQuestion = async (req, res) => {
  try {
    const userId = req.user.id;
    let { question, conversationId } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ message: 'La pregunta no puede estar vacía' });
    }

    // Si no se envió conversationId, crear una conversación automática
    if (!conversationId) {
      const title = question.slice(0, 40) + (question.length > 40 ? '...' : '');
      const [convResult] = await db.execute(
        'INSERT INTO conversations (user_id, title) VALUES (?, ?)',
        [userId, title]
      );
      conversationId = convResult.insertId;
    }

    // 1. Guardar la pregunta del cliente en MySQL
    const [userMsgResult] = await db.execute(
      'INSERT INTO messages (conversation_id, sender, content) VALUES (?, ?, ?)',
      [conversationId, 'user', question.trim()]
    );

    // 2. Procesar con el motor IA / NLP
    const aiAnalysis = await interpretCustomerQuestion(question.trim());

    // 3. Guardar la respuesta de la IA en MySQL
    const [aiMsgResult] = await db.execute(
      'INSERT INTO messages (conversation_id, sender, content) VALUES (?, ?, ?)',
      [conversationId, 'ai', aiAnalysis.answer]
    );

    // 4. Guardar la acción sugerida y la intención clasificada en la tabla ai_actions
    let actionId = null;
    if (aiAnalysis.suggested_action) {
      const [actionResult] = await db.execute(
        'INSERT INTO ai_actions (message_id, intent, confidence, suggested_action) VALUES (?, ?, ?, ?)',
        [
          aiMsgResult.insertId,
          aiAnalysis.intent,
          aiAnalysis.confidence,
          JSON.stringify(aiAnalysis.suggested_action)
        ]
      );
      actionId = actionResult.insertId;
    }

    // 5. Responder al cliente con el payload completo
    res.status(200).json({
      conversation_id: conversationId,
      user_message_id: userMsgResult.insertId,
      ai_message_id: aiMsgResult.insertId,
      answer: aiAnalysis.answer,
      intent: aiAnalysis.intent,
      confidence: aiAnalysis.confidence,
      entities: aiAnalysis.entities,
      suggested_action: aiAnalysis.suggested_action ? {
        id: actionId,
        ...aiAnalysis.suggested_action
      } : null
    });

  } catch (error) {
    console.error('Error al procesar pregunta con IA:', error);
    res.status(500).json({ message: 'Error interno al procesar la pregunta', error: error.message });
  }
};

// Confirmar o ejecutar una acción sugerida
exports.executeAction = async (req, res) => {
  try {
    const actionId = parseInt(req.params.actionId, 10);

    const [result] = await db.execute(
      'UPDATE ai_actions SET executed = true WHERE id = ?',
      [actionId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Acción no encontrada' });
    }

    res.status(200).json({
      message: 'Acción ejecutada y confirmada exitosamente',
      action_id: actionId,
      status: 'executed'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al ejecutar acción', error: error.message });
  }
};

