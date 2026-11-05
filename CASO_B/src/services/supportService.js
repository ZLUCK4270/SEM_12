const nlpService = require('./nlpService');
const orderService = require('./orderService');
const { TicketRepository } = require('../models/Ticket');
const config = require('../config/env');

class SupportService {
  /**
   * Procesa la consulta del cliente utilizando IA/NLP, consulta base de datos
   * y genera la respuesta automática junto a las acciones sugeridas.
   */
  async handleInquiry({ query, orderNumber = null, customer = null }) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new Error('La consulta (query) es obligatoria y no puede estar vacía');
    }

    // 1. Extraer entidades preliminares
    const preliminaryEntities = nlpService.extractEntities(query);
    const targetOrderNumber = orderNumber || preliminaryEntities.orderNumber;

    // 2. Si hay número de orden identificado, consultar la base de datos
    let orderDetails = null;
    if (targetOrderNumber) {
      orderDetails = await orderService.getOrderByNumber(targetOrderNumber);
    } else if (customer && customer.email) {
      // Si el cliente está autenticado y no mencionó número de orden, buscar su pedido más reciente
      const customerOrders = await orderService.getOrdersByEmail(customer.email);
      if (customerOrders && customerOrders.length > 0) {
        orderDetails = customerOrders[0];
      }
    }

    // 3. Procesar NLP con contexto de la orden si existe
    const nlpResult = await nlpService.processQuery(query, orderDetails);

    // 4. Determinar estado inicial del ticket
    let ticketStatus = 'resolved_automatically';
    if (nlpResult.intent === 'human_handoff' || nlpResult.sentiment.label === 'urgent' || nlpResult.confidence < config.AI_CONFIDENCE_THRESHOLD) {
      ticketStatus = 'escalated_to_agent';
    } else if (nlpResult.suggestedAction.type === 'REQUEST_ORDER_NUMBER') {
      ticketStatus = 'pending_customer_input';
    }

    // 5. Registrar el ticket en la base de datos para trazabilidad y analítica
    const ticketRecord = await TicketRepository.create({
      customerEmail: (customer && customer.email) || preliminaryEntities.email || 'anonimo@ecommerce.com',
      customerName: (customer && customer.name) || 'Cliente',
      originalQuery: query,
      intent: nlpResult.intent,
      confidence: nlpResult.confidence,
      sentiment: nlpResult.sentiment,
      extractedEntities: {
        orderNumber: targetOrderNumber || (orderDetails && orderDetails.orderNumber) || null,
        detectedKeywords: nlpResult.entities.detectedKeywords
      },
      suggestedAction: nlpResult.suggestedAction,
      automatedResponse: nlpResult.automatedResponse,
      status: ticketStatus
    });

    return {
      success: true,
      data: {
        ticket: {
          id: ticketRecord._id,
          ticketNumber: ticketRecord.ticketNumber,
          status: ticketRecord.status,
          createdAt: ticketRecord.createdAt
        },
        nlpInterpretation: {
          intent: nlpResult.intent,
          confidence: nlpResult.confidence,
          sentiment: nlpResult.sentiment,
          entitiesExtracted: nlpResult.entities
        },
        orderInfo: orderDetails ? {
          orderNumber: orderDetails.orderNumber,
          status: orderDetails.status,
          currentLocation: orderDetails.currentLocation,
          carrier: orderDetails.carrier,
          estimatedDelivery: orderDetails.estimatedDelivery,
          items: orderDetails.items
        } : null,
        suggestedAction: nlpResult.suggestedAction,
        automatedResponse: nlpResult.automatedResponse
      }
    };
  }

  async getTickets(filter = {}) {
    return TicketRepository.list(filter);
  }

  async getTicketByIdOrNumber(idOrNumber) {
    return TicketRepository.findByTicketNumber(idOrNumber) || TicketRepository.findById(idOrNumber);
  }

  async updateTicketStatus(idOrNumber, status) {
    return TicketRepository.updateStatus(idOrNumber, status);
  }

  async getStats() {
    return TicketRepository.getStatistics();
  }
}

module.exports = new SupportService();

