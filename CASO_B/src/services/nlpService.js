/**
 * Servicio de Procesamiento de Lenguaje Natural (NLP) e Inteligencia Artificial
 * Especializado en Atención al Cliente para E-commerce
 */

// Diccionario de lemas y raíces en español para e-commerce
const SPANISH_STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero', 
  'de', 'del', 'a', 'al', 'en', 'para', 'por', 'con', 'mi', 'mis', 'tu', 'tus', 'su', 'sus'
]);

// Corpus de entrenamiento por intención
const INTENT_CORPUS = {
  order_tracking: [
    'donde esta mi pedido',
    'donde viene mi paquete',
    'rastrear mi compra',
    'estado de mi envio',
    'cuando llega mi paquete',
    'no llega mi pedido',
    'seguimiento de orden',
    'ver estatus de entrega',
    'localizar mi compra',
    'informacion de mi paquete',
    'donde se encuentra mi envio',
    'tardo mucho mi pedido',
    'quiero saber por donde viene mi pedido'
  ],
  order_return: [
    'quiero devolver un producto',
    'solicito devolucion de compra',
    'quiero mi reembolso de dinero',
    'como devolver un articulo',
    'no me gusto el producto y quiero cambiarlo',
    'proceso para devoluciones',
    'hacer un cambio o garantia',
    'regresar paquete',
    'politica de devolucion',
    'me arrepenti de la compra y deseo devolverla'
  ],
  product_issue: [
    'no funciona mi compra',
    'mi producto llego danado',
    'vino roto el paquete',
    'el articulo no prende o no enciende',
    'esta defectuoso mi producto',
    'falla tecnica con lo que compre',
    'no prende la pantalla ni responde',
    'vino incompleto el pedido',
    'calidad muy mala, viene averiado',
    'el equipo presenta problemas de funcionamiento'
  ],
  order_cancellation: [
    'quiero cancelar mi pedido',
    'anular la orden de compra',
    'cancelar mi compra de inmediato',
    'me equivoque al comprar y deseo cancelar',
    'dar de baja el pedido'
  ],
  shipping_info: [
    'cuanto demora el envio',
    'costo de flete o transporte',
    'hacen envios a todo el pais',
    'cuales son los tiempos de entrega',
    'horarios de entrega de paquetes'
  ],
  human_handoff: [
    'quiero hablar con un asesor humano',
    'pasame con una persona real',
    'necesito atencion de un agente',
    'hablar con un representante de soporte',
    'no quiero hablar con un bot o maquina'
  ]
};

// Diccionario de sentimiento y urgencia
const SENTIMENT_LEXICON = {
  negative: [
    'pesimo', 'horrible', 'estafa', 'ladrones', 'robo', 'enojado', 'molesto', 
    'basura', 'inaceptable', 'engano', 'demanda', 'abogado', 'fraude', 'peor'
  ],
  urgent: [
    'urgente', 'inmediato', 'emergencia', 'ya mismo', 'hoy mismo', 'desesperado', 'rapido'
  ],
  positive: [
    'gracias', 'excelente', 'perfecto', 'bueno', 'amable', 'felicitaciones', 'genial'
  ]
};

class NLPService {
  /**
   * Normaliza texto: minúsculas, remoción de tildes y caracteres especiales
   */
  normalizeText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quita acentos (ó -> o, á -> a)
      .replace(/[^\w\s#\-]/gi, ' ')     // Conserva hashes para IDs
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extrae tokens significativos filtrando stopwords
   */
  tokenize(text) {
    const normalized = this.normalizeText(text);
    return normalized
      .split(' ')
      .filter(w => w.length > 1 && !SPANISH_STOPWORDS.has(w));
  }

  /**
   * Extracción de Entidades Nombradas (NER): Código de pedido, email, etc.
   */
  extractEntities(rawText) {
    const text = rawText || '';
    const entities = {
      orderNumber: null,
      email: null,
      detectedKeywords: []
    };

    // 1. Detección de Código de Pedido (ej: #PED-1001, PED-1001, PED1001, #1001, 1001, etc.)
    const orderMatch = text.match(/(?:#|orden\s*|pedido\s*|ped-?|guia\s*)?([A-Za-z]{0,4}-?\d{3,8})\b/i);
    // Filtrar si es solo una palabra común
    if (orderMatch && orderMatch[1]) {
      const candidate = orderMatch[1].toUpperCase();
      // Si tiene dígitos
      if (/\d+/.test(candidate)) {
        entities.orderNumber = candidate.startsWith('#') ? candidate : `#${candidate}`;
      }
    }

    // 2. Detección de correo electrónico
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      entities.email = emailMatch[0].toLowerCase();
    }

    // 3. Palabras clave de producto
    const productKeywords = ['pantalla', 'telefono', 'celular', 'laptop', 'computadora', 'ropa', 'zapatos', 'bateria', 'cargador'];
    const lowerText = text.toLowerCase();
    for (const kw of productKeywords) {
      if (lowerText.includes(kw)) {
        entities.detectedKeywords.push(kw);
      }
    }

    return entities;
  }

  /**
   * Análisis de Sentimiento y Nivel de Urgencia
   */
  analyzeSentiment(text) {
    const normalized = this.normalizeText(text);
    const tokens = normalized.split(' ');

    let score = 0;
    let isUrgent = false;

    tokens.forEach(token => {
      if (SENTIMENT_LEXICON.negative.includes(token)) score -= 2;
      if (SENTIMENT_LEXICON.urgent.includes(token)) {
        score -= 1;
        isUrgent = true;
      }
      if (SENTIMENT_LEXICON.positive.includes(token)) score += 2;
    });

    let label = 'neutral';
    if (isUrgent || score <= -3) {
      label = isUrgent ? 'urgent' : 'negative';
    } else if (score < 0) {
      label = 'negative';
    } else if (score > 0) {
      label = 'positive';
    }

    return { score, label, isUrgent };
  }

  /**
   * Calcula similitud entre dos conjuntos de tokens usando Cosine Similarity ponderado por longitud
   */
  calculateSimilarity(queryTokens, sampleTokens) {
    if (!queryTokens.length || !sampleTokens.length) return 0;

    const querySet = new Set(queryTokens);
    let commonCount = 0;

    for (const token of sampleTokens) {
      if (querySet.has(token)) {
        commonCount += 1;
      } else {
        // Coincidencia por subcadena / raíz mínima
        for (const qToken of queryTokens) {
          if (qToken.length > 4 && token.length > 4) {
            if (qToken.startsWith(token.slice(0, 4)) || token.startsWith(qToken.slice(0, 4))) {
              commonCount += 0.7;
              break;
            }
          }
        }
      }
    }

    const similarity = commonCount / Math.sqrt(queryTokens.length * sampleTokens.length);
    return Math.min(1.0, similarity);
  }

  /**
   * Clasifica la intención de la consulta del cliente
   */
  classifyIntent(queryText) {
    const queryTokens = this.tokenize(queryText);
    const scores = {};

    let bestIntent = 'general_inquiry';
    let highestConfidence = 0.0;

    for (const [intent, samples] of Object.entries(INTENT_CORPUS)) {
      let maxIntentScore = 0;

      for (const sample of samples) {
        const sampleTokens = this.tokenize(sample);
        const score = this.calculateSimilarity(queryTokens, sampleTokens);
        if (score > maxIntentScore) {
          maxIntentScore = score;
        }
      }

      scores[intent] = Number(maxIntentScore.toFixed(3));

      if (maxIntentScore > highestConfidence) {
        highestConfidence = maxIntentScore;
        bestIntent = intent;
      }
    }

    // Regla heurística de refuerzo para casos emblemáticos del enunciado
    const norm = this.normalizeText(queryText);
    if (/donde\s+(esta|viene|quedo)\s+mi\s+pedido/.test(norm) || /rastrear/.test(norm)) {
      bestIntent = 'order_tracking';
      highestConfidence = Math.max(highestConfidence, 0.95);
    } else if (/devolver\s+un?\s+producto/.test(norm) || /devolucion/.test(norm) || /reembolso/.test(norm)) {
      bestIntent = 'order_return';
      highestConfidence = Math.max(highestConfidence, 0.95);
    } else if (/no\s+funciona\s+mi\s+compra/.test(norm) || /danado|averiado|no\s+prende|defectuoso/.test(norm)) {
      bestIntent = 'product_issue';
      highestConfidence = Math.max(highestConfidence, 0.95);
    }

    // Si la confianza es muy baja, clasificar como unknown
    if (highestConfidence < 0.25) {
      bestIntent = 'unknown';
      highestConfidence = Number(highestConfidence.toFixed(2));
    }

    return {
      intent: bestIntent,
      confidence: Number(highestConfidence.toFixed(2)),
      allScores: scores
    };
  }

  /**
   * Motor de toma de decisiones y sugerencia de acciones
   */
  determineSuggestedAction(intent, entities, orderDetails = null, sentiment = { label: 'neutral' }) {
    // Si el cliente está muy alterado o pide humano, escalar
    if (intent === 'human_handoff' || sentiment.label === 'urgent') {
      return {
        type: 'ESCALATE_TO_HUMAN',
        label: 'Transferir a Ejecutivo de Soporte Prioritario',
        payload: { priority: 'high', queue: 'urgent_support_desk' }
      };
    }

    switch (intent) {
      case 'order_tracking':
        if (orderDetails) {
          return {
            type: 'SHOW_ORDER_TRACKING',
            label: `Rastreo en tiempo real de Orden ${orderDetails.orderNumber}`,
            payload: {
              orderNumber: orderDetails.orderNumber,
              status: orderDetails.status,
              currentLocation: orderDetails.currentLocation,
              carrier: orderDetails.carrier,
              trackingCode: orderDetails.trackingCode,
              estimatedDelivery: orderDetails.estimatedDelivery
            }
          };
        }
        return {
          type: 'REQUEST_ORDER_NUMBER',
          label: 'Solicitar Número de Pedido al Cliente',
          payload: { prompt: 'Por favor, proporciona el número de tu pedido (ej. #PED-1001)' }
        };

      case 'order_return':
        if (orderDetails) {
          const eligible = !orderDetails.returnEligibleUntil || new Date(orderDetails.returnEligibleUntil) >= new Date();
          return {
            type: eligible ? 'GENERATE_RETURN_LABEL' : 'RETURN_WINDOW_EXPIRED',
            label: eligible ? 'Iniciar Trámite de Devolución y Guía de Envío' : 'Plazo de Devolución Vencido',
            payload: {
              orderNumber: orderDetails.orderNumber,
              returnEligible: eligible,
              maxReturnDate: orderDetails.returnEligibleUntil,
              returnPortalUrl: `/returns/portal?order=${orderDetails.orderNumber}`
            }
          };
        }
        return {
          type: 'START_RETURN_INQUIRY',
          label: 'Iniciar Proceso de Devolución',
          payload: { policyUrl: '/politicas/devoluciones', standardWindowDays: 30 }
        };

      case 'product_issue':
        return {
          type: 'DIAGNOSTIC_AND_WARRANTY',
          label: 'Guía de Diagnóstico y Activación de Garantía',
          payload: {
            steps: [
              'Verificar que el cable de energía y tomacorriente funcionen correctamente.',
              'Realizar un reinicio forzado manteniendo presionado el botón de encendido 15 segundos.',
              'Si el inconveniente persiste, generar ticket de recojo para revisión técnica oficial.'
            ],
            warrantyValidYears: 1
          }
        };

      case 'order_cancellation':
        return {
          type: 'PROCESS_CANCELLATION',
          label: 'Gestionar Cancelación Inmediata de Pedido',
          payload: { requiresConfirmation: true }
        };

      case 'shipping_info':
        return {
          type: 'SHOW_SHIPPING_POLICY',
          label: 'Consultar Tiempos y Cobertura de Envíos',
          payload: { standardDays: '2 a 4 días hábiles', expressDays: '24 horas' }
        };

      default:
        return {
          type: 'GENERAL_SUPPORT',
          label: 'Asistencia General o Preguntas Frecuentes',
          payload: { knowledgeBaseUrl: '/ayuda/faqs' }
        };
    }
  }

  /**
   * Genera la respuesta textual automática basada en la interpretación de IA
   */
  generateAutomatedResponse(intent, entities, action, orderDetails = null) {
    switch (intent) {
      case 'order_tracking':
        if (orderDetails) {
          const statusMap = {
            processing: 'se encuentra en preparación en nuestro almacén central',
            in_transit: `está en camino a tu domicilio a través de ${orderDetails.carrier}. Ubicación actual: ${orderDetails.currentLocation}`,
            delivered: 'figura como entregado con éxito en tu dirección',
            returned: 'ha sido devuelto a nuestras instalaciones',
            cancelled: 'fue cancelado previamente'
          };
          const statusText = statusMap[orderDetails.status] || orderDetails.status;
          const etaText = orderDetails.estimatedDelivery 
            ? ` Fecha estimada de entrega: ${new Date(orderDetails.estimatedDelivery).toLocaleDateString('es-ES')}.` 
            : '';
          return `¡Hola! Tu pedido ${orderDetails.orderNumber} ${statusText}.${etaText} Código de seguimiento: ${orderDetails.trackingCode || 'N/A'}. ¿Deseas más detalles del envío?`;
        }
        return '¡Hola! Con gusto te ayudo a rastrear tu paquete. ¿Podrías indicarme tu número de pedido (por ejemplo #PED-1001) o el correo con el que realizaste la compra?';

      case 'order_return':
        if (orderDetails && action.type === 'GENERATE_RETURN_LABEL') {
          return `Hemos validado tu pedido ${orderDetails.orderNumber}. Tienes hasta el ${new Date(orderDetails.returnEligibleUntil).toLocaleDateString('es-ES')} para solicitar la devolución gratuita. Puedes descargar tu etiqueta de envío prepagada directamente aquí.`;
        }
        return '¡Lamentamos que el producto no haya cumplido tus expectativas! Puedes solicitar la devolución sin costo dentro de los 30 días posteriores a la recepción. ¿Nos indicas tu número de compra para generar tu guía de retorno?';

      case 'product_issue':
        return 'Lamentamos mucho el inconveniente con tu compra. Todos nuestros productos cuentan con 1 año de garantía oficial. Te sugerimos revisar las conexiones o intentar un reinicio por 15 segundos. Si la falla continúa, confírmanos tu pedido para tramitar el reemplazo inmediato o reembolso.';

      case 'order_cancellation':
        return 'Comprendo que deseas cancelar tu orden. Si el pedido aún está en preparación, podemos detenerlo de inmediato y reembolsar tu dinero. Por favor proporciona tu número de pedido para verificar si aún no ha salido a despacho.';

      case 'shipping_info':
        return 'Nuestros envíos estándar toman de 2 a 4 días hábiles a nivel nacional, y las entregas express se realizan en 24 horas. Los envíos son gratuitos en compras mayores a $50.';

      case 'human_handoff':
        return 'Entiendo perfectamente. He transferido tu conversación con la más alta prioridad a un asesor humano de nuestro equipo. En breves instantes se comunicará contigo.';

      default:
        return 'Gracias por comunicarte con nuestro centro de atención. He recibido tu consulta y nuestro sistema inteligente está listo para ayudarte. ¿Podrías darnos más detalles o tu número de pedido?';
    }
  }

  /**
   * Análisis integral de la consulta del cliente
   */
  async processQuery(queryText, orderDetails = null) {
    const normalized = this.normalizeText(queryText);
    const classification = this.classifyIntent(normalized);
    const entities = this.extractEntities(queryText);
    const sentiment = this.analyzeSentiment(queryText);

    const suggestedAction = this.determineSuggestedAction(
      classification.intent,
      entities,
      orderDetails,
      sentiment
    );

    const automatedResponse = this.generateAutomatedResponse(
      classification.intent,
      entities,
      suggestedAction,
      orderDetails
    );

    return {
      query: queryText,
      intent: classification.intent,
      confidence: classification.confidence,
      sentiment,
      entities,
      suggestedAction,
      automatedResponse
    };
  }
}

module.exports = new NLPService();

