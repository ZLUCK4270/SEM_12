/**
 * Middleware centralizado para manejo de errores
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Error capturado en API:', err);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = {
  errorHandler
};

