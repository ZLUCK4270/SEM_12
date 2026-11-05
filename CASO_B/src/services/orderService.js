const { OrderRepository } = require('../models/Order');

class OrderService {
  async getOrderByNumber(orderNumber) {
    if (!orderNumber) return null;
    return OrderRepository.findByOrderNumber(orderNumber);
  }

  async getOrdersByEmail(customerEmail) {
    if (!customerEmail) return [];
    return OrderRepository.findByCustomerEmail(customerEmail);
  }

  async updateOrderStatus(orderNumber, status, location) {
    return OrderRepository.updateStatus(orderNumber, status, location);
  }

  async listAllOrders() {
    return OrderRepository.listAll();
  }
}

module.exports = new OrderService();

