const mongoose = require('mongoose');
const { isUsingMemoryStore, getMemoryStore } = require('../config/database');

const knowledgeBaseSchema = new mongoose.Schema({
  category: { type: String, required: true },
  intent: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  keywords: [{ type: String }],
  suggestedActionType: { type: String, default: 'VIEW_FAQ' },
  active: { type: Boolean, default: true }
});

const MongooseKnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);

const KnowledgeBaseRepository = {
  async listAll() {
    if (isUsingMemoryStore()) {
      return getMemoryStore().knowledgeBase;
    }
    return MongooseKnowledgeBase.find({ active: true });
  },

  async seed(items) {
    if (isUsingMemoryStore()) {
      getMemoryStore().knowledgeBase = items.map((item, idx) => ({
        _id: 'kb_' + (idx + 1),
        ...item
      }));
      return getMemoryStore().knowledgeBase;
    }
    await MongooseKnowledgeBase.deleteMany({});
    return MongooseKnowledgeBase.insertMany(items);
  }
};

module.exports = {
  MongooseKnowledgeBase,
  KnowledgeBaseRepository
};

