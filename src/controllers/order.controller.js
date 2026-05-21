import * as orderService from '../services/order.service.js';
import {
  createOrderSchema,
  orderNumberSchema,
  orderStatusSchema,
} from '../validators/orderValidator.js';

const validateOrderNumber = (orderNumber) => {
  const { error, value } = orderNumberSchema.validate(orderNumber);
  return error ? null : value;
};

// Create a new order
export const createOrder = async (req, res, next) => {
  try {
    const { error, value } = createOrderSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const orderData = {
      ...value,
      user_id: req.user.id,
      email: req.user.email
    };
    
    const order = await orderService.createOrder(orderData);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

// Get all orders for a user
export const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    if (!/^\d+$/.test(String(userId))) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    if (req.user.role !== 'admin' && String(req.user.id) !== String(userId)) {
      return res.status(403).json({ message: 'You can only view your own orders' });
    }

    const orders = await orderService.getUserOrders(userId);
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// Get order by order number (public)
export const getOrderByNumber = async (req, res, next) => {
  try {
    const orderNumber = validateOrderNumber(req.params.orderNumber);
    if (!orderNumber) {
      return res.status(400).json({ message: 'Invalid order number' });
    }

    const order = await orderService.getOrderByNumber(orderNumber, { publicView: true });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (err) {
    next(err);
  }
};

// Update order status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const orderNumber = validateOrderNumber(req.params.orderNumber);
    if (!orderNumber) {
      return res.status(400).json({ message: 'Invalid order number' });
    }

    const { error, value } = orderStatusSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { status, notes } = value;
    
    const updated = await orderService.updateOrderStatus(orderNumber, status, notes);
    
    if (!updated) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({ message: 'Order status updated successfully' });
  } catch (err) {
    next(err);
  }
};

// Get all orders (admin only)
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json(orders);
  } catch (err) {
    next(err);
  }
};
