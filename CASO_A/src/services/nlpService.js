/**
 * Servicio de IA y Procesamiento de Lenguaje Natural (NLP)
 * - Clasificación de Intenciones (Intent Classification)
 * - Extracción de Entidades (Entity Extraction)
 * - Cálculo de Confianza (Confidence Score)
 * - Generación de Respuesta y Acciones Sugeridas Estructuradas
 */

// Intenciones reconocidas y sus palabras clave
const INTENT_TAXONOMY = [
  {
    intent: 'TRACK_ORDER',
    keywords: ['pedido', 'orden', 'rastrear', 'envio', 'dónde está', 'entrega', 'paquete', 'guia', 'llegar', 'tracking'],
    generate: (text, entities) => {
      const orderNum = entities.orderNumber || '#10492';
      return {
        answer: `Tu pedido ${orderNum} se encuentra actualmente en tránsito con la transportadora y la entrega está estimada para las próximas 24 a 48 horas hábiles.`,
        suggested_action: {
          action_type: 'VIEW_TRACKING_DETAILS',
          label: 'Ver Mapa de Seguimiento',
          payload: { order_id: orderNum, carrier: 'Servientrega / DHL', tracking_url: `https://tracking.example.com/${orderNum}` }
        }
      };
    }
  },
  {
    intent: 'REFUND_REQUEST',
    keywords: ['devolucion', 'devolver', 'reembolso', 'devolución', 'plata', 'dinero de vuelta', 'garantia', 'garantía', 'cancelar compra'],
    generate: (text, entities) => {
      return {
        answer: 'Lamentamos los inconvenientes. Puedes solicitar la devolución sin costo dentro de los 30 días posteriores a la recepción de tu producto.',
        suggested_action: {
          action_type: 'CREATE_REFUND_TICKET',
          label: 'Iniciar Solicitud de Reembolso',
          payload: { category: 'DEVOLUCION_CLIENTE', priority: 'ALTA' }
        }
      };
    }
  },
  {
    intent: 'PAYMENT_ISSUE',
    keywords: ['pago', 'tarjeta', 'factura', 'cobro', 'rechazado', 'error de pago', 'transferencia', 'boleta'],
    generate: (text, entities) => {
      return {
        answer: 'Detectamos que tu consulta se relaciona con la pasarela de pagos o facturación. Te sugerimos verificar que tu tarjeta tenga compras por internet activas o reintentar con otro método.',
        suggested_action: {
          action_type: 'RETRY_PAYMENT',
          label: 'Reintentar Pago / Cambiar Método',
          payload: { redirect_url: '/checkout/payment-methods' }
        }
      };
    }
  },
  {
    intent: 'TECH_SUPPORT',
    keywords: ['no funciona', 'error', 'falla', 'roto', 'problema tecnico', 'técnico', 'ayuda con el producto', 'clave', 'contraseña'],
    generate: (text, entities) => {
      return {
        answer: 'Para solucionar fallas comunes, asegúrate de reiniciar el equipo y comprobar que tienes la versión de software más reciente.',
        suggested_action: {
          action_type: 'OPEN_TECH_TICKET',
          label: 'Abrir Caso con Soporte Técnico',
          payload: { queue: 'SOPORTE_N1', SLA_hours: 4 }
        }
      };
    }
  },
  {
    intent: 'TALK_TO_AGENT',
    keywords: ['humano', 'asesor', 'persona', 'agente', 'hablar con alguien', 'operador', 'representante'],
    generate: (text, entities) => {
      return {
        answer: 'Entendido. En este momento te podemos transferir con un asesor humano disponible en nuestra línea de atención prioritaria.',
        suggested_action: {
          action_type: 'ESCALATE_TO_AGENT',
          label: 'Transferir a un Asesor Humano',
          payload: { department: 'Atención al Cliente', estimated_wait_minutes: 2 }
        }
      };
    }
  },
  {
    intent: 'GREETING',
    keywords: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos', 'que tal', 'hey'],
    generate: (text, entities) => {
      return {
        answer: '¡Hola! Soy tu asistente virtual con Inteligencia Artificial. ¿En qué puedo ayudarte hoy? Puedes consultarme sobre tus pedidos, reembolsos, pagos o soporte técnico.',
        suggested_action: {
          action_type: 'SHOW_QUICK_OPTIONS',
          label: 'Ver Menú de Ayuda',
          payload: { options: ['Rastrear mi pedido', 'Pedir un reembolso', 'Hablar con un asesor'] }
        }
      };
    }
  }
];

// Extractor simple de entidades (números de orden, emails, etc.)
function extractEntities(text) {
  const entities = {};

  // Buscar número de orden (#12345 o 123456)
  const orderMatch = text.match(/(?:#|orden|pedido\s*(?:n[°º]|num|numero)?\s*)([A-Z0-9-]{4,10})/i);
  if (orderMatch) {
    entities.orderNumber = orderMatch[1].startsWith('#') ? orderMatch[1] : `#${orderMatch[1]}`;
  }

  // Buscar email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    entities.email = emailMatch[0];
  }

  return entities;
}

/**
 * Función principal para procesar una pregunta de cliente
 */
async function interpretCustomerQuestion(question, context = {}) {
  const cleanText = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const entities = extractEntities(question);

  let bestMatch = null;
  let highestScore = 0;

  for (const item of INTENT_TAXONOMY) {
    let matches = 0;
    for (const keyword of item.keywords) {
      const cleanKeyword = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (cleanText.includes(cleanKeyword)) {
        matches++;
      }
    }

    if (matches > 0) {
      const score = Math.min(0.70 + (matches * 0.1), 0.98);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }
  }

  // Si encontramos una coincidencia con suficiente certeza
  if (bestMatch && highestScore >= 0.70) {
    const outcome = bestMatch.generate(question, entities);
    return {
      answer: outcome.answer,
      intent: bestMatch.intent,
      confidence: parseFloat(highestScore.toFixed(2)),
      entities,
      suggested_action: outcome.suggested_action
    };
  }

  // Si no coincide con ninguna intención específica: Intención General / FAQ
  return {
    answer: 'He recibido tu consulta. Para darte la mejor asistencia, ¿podrías indicarme si se trata de un pedido, una devolución, un pago o soporte técnico?',
    intent: 'GENERAL_INQUIRY',
    confidence: 0.55,
    entities,
    suggested_action: {
      action_type: 'ESCALATE_TO_AGENT',
      label: 'Conectar con un Asesor Especializado',
      payload: { reason: 'Consulta no categorizada', query: question }
    }
  };
}

module.exports = {
  interpretCustomerQuestion,
  INTENT_TAXONOMY
};

