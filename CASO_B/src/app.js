const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Servir archivos estáticos del simulador web interactivo
app.use(express.static(path.join(__dirname, '../public')));

// Enrutador de la API REST
app.use('/api', routes);

// Middleware centralizado de gestión de errores
app.use(errorHandler);

module.exports = app;

