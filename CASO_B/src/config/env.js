const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'secret_jwt_key_fallback_development_mode',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/support_ai_db',
  AI_CONFIDENCE_THRESHOLD: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.55'),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || null
};

