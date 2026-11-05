require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Servidor ejecutándose en: http://localhost:${PORT}`);
  console.log(`🤖 API con IA & NLP:`);
  console.log(`   - Auth:  http://localhost:${PORT}/api/auth/login`);
  console.log(`   - Chat:  http://localhost:${PORT}/api/chat/ask`);
  console.log(`   - Panel: http://localhost:${PORT}/`);
  console.log(`====================================================`);
});
