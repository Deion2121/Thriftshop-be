import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { checkoutRateLimiter, csrfProtection, trackingRateLimiter } from '../middleware/security.js';
import {
  createOrder,
  getAllOrders,
  getUserOrders,
  getOrderByNumber,
  updateOrderStatus
} from '../controllers/order.controller.js';

const router = express.Router();

// POST /api/orders - Create a new order (requires auth)
router.post('/', authMiddleware, csrfProtection, checkoutRateLimiter, createOrder);

// GET /api/orders/track/:orderNumber - Track an order by order number (public)
router.get('/track/:orderNumber', trackingRateLimiter, getOrderByNumber);

// GET /api/orders/admin/all - Get all orders for admin monitoring
router.get('/admin/all', authMiddleware, adminMiddleware, getAllOrders);

// PATCH /api/orders/:orderNumber/status - Update order status (requires auth)
router.patch('/:orderNumber/status', authMiddleware, adminMiddleware, csrfProtection, updateOrderStatus);

// GET /api/orders/:userId - Get all orders for a user (requires auth)
router.get('/:userId', authMiddleware, getUserOrders);

export default router;
