const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { UserRepository } = require('../models/User');

/**
 * Middleware para rutas protegidas que exigen token JWT válido
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.split(' ')[1] 
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Acceso no autorizado: Token JWT no proporcionado'
      });
    }

    jwt.verify(token, config.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          error: 'Token inválido o expirado'
        });
      }

      const user = await UserRepository.findById(decoded.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario asociado al token no encontrado'
        });
      }

      req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error interno en autenticación',
      details: error.message
    });
  }
}

/**
 * Middleware opcional: si viene un token válido, asocia req.user, pero no bloquea si no viene
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : null;

  if (!token) {
    return next();
  }

  jwt.verify(token, config.JWT_SECRET, async (err, decoded) => {
    if (!err && decoded && decoded.id) {
      const user = await UserRepository.findById(decoded.id);
      if (user) {
        req.user = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    }
    next();
  });
}

module.exports = {
  authenticateToken,
  optionalAuth
};

