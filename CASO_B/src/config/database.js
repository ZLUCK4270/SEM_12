const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;
let useMemoryStore = false;

// Almacén en memoria en caso de no disponer de MongoDB activo
const memoryStore = {
  users: [],
  orders: [],
  tickets: [],
  knowledgeBase: []
};

async function connectDB() {
  if (config.NODE_ENV === 'test' && !process.env.USE_REAL_MONGO) {
    console.log('🧪 Modo de pruebas: Usando repositorio en memoria ultra-rápido');
    useMemoryStore = true;
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 2500, // Timeout rápido si no está corriendo mongod
      connectTimeoutMS: 2500
    });
    isConnected = true;
    useMemoryStore = false;
    console.log(`✅ Conectado exitosamente a MongoDB: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.warn(`⚠️ No se pudo conectar a MongoDB (${err.message}). Activando almacenamiento en memoria automático para desarrollo/evaluación.`);
    useMemoryStore = true;
    isConnected = false;
  }
}

function getMemoryStore() {
  return memoryStore;
}

function isUsingMemoryStore() {
  return useMemoryStore;
}

module.exports = {
  connectDB,
  getMemoryStore,
  isUsingMemoryStore,
  mongoose
};

