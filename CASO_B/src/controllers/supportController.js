const supportService = require('../services/supportService');

class SupportController {
  /**
   * Endpoint principal: Recibe preguntas de clientes, las interpreta con IA/NLP
   * y devuelve respuestas automáticas o acciones sugeridas.
   * POST /api/support/query
   */
  async processQuery(req, res, next) {
    try {
      const { query, orderNumber } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'El campo "query" con el mensaje del cliente es requerido'
        });
      }

      const result = await supportService.handleInquiry({
        query,
        orderNumber,
        customer: req.user || null
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene la lista de tickets generados
   * GET /api/support/tickets
   */
  async getTickets(req, res, next) {
    try {
      const { status, intent } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (intent) filter.intent = intent;

      // Si es un cliente común, sólo ver sus propios tickets
      if (req.user && req.user.role === 'customer') {
        filter.customerEmail = req.user.email;
      }

      const tickets = await supportService.getTickets(filter);
      return res.json({
        success: true,
        count: tickets.length,
        data: tickets
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene el detalle de un ticket específico
   * GET /api/support/tickets/:id
   */
  async getTicketById(req, res, next) {
    try {
      const { id } = req.params;
      const ticket = await supportService.getTicketByIdOrNumber(id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: 'Ticket no encontrado'
        });
      }

      return res.json({
        success: true,
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza el estado de un ticket (agentes y admins)
   * PATCH /api/support/tickets/:id/status
   */
  async updateTicketStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['resolved_automatically', 'escalated_to_agent', 'pending_customer_input', 'closed'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`
        });
      }

      const updated = await supportService.updateTicketStatus(id, status);
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Ticket no encontrado'
        });
      }

      return res.json({
        success: true,
        message: 'Estado de ticket actualizado correctamente',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene métricas y estadísticas del sistema de atención con IA
   * GET /api/support/stats
   */
  async getStats(req, res, next) {
    try {
      const stats = await supportService.getStats();
      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SupportController();

