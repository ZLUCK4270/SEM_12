const mongoose = require('mongoose');
const { isUsingMemoryStore, getMemoryStore } = require('../config/database');

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1 }
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  customerEmail: { type: String, required: true, lowercase: true, trim: true },
  customerName: { type: String, required: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['processing', 'in_transit', 'delivered', 'returned', 'cancelled'],
    default: 'processing'
  },
  currentLocation: { type: String, default: 'Centro de Distribución Central' },
  carrier: { type: String, default: 'DHL Express' },
  trackingCode: { type: String },
  estimatedDelivery: { type: Date },
  deliveredAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  returnEligibleUntil: { type: Date }
});

const MongooseOrder = mongoose.model('Order', orderSchema);

const OrderRepository = {
  async findByOrderNumber(orderNumber) {
    const cleanNumber = (orderNumber || '').toString().trim().toUpperCase().replace('#', '');
    if (isUsingMemoryStore()) {
      return getMemoryStore().orders.find(o => 
        o.orderNumber.toUpperCase().replace('#', '') === cleanNumber
      ) || null;
    }
    return MongooseOrder.findOne({ 
      orderNumber: new RegExp('^' + cleanNumber + '$', 'i') 
    });
  },

  async findByCustomerEmail(email) {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (isUsingMemoryStore()) {
      return getMemoryStore().orders.filter(o => o.customerEmail.toLowerCase() === cleanEmail);
    }
    return MongooseOrder.find({ customerEmail: cleanEmail }).sort({ createdAt: -1 });
  },

  async create(orderData) {
    if (isUsingMemoryStore()) {
      const newOrder = {
        _id: 'order_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        ...orderData,
        orderNumber: orderData.orderNumber.toUpperCase(),
        createdAt: orderData.createdAt || new Date()
      };
      getMemoryStore().orders.push(newOrder);
      return newOrder;
    }
    return MongooseOrder.create(orderData);
  },

  async updateStatus(orderNumber, status, currentLocation = null) {
    const cleanNumber = orderNumber.toString().trim().toUpperCase().replace('#', '');
    if (isUsingMemoryStore()) {
      const order = getMemoryStore().orders.find(o => 
        o.orderNumber.toUpperCase().replace('#', '') === cleanNumber
      );
      if (order) {
        order.status = status;
        if (currentLocation) order.currentLocation = currentLocation;
        if (status === 'delivered') order.deliveredAt = new Date();
      }
      return order;
    }
    return MongooseOrder.findOneAndUpdate(
      { orderNumber: new RegExp('^' + cleanNumber + '$', 'i') },
      { 
        $set: { 
          status, 
          ...(currentLocation && { currentLocation }),
          ...(status === 'delivered' && { deliveredAt: new Date() })
        } 
      },
      { new: true }
    );
  },

  async listAll() {
    if (isUsingMemoryStore()) {
      return getMemoryStore().orders;
    }
    return MongooseOrder.find().sort({ createdAt: -1 });
  }
};

module.exports = {
  MongooseOrder,
  OrderRepository
};

