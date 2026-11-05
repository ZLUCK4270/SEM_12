const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { UserRepository } = require('../models/User');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Nombre, email y contraseña son campos requeridos'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe tener mínimo 6 caracteres'
        });
      }

      const existingUser = await UserRepository.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'El correo electrónico ya se encuentra registrado'
        });
      }

      const user = await UserRepository.create({
        name,
        email,
        password,
        role: role || 'customer'
      });

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      return res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email y contraseña son requeridos'
        });
      }

      const user = await UserRepository.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas (usuario no encontrado)'
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas (contraseña incorrecta)'
        });
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      return res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req, res) {
    return res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  }
}

module.exports = new AuthController();

