const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const nlpService = require('../src/services/nlpService');
const supportService = require('../src/services/supportService');
const { connectDB } = require('../src/config/database');
const { seedData } = require('../src/database/seed');
const { UserRepository } = require('../src/models/User');
const jwt = require('jsonwebtoken');
const config = require('../src/config/env');

describe('CASO 2: API INTELIGENTE PARA SOPORTE AL CLIENTE', () => {

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    await seedData();
  });

  describe('1. Motor de Inteligencia Artificial y Procesamiento de Lenguaje Natural (NLP)', () => {
    
    test('Debe interpretar correctamente la consulta: "¿Dónde está mi pedido?"', async () => {
      const query = '¿Dónde está mi pedido?';
      const result = await nlpService.processQuery(query);

      assert.strictEqual(result.intent, 'order_tracking');
      assert.ok(result.confidence >= 0.7, `Confianza esperada >= 0.7, obtenida: ${result.confidence}`);
      assert.strictEqual(result.suggestedAction.type, 'REQUEST_ORDER_NUMBER');
      assert.ok(result.automatedResponse.includes('rastrear tu paquete'));
    });

    test('Debe interpretar correctamente la consulta: "Quiero devolver un producto"', async () => {
      const query = 'Quiero devolver un producto';
      const result = await nlpService.processQuery(query);

      assert.strictEqual(result.intent, 'order_return');
      assert.ok(result.confidence >= 0.7, `Confianza esperada >= 0.7, obtenida: ${result.confidence}`);
      assert.strictEqual(result.suggestedAction.type, 'START_RETURN_INQUIRY');
      assert.ok(result.automatedResponse.includes('devolución') || result.automatedResponse.includes('devolver'));
    });

    test('Debe interpretar correctamente la consulta: "No funciona mi compra"', async () => {
      const query = 'No funciona mi compra';
      const result = await nlpService.processQuery(query);

      assert.strictEqual(result.intent, 'product_issue');
      assert.ok(result.confidence >= 0.7, `Confianza esperada >= 0.7, obtenida: ${result.confidence}`);
      assert.strictEqual(result.suggestedAction.type, 'DIAGNOSTIC_AND_WARRANTY');
      assert.ok(result.automatedResponse.includes('garantía') || result.automatedResponse.includes('falla'));
    });

    test('Debe extraer entidades nombradas (NER) como el número de pedido "#PED-1001"', () => {
      const query = 'Hola, por favor ¿dónde está mi pedido #PED-1001? Gracias';
      const entities = nlpService.extractEntities(query);

      assert.strictEqual(entities.orderNumber, '#PED-1001');
    });

    test('Debe detectar sentimiento negativo / urgente y marcar escalamiento', async () => {
      const query = '¡Esto es una estafa inaceptable, exijo solución urgente ya mismo!';
      const result = await nlpService.processQuery(query);

      assert.strictEqual(result.sentiment.label, 'urgent');
      assert.strictEqual(result.suggestedAction.type, 'ESCALATE_TO_HUMAN');
    });
  });

  describe('2. Integración de Consulta con Base de Datos de Órdenes', () => {

    test('Debe responder con información detallada de rastreo si se proporciona una orden existente', async () => {
      const response = await supportService.handleInquiry({
        query: '¿Dónde está mi pedido #PED-1001?'
      });

      assert.strictEqual(response.success, true);
      assert.strictEqual(response.data.nlpInterpretation.intent, 'order_tracking');
      assert.ok(response.data.orderInfo !== null);
      assert.strictEqual(response.data.orderInfo.orderNumber, 'PED-1001');
      assert.strictEqual(response.data.orderInfo.status, 'in_transit');
      assert.ok(response.data.automatedResponse.includes('DHL Express') || response.data.automatedResponse.includes('PED-1001'));
      assert.strictEqual(response.data.suggestedAction.type, 'SHOW_ORDER_TRACKING');
    });

    test('Debe gestionar trámite de devolución para orden entregada #PED-1002', async () => {
      const response = await supportService.handleInquiry({
        query: 'Quiero devolver mi compra #PED-1002'
      });

      assert.strictEqual(response.success, true);
      assert.strictEqual(response.data.nlpInterpretation.intent, 'order_return');
      assert.strictEqual(response.data.suggestedAction.type, 'GENERATE_RETURN_LABEL');
      assert.ok(response.data.suggestedAction.payload.returnEligible === true);
    });

    test('Debe persistir el ticket de atención con trazabilidad completa', async () => {
      const response = await supportService.handleInquiry({
        query: 'No funciona mi compra, el celular no enciende la pantalla'
      });

      assert.ok(response.data.ticket.ticketNumber.startsWith('TCK-'));
      assert.strictEqual(response.data.ticket.status, 'resolved_automatically');

      const ticketInDb = await supportService.getTicketByIdOrNumber(response.data.ticket.ticketNumber);
      assert.ok(ticketInDb !== null);
      assert.strictEqual(ticketInDb.intent, 'product_issue');
    });
  });

  describe('3. Endpoints REST HTTP y Autenticación JWT', () => {
    let customerToken = '';
    let agentToken = '';

    test('GET /api/health debe responder estado online', async () => {
      const res = await request(app).get('/api/health');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.status, 'online');
    });

    test('POST /api/auth/login debe devolver token JWT para el cliente', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'carlos@ejemplo.com', password: 'password123' });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.token);
      customerToken = res.body.data.token;
    });

    test('POST /api/auth/login debe devolver token JWT para el agente', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'agente@soporte.com', password: 'password123' });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.user.role, 'agent');
      agentToken = res.body.data.token;
    });

    test('GET /api/auth/me debe validar el token JWT y retornar usuario', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customerToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.user.email, 'carlos@ejemplo.com');
    });

    test('POST /api/support/query debe procesar consulta HTTP y devolver respuesta IA', async () => {
      const res = await request(app)
        .post('/api/support/query')
        .send({ query: '¿Dónde está mi pedido #PED-1001?' });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.nlpInterpretation.intent, 'order_tracking');
      assert.strictEqual(res.body.data.orderInfo.orderNumber, 'PED-1001');
      assert.ok(res.body.data.automatedResponse);
      assert.ok(res.body.data.suggestedAction);
    });

    test('GET /api/support/stats debe entregar métricas globales de soporte', async () => {
      const res = await request(app).get('/api/support/stats');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.totalTickets >= 1);
      assert.ok(typeof res.body.data.automationRatePercentage === 'number');
    });

    test('GET /api/orders/track/:orderNumber debe retornar datos de la orden', async () => {
      const res = await request(app).get('/api/orders/track/PED-1001');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.orderNumber, 'PED-1001');
      assert.strictEqual(res.body.data.carrier, 'DHL Express');
    });

    test('PATCH /api/support/tickets/:id/status debe permitir actualización con rol agente', async () => {
      // Crear un ticket primero
      const queryRes = await request(app)
        .post('/api/support/query')
        .send({ query: 'No funciona mi compra' });

      const ticketNumber = queryRes.body.data.ticket.ticketNumber;

      const updateRes = await request(app)
        .patch(`/api/support/tickets/${ticketNumber}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'closed' });

      assert.strictEqual(updateRes.statusCode, 200);
      assert.strictEqual(updateRes.body.success, true);
      assert.strictEqual(updateRes.body.data.status, 'closed');
    });
  });
});
