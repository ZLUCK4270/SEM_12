const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/database');
const { seedData } = require('./database/seed');

async function startServer() {
  try {
    console.log('🚀 Iniciando Servidor API de Soporte con IA...');
    await connectDB();
    await seedData();

    const server = app.listen(config.PORT, () => {
      console.log(`=======================================================`);
      console.log(`  🤖 API INTELIGENTE PARA SOPORTE AL CLIENTE ACTIVA`);
      console.log(`  🌐 URL Base: http://localhost:${config.PORT}/api`);
      console.log(`  💻 Interfaz de Demostración: http://localhost:${config.PORT}`);
      console.log(`  🛡️ Autenticación: JWT habilitada`);
      console.log(`  🧠 Motor NLP: Clasificación de Intenciones + NER Activo`);
      console.log(`=======================================================`);
    });

    return server;
  } catch (err) {
    console.error('❌ Error al iniciar el servidor:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };

