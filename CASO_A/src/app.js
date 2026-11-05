const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir la interfaz web estática desde la carpeta public
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rutas de la API de Atención con IA
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Mantener compatibilidad con el Caso 1 (CRUD de usuarios en memoria)
let memoryUsers = [
  { id: 1, name: 'Juan Pérez', email: 'juan@example.com' },
  { id: 2, name: 'Ana Gómez', email: 'ana@example.com' }
];
let nextUserId = 3;

app.get('/users', (req, res) => res.status(200).json(memoryUsers));
app.get('/users/:id', (req, res) => {
  const user = memoryUsers.find(u => u.id === parseInt(req.params.id, 10));
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
  res.status(200).json(user);
});
app.post('/users', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'Nombre y email requeridos' });
  const newUser = { id: nextUserId++, name, email };
  memoryUsers.push(newUser);
  res.status(201).json(newUser);
});
app.put('/users/:id', (req, res) => {
  const index = memoryUsers.findIndex(u => u.id === parseInt(req.params.id, 10));
  if (index === -1) return res.status(404).json({ message: 'Usuario no encontrado' });
  memoryUsers[index] = { id: parseInt(req.params.id, 10), name: req.body.name, email: req.body.email };
  res.status(200).json(memoryUsers[index]);
});
app.delete('/users/:id', (req, res) => {
  const index = memoryUsers.findIndex(u => u.id === parseInt(req.params.id, 10));
  if (index === -1) return res.status(404).json({ message: 'Usuario no encontrado' });
  const deleted = memoryUsers.splice(index, 1)[0];
  res.status(200).json({ message: 'Usuario eliminado', user: deleted });
});

// Manejo de rutas no encontradas de la API
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Ruta de API no encontrada' });
});

module.exports = app;

