import express from 'express';
import Joi from 'joi';
import db from '../config/db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/security.js';

const router = express.Router();

const defaultSettings = {
  store: {
    name: 'JThrift',
    logo: '',
    email: 'support@jthrift.local',
    phone: '',
    address: '',
  },
  localization: {
    currency: 'PHP',
    language: 'en',
  },
  shipping: {
    enabled: true,
    freeShippingThreshold: 3000,
    flatRate: 150,
    processingDays: 2,
  },
  tax: {
    enabled: false,
    rate: 0,
    taxId: '',
  },
  payments: {
    cashOnDelivery: true,
    card: false,
    gcash: true,
    bankTransfer: false,
  },
  orders: {
    autoConfirm: false,
    allowCancellation: true,
    lowStockThreshold: 3,
    defaultStatus: 'pending',
  },
  notifications: {
    orderEmails: true,
    shippingEmails: true,
    lowStockAlerts: true,
    marketingEmails: false,
  },
};

const settingsSchema = Joi.object({
  store: Joi.object({
    name: Joi.string().trim().min(2).max(120).required(),
    logo: Joi.string().trim().uri({ allowRelative: true }).max(500).allow('').default(''),
    email: Joi.string().trim().email().max(255).required(),
    phone: Joi.string().trim().max(40).allow('').default(''),
    address: Joi.string().trim().max(500).allow('').default(''),
  }).required(),
  localization: Joi.object({
    currency: Joi.string().trim().uppercase().valid('PHP', 'USD', 'EUR', 'GBP', 'JPY').required(),
    language: Joi.string().trim().valid('en', 'fil', 'es', 'fr', 'ja').required(),
  }).required(),
  shipping: Joi.object({
    enabled: Joi.boolean().required(),
    freeShippingThreshold: Joi.number().min(0).max(999999).required(),
    flatRate: Joi.number().min(0).max(999999).required(),
    processingDays: Joi.number().integer().min(0).max(60).required(),
  }).required(),
  tax: Joi.object({
    enabled: Joi.boolean().required(),
    rate: Joi.number().min(0).max(100).required(),
    taxId: Joi.string().trim().max(80).allow('').default(''),
  }).required(),
  payments: Joi.object({
    cashOnDelivery: Joi.boolean().required(),
    card: Joi.boolean().required(),
    gcash: Joi.boolean().required(),
    bankTransfer: Joi.boolean().required(),
  }).required(),
  orders: Joi.object({
    autoConfirm: Joi.boolean().required(),
    allowCancellation: Joi.boolean().required(),
    lowStockThreshold: Joi.number().integer().min(0).max(999).required(),
    defaultStatus: Joi.string().valid('pending', 'confirmed').required(),
  }).required(),
  notifications: Joi.object({
    orderEmails: Joi.boolean().required(),
    shippingEmails: Joi.boolean().required(),
    lowStockAlerts: Joi.boolean().required(),
    marketingEmails: Joi.boolean().required(),
  }).required(),
}).required();

const mergeSettings = (settings = {}) => ({
  store: { ...defaultSettings.store, ...(settings.store || {}) },
  localization: { ...defaultSettings.localization, ...(settings.localization || {}) },
  shipping: { ...defaultSettings.shipping, ...(settings.shipping || {}) },
  tax: { ...defaultSettings.tax, ...(settings.tax || {}) },
  payments: { ...defaultSettings.payments, ...(settings.payments || {}) },
  orders: { ...defaultSettings.orders, ...(settings.orders || {}) },
  notifications: { ...defaultSettings.notifications, ...(settings.notifications || {}) },
});

const ensureSettingsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id TINYINT PRIMARY KEY DEFAULT 1,
      settings JSON NOT NULL,
      updated_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
};

const readSettings = async () => {
  await ensureSettingsTable();
  const [rows] = await db.query('SELECT settings FROM admin_settings WHERE id = 1');

  if (!rows.length) {
    await db.query('INSERT INTO admin_settings (id, settings) VALUES (1, ?)', [
      JSON.stringify(defaultSettings),
    ]);
    return defaultSettings;
  }

  const stored = typeof rows[0].settings === 'string' ? JSON.parse(rows[0].settings) : rows[0].settings;
  return mergeSettings(stored);
};

router.use(authMiddleware, adminMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const settings = await readSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

router.put('/', csrfProtection, async (req, res, next) => {
  try {
    const { error, value } = settingsSchema.validate(mergeSettings(req.body), {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    await ensureSettingsTable();
    await db.query(
      `INSERT INTO admin_settings (id, settings, updated_by)
       VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE settings = VALUES(settings), updated_by = VALUES(updated_by)`,
      [JSON.stringify(value), req.user.id]
    );

    res.json(value);
  } catch (err) {
    next(err);
  }
});

export default router;
