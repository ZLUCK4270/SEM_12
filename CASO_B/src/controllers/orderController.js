const orderService = require('../services/orderService');

class OrderController {
  async trackOrder(req, res, next) {
    try {
      const { orderNumber } = req.params;
      const order = await orderService.getOrderByNumber(orderNumber);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: `No se encontró ningún pedido con el número ${orderNumber}`
        });
      }

      return res.json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  async listCustomerOrders(req, res, next) {
    try {
      const email = req.user.email;
      const orders = await orderService.getOrdersByEmail(email);

      return res.json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }

  async listAllOrders(req, res, next) {
    try {
      const orders = await orderService.listAllOrders();
      return res.json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();

