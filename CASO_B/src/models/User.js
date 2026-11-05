const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { isUsingMemoryStore, getMemoryStore } = require('../config/database');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['customer', 'agent', 'admin'], default: 'customer' },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const MongooseUser = mongoose.model('User', userSchema);

// Repositorio unificado (Soporta Mongoose y Memoria)
const UserRepository = {
  async findByEmail(email) {
    if (isUsingMemoryStore()) {
      return getMemoryStore().users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }
    return MongooseUser.findOne({ email: email.toLowerCase() });
  },

  async findById(id) {
    if (isUsingMemoryStore()) {
      return getMemoryStore().users.find(u => u._id.toString() === id.toString()) || null;
    }
    return MongooseUser.findById(id).select('-password');
  },

  async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const userToSave = {
      ...userData,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      role: userData.role || 'customer',
      createdAt: new Date()
    };

    if (isUsingMemoryStore()) {
      const existing = getMemoryStore().users.find(u => u.email === userToSave.email);
      if (existing) {
        const error = new Error('El correo electrónico ya está registrado');
        error.code = 11000;
        throw error;
      }
      const newUser = {
        _id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        ...userToSave,
        comparePassword: async (pwd) => bcrypt.compare(pwd, hashedPassword)
      };
      getMemoryStore().users.push(newUser);
      return newUser;
    }

    const created = await MongooseUser.create(userData);
    return created;
  },

  async listAll() {
    if (isUsingMemoryStore()) {
      return getMemoryStore().users.map(({ password, ...rest }) => rest);
    }
    return MongooseUser.find().select('-password');
  }
};

module.exports = {
  MongooseUser,
  UserRepository
};

