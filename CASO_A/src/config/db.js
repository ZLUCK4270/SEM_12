const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;
let isConnected = false;
let isFallbackMode = false;

// Fallback en memoria si MySQL no está iniciado
const memoryStore = {
  users: [],
  conversations: [],
  messages: [],
  ai_actions: [],
  counters: { users: 1, conversations: 1, messages: 1, ai_actions: 1 }
};

async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'customer_ai_db';
  const port = process.env.DB_PORT || 3306;

  try {
    // 1. Intentar conectar al servidor MySQL (sin especificar BD para crearla si no existe)
    const initialConnection = await mysql.createConnection({
      host,
      user,
      password,
      port
    });

    await initialConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await initialConnection.end();

    // 2. Conectar con el pool a la BD creada
    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 3. Crear las tablas si no existen
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('customer', 'agent', 'admin') DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(150) DEFAULT 'Consulta de cliente',
        status ENUM('open', 'closed', 'escalated') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender ENUM('user', 'ai', 'agent') NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_actions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id INT NOT NULL,
        intent VARCHAR(100) NOT NULL,
        confidence FLOAT NOT NULL,
        suggested_action JSON NULL,
        executed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );
    `);

    isConnected = true;
    isFallbackMode = false;
    console.log(`[MySQL] Conexión establecida con éxito en la base de datos '${database}'.`);
  } catch (error) {
    isFallbackMode = true;
    isConnected = false;
    console.warn(`[MySQL Aviso] No se pudo conectar a MySQL (${error.message}).`);
    console.warn(`[Modo Híbrido] Activando repositorio en memoria para permitir pruebas inmediatas sin que la API se detenga.`);
  }
}

// Inicializar conexión
initDatabase();

// Wrapper universal para consultas
const db = {
  get status() {
    return {
      connected: isConnected,
      fallbackMode: isFallbackMode,
      engine: isFallbackMode ? 'In-Memory Simulation' : 'MySQL 8.x / MariaDB'
    };
  },

  async execute(sql, params = []) {
    if (!isFallbackMode && pool) {
      return pool.execute(sql, params);
    }

    // Lógica de fallback para pruebas si MySQL está apagado
    return handleMemoryExecute(sql, params);
  },

  async query(sql, params = []) {
    if (!isFallbackMode && pool) {
      return pool.query(sql, params);
    }
    return handleMemoryExecute(sql, params);
  }
};

// Simulador SQL básico para fallback en caso de no tener MySQL encendido
function handleMemoryExecute(sql, params = []) {
  const cleanSql = sql.trim().replace(/\s+/g, ' ');

  // INSERT INTO users
  if (/INSERT INTO users/i.test(cleanSql)) {
    const [name, email, password_hash, role = 'customer'] = params;
    const existing = memoryStore.users.find(u => u.email === email);
    if (existing) {
      const err = new Error("Duplicate entry for key 'users.email'");
      err.code = 'ER_DUP_ENTRY';
      throw err;
    }
    const id = memoryStore.counters.users++;
    const user = { id, name, email, password_hash, role, created_at: new Date() };
    memoryStore.users.push(user);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  // SELECT * FROM users WHERE email = ?
  if (/SELECT.*FROM users WHERE email = \?/i.test(cleanSql)) {
    const email = params[0];
    const rows = memoryStore.users.filter(u => u.email === email);
    return [rows, null];
  }

  // SELECT * FROM users WHERE id = ?
  if (/SELECT.*FROM users WHERE id = \?/i.test(cleanSql)) {
    const id = parseInt(params[0], 10);
    const rows = memoryStore.users.filter(u => u.id === id);
    return [rows, null];
  }

  // INSERT INTO conversations
  if (/INSERT INTO conversations/i.test(cleanSql)) {
    const [user_id, title = 'Consulta de cliente'] = params;
    const id = memoryStore.counters.conversations++;
    const conv = { id, user_id, title, status: 'open', created_at: new Date() };
    memoryStore.conversations.push(conv);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  // SELECT * FROM conversations WHERE user_id = ?
  if (/SELECT.*FROM conversations WHERE user_id = \?/i.test(cleanSql)) {
    const user_id = parseInt(params[0], 10);
    const rows = memoryStore.conversations.filter(c => c.user_id === user_id);
    return [rows, null];
  }

  // SELECT * FROM conversations WHERE id = ?
  if (/SELECT.*FROM conversations WHERE id = \?/i.test(cleanSql)) {
    const id = parseInt(params[0], 10);
    const rows = memoryStore.conversations.filter(c => c.id === id);
    return [rows, null];
  }

  // INSERT INTO messages
  if (/INSERT INTO messages/i.test(cleanSql)) {
    const [conversation_id, sender, content] = params;
    const id = memoryStore.counters.messages++;
    const msg = { id, conversation_id, sender, content, created_at: new Date() };
    memoryStore.messages.push(msg);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  // SELECT * FROM messages WHERE conversation_id = ?
  if (/SELECT.*FROM messages WHERE conversation_id = \?/i.test(cleanSql)) {
    const convId = parseInt(params[0], 10);
    const rows = memoryStore.messages.filter(m => m.conversation_id === convId);
    return [rows, null];
  }

  // INSERT INTO ai_actions
  if (/INSERT INTO ai_actions/i.test(cleanSql)) {
    const [message_id, intent, confidence, suggested_action] = params;
    const id = memoryStore.counters.ai_actions++;
    const action = {
      id,
      message_id,
      intent,
      confidence,
      suggested_action: typeof suggested_action === 'string' ? JSON.parse(suggested_action) : suggested_action,
      executed: false,
      created_at: new Date()
    };
    memoryStore.ai_actions.push(action);
    return [{ insertId: id, affectedRows: 1 }, null];
  }

  // UPDATE ai_actions SET executed = true WHERE id = ?
  if (/UPDATE ai_actions SET executed/i.test(cleanSql)) {
    const id = parseInt(params[0], 10);
    const act = memoryStore.ai_actions.find(a => a.id === id);
    if (act) act.executed = true;
    return [{ affectedRows: act ? 1 : 0 }, null];
  }

  return [[], null];
}

module.exports = db;

