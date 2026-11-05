/**
 * Middleware para control de acceso basado en roles (RBAC)
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Permiso denegado: El rol '${req.user.role}' no tiene autorización para este recurso.`
      });
    }

    next();
  };
}

module.exports = {
  authorizeRoles
};

