import db from '../config/db.js';
import crypto from 'crypto';

const generateOrderNumber = () => {
  return `ORD-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
};

const parseJson = (value, fallback) => {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeOrder = (order, statusHistory = [], { publicView = false } = {}) => {
  const total = order.total ?? order.total_amount ?? 0;

  const normalized = {
    ...order,
    order_number: order.order_number,
    subtotal: order.subtotal ?? total,
    shipping: order.shipping ?? 0,
    total,
    items: parseJson(order.items, []),
    shipping_address: order.shipping_address || '',
    status_history: statusHistory
  };

  if (!publicView) return normalized;

  const {
    user_id,
    email,
    shipping_address,
    notes,
    ...publicOrder
  } = normalized;

  return publicOrder;
};

const getProductsByIds = async (productIds) => {
  const placeholders = productIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT id, name, brand, category, subCategory, price, image_url FROM products WHERE id IN (${placeholders})`,
    productIds
  );

  return new Map(rows.map((product) => [Number(product.id), product]));
};

const calculateOrderTotals = async (items) => {
  const productIds = [...new Set(items.map((item) => Number(item.product_id)))];
  const productsById = await getProductsByIds(productIds);

  if (productsById.size !== productIds.length) {
    const missingIds = productIds.filter((id) => !productsById.has(id));
    const err = new Error(`Product not found: ${missingIds.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const enrichedItems = items.map((item) => {
    const product = productsById.get(Number(item.product_id));
    const quantity = Number(item.quantity);
    const price = Number(product.price);

    return {
      product_id: product.id,
      name: product.name,
      brand: product.brand,
      price,
      quantity,
      variant: item.variant || 'Default',
      image_url: product.image_url || '',
      line_total: Number((price * quantity).toFixed(2)),
    };
  });

  const subtotal = Number(
    enrichedItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2)
  );
  const shipping = subtotal > 0 && subtotal < 250 ? 45 : 0;
  const total = Number((subtotal + shipping).toFixed(2));

  return { enrichedItems, subtotal, shipping, total };
};

// Create a new order
export const createOrder = async (orderData) => {
  const {
    userId,
    user_id,
    email,
    items,
    shipping_address,
    status = 'pending',
    tracking_number = null,
    notes = ''
  } = orderData;
  const orderUserId = user_id || userId;
  const orderNumber = generateOrderNumber();
  const { enrichedItems, subtotal, shipping, total } = await calculateOrderTotals(items || []);

  const [result] = await db.query(
    `INSERT INTO orders (
      user_id, order_number, subtotal, shipping, total, total_amount, email,
      status, items, shipping_address, tracking_number, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderUserId,
      orderNumber,
      subtotal ?? total ?? 0,
      shipping ?? 0,
      total ?? subtotal ?? 0,
      total ?? subtotal ?? 0,
      email || '',
      status,
      JSON.stringify(enrichedItems),
      shipping_address || '',
      tracking_number,
      notes
    ]
  );

  await db.query(
    'INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)',
    [result.insertId, status, 'Order placed']
  );

  return {
    id: result.insertId,
    ...orderData,
    user_id: orderUserId,
    order_number: orderNumber,
    subtotal,
    shipping,
    total,
    items: enrichedItems,
    status
  };
};

// Get orders by user ID
export const getOrdersByUserId = async (userId) => {
  const [rows] = await db.query(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  
  return rows.map((order) => normalizeOrder(order));
};

// Get order by order number
export const getOrderByNumber = async (orderNumber, options = {}) => {
  const [rows] = await db.query(
    'SELECT * FROM orders WHERE order_number = ?',
    [orderNumber]
  );
  
  if (rows.length === 0) return null;
  
  const order = rows[0];
  const [statusHistory] = await db.query(
    'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC',
    [order.id]
  );

  return normalizeOrder(order, statusHistory, options);
};

// Update order status
export const updateOrderStatus = async (orderNumber, status, notes = '') => {
  const [result] = await db.query(
    'UPDATE orders SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE order_number = ?',
    [status, notes, orderNumber]
  );

  if (result.affectedRows > 0) {
    const [rows] = await db.query('SELECT id FROM orders WHERE order_number = ?', [orderNumber]);
    if (rows[0]) {
      await db.query(
        'INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)',
        [rows[0].id, status, notes || `Status updated to ${status}`]
      );
    }
  }
  
  return result.affectedRows > 0;
};

// Get all orders (for admin)
export const getAllOrders = async () => {
  const [rows] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
  
  return rows.map((order) => normalizeOrder(order));
};
