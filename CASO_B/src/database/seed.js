const { connectDB } = require('../config/database');
const { UserRepository } = require('../models/User');
const { OrderRepository } = require('../models/Order');
const { KnowledgeBaseRepository } = require('../models/KnowledgeBase');

async function seedData() {
  console.log('🌱 Inicializando datos semilla...');

  // 1. Usuarios demo
  const customer = await UserRepository.create({
    name: 'Carlos Mendoza',
    email: 'carlos@ejemplo.com',
    password: 'password123',
    role: 'customer'
  });

  const agent = await UserRepository.create({
    name: 'Sofía Agente',
    email: 'agente@soporte.com',
    password: 'password123',
    role: 'agent'
  });

  console.log('👥 Usuarios de prueba creados (carlos@ejemplo.com / agente@soporte.com)');

  // 2. Órdenes demo para e-commerce
  const now = new Date();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const twoDaysLater = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const twentyDaysLater = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

  await OrderRepository.create({
    orderNumber: 'PED-1001',
    customerEmail: 'carlos@ejemplo.com',
    customerName: 'Carlos Mendoza',
    items: [
      { productId: 'PROD-01', name: 'Smartphone Galaxy Pro', price: 799.99, quantity: 1 }
    ],
    totalAmount: 799.99,
    status: 'in_transit',
    currentLocation: 'Hub de Distribución Norte - En reparto local',
    carrier: 'DHL Express',
    trackingCode: 'DHL-894719283',
    estimatedDelivery: twoDaysLater,
    returnEligibleUntil: twentyDaysLater
  });

  await OrderRepository.create({
    orderNumber: 'PED-1002',
    customerEmail: 'carlos@ejemplo.com',
    customerName: 'Carlos Mendoza',
    items: [
      { productId: 'PROD-02', name: 'Laptop Ultrabook 15"', price: 1199.00, quantity: 1 }
    ],
    totalAmount: 1199.00,
    status: 'delivered',
    currentLocation: 'Entregado en domicilio del cliente',
    carrier: 'FedEx',
    trackingCode: 'FDX-55102941',
    deliveredAt: threeDaysAgo,
    returnEligibleUntil: twentyDaysLater
  });

  await OrderRepository.create({
    orderNumber: 'PED-1003',
    customerEmail: 'mariana@cliente.com',
    customerName: 'Mariana Pérez',
    items: [
      { productId: 'PROD-03', name: 'Auriculares Inalámbricos Noise-Cancelling', price: 149.50, quantity: 1 }
    ],
    totalAmount: 149.50,
    status: 'processing',
    currentLocation: 'Bodega Principal - Empaque y Control de Calidad',
    carrier: 'Estafeta',
    trackingCode: 'EST-10928374',
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    returnEligibleUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  console.log('📦 Órdenes de prueba creadas (PED-1001 en tránsito, PED-1002 entregado, PED-1003 procesando)');

  // 3. Base de Conocimiento (Knowledge Base FAQs)
  await KnowledgeBaseRepository.seed([
    {
      category: 'Envíos',
      intent: 'shipping_info',
      question: '¿Cuáles son los tiempos y costos de entrega?',
      answer: 'Los envíos regulares tardan de 2 a 4 días laborables. Envíos express en 24 horas.',
      keywords: ['tiempo', 'costo', 'demora', 'flete', 'entrega']
    },
    {
      category: 'Devoluciones',
      intent: 'order_return',
      question: '¿Cómo solicito una devolución?',
      answer: 'Cuentas con 30 días para solicitar devolución sin costo directamente en tu panel.',
      keywords: ['devolucion', 'reembolso', 'garantia', 'cambio']
    },
    {
      category: 'Soporte Técnico',
      intent: 'product_issue',
      question: '¿Qué hago si mi producto no funciona?',
      answer: 'Contacta a nuestro equipo con fotos/video y el número de compra para reemplazo directo.',
      keywords: ['falla', 'roto', 'danado', 'no enciende', 'garantia']
    }
  ]);

  console.log('📚 Base de conocimiento FAQ inicializada con éxito');
}

if (require.main === module) {
  (async () => {
    await connectDB();
    await seedData();
    console.log('✨ Semillero finalizado');
    process.exit(0);
  })();
}

module.exports = { seedData };

