const mongoose = require('mongoose');
const { isUsingMemoryStore, getMemoryStore } = require('../config/database');

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true },
  customerEmail: { type: String, lowercase: true, trim: true, default: 'anonimo@ecommerce.com' },
  customerName: { type: String, default: 'Cliente' },
  originalQuery: { type: String, required: true },
  intent: {
    type: String,
    enum: [
      'order_tracking',
      'order_return',
      'product_issue',
      'order_cancellation',
      'shipping_info',
      'payment_issue',
      'human_handoff',
      'general_inquiry',
      'unknown'
    ],
    default: 'unknown'
  },
  confidence: { type: Number, min: 0, max: 1, default: 0 },
  sentiment: {
    score: { type: Number, default: 0 },
    label: { type: String, enum: ['positive', 'neutral', 'negative', 'urgent'], default: 'neutral' }
  },
  extractedEntities: {
    orderNumber: { type: String },
    productName: { type: String },
    keywords: [{ type: String }]
  },
  suggestedAction: {
    type: { type: String, required: true },
    label: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed }
  },
  automatedResponse: { type: String, required: true },
  status: {
    type: String,
    enum: ['resolved_automatically', 'escalated_to_agent', 'pending_customer_input', 'closed'],
    default: 'resolved_automatically'
  },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const MongooseTicket = mongoose.model('Ticket', ticketSchema);

const TicketRepository = {
  async create(ticketData) {
    const ticketNumber = 'TCK-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 900 + 100);
    const fullData = {
      ticketNumber,
      createdAt: new Date(),
      ...ticketData
    };

    if (isUsingMemoryStore()) {
      const newTicket = {
        _id: 'tck_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        ...fullData
      };
      getMemoryStore().tickets.push(newTicket);
      return newTicket;
    }
    return MongooseTicket.create(fullData);
  },

  async findByTicketNumber(ticketNumber) {
    if (isUsingMemoryStore()) {
      return getMemoryStore().tickets.find(t => t.ticketNumber === ticketNumber) || null;
    }
    return MongooseTicket.findOne({ ticketNumber });
  },

  async findById(id) {
    if (isUsingMemoryStore()) {
      return getMemoryStore().tickets.find(t => t._id.toString() === id.toString()) || null;
    }
    return MongooseTicket.findById(id);
  },

  async list(filter = {}) {
    if (isUsingMemoryStore()) {
      let results = [...getMemoryStore().tickets];
      if (filter.status) results = results.filter(t => t.status === filter.status);
      if (filter.intent) results = results.filter(t => t.intent === filter.intent);
      if (filter.customerEmail) results = results.filter(t => t.customerEmail === filter.customerEmail.toLowerCase());
      return results.reverse();
    }
    return MongooseTicket.find(filter).sort({ createdAt: -1 });
  },

  async updateStatus(idOrNumber, status) {
    if (isUsingMemoryStore()) {
      const ticket = getMemoryStore().tickets.find(t => 
        t._id.toString() === idOrNumber.toString() || t.ticketNumber === idOrNumber
      );
      if (ticket) {
        ticket.status = status;
        if (status === 'closed' || status === 'resolved_automatically') {
          ticket.resolvedAt = new Date();
        }
      }
      return ticket;
    }
    return MongooseTicket.findOneAndUpdate(
      { $or: [{ _id: mongoose.Types.ObjectId.isValid(idOrNumber) ? idOrNumber : null }, { ticketNumber: idOrNumber }] },
      { $set: { status, ...(status === 'closed' && { resolvedAt: new Date() }) } },
      { new: true }
    );
  },

  async getStatistics() {
    if (isUsingMemoryStore()) {
      const tickets = getMemoryStore().tickets;
      const total = tickets.length;
      const resolvedAuto = tickets.filter(t => t.status === 'resolved_automatically').length;
      const escalated = tickets.filter(t => t.status === 'escalated_to_agent').length;
      const pending = tickets.filter(t => t.status === 'pending_customer_input').length;
      
      const intentsCount = {};
      tickets.forEach(t => {
        intentsCount[t.intent] = (intentsCount[t.intent] || 0) + 1;
      });

      return {
        totalTickets: total,
        resolvedAutomatically: resolvedAuto,
        escalatedToAgent: escalated,
        pendingCustomerInput: pending,
        automationRatePercentage: total > 0 ? Number(((resolvedAuto / total) * 100).toFixed(1)) : 100,
        intentsDistribution: intentsCount
      };
    }

    const [total, resolvedAuto, escalated, pending, intentAgg] = await Promise.all([
      MongooseTicket.countDocuments(),
      MongooseTicket.countDocuments({ status: 'resolved_automatically' }),
      MongooseTicket.countDocuments({ status: 'escalated_to_agent' }),
      MongooseTicket.countDocuments({ status: 'pending_customer_input' }),
      MongooseTicket.aggregate([
        { $group: { _id: '$intent', count: { $sum: 1 } } }
      ])
    ]);

    const intentsDistribution = {};
    intentAgg.forEach(i => { intentsDistribution[i._id] = i.count; });

    return {
      totalTickets: total,
      resolvedAutomatically: resolvedAuto,
      escalatedToAgent: escalated,
      pendingCustomerInput: pending,
      automationRatePercentage: total > 0 ? Number(((resolvedAuto / total) * 100).toFixed(1)) : 100,
      intentsDistribution
    };
  }
};

module.exports = {
  MongooseTicket,
  TicketRepository
};

