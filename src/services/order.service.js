import * as orderRepository from '../repositories/order.repository.js';

// Create a new order
export const createOrder = async (orderData) => {
  return await orderRepository.createOrder(orderData);
};

// Get orders by user ID
export const getUserOrders = async (userId) => {
  return await orderRepository.getOrdersByUserId(userId);
};

// Get order by order number
export const getOrderByNumber = async (orderNumber, options = {}) => {
  return await orderRepository.getOrderByNumber(orderNumber, options);
};

// Update order status
export const updateOrderStatus = async (orderNumber, status, notes) => {
  return await orderRepository.updateOrderStatus(orderNumber, status, notes);
};

// Get all orders (for admin)
export const getAllOrders = async () => {
  return await orderRepository.getAllOrders();
};
