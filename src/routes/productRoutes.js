import express from 'express';
import Joi from 'joi';
import db, { databaseAvailable } from '../config/db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/security.js';

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';

const idSchema = Joi.number().integer().positive().required();

const fallbackProducts = [
  { id: 101, name: 'Nike Dunk Low', brand: 'Nike', category: 'Shoes', subCategory: 'Lifestyle', price: 120, image_url: '', sizes: [] },
  { id: 102, name: 'Adidas Spezial', brand: 'Adidas', category: 'Shoes', subCategory: 'Lifestyle', price: 110, image_url: '', sizes: [] },
  { id: 103, name: 'Carhartt Hoodie', brand: 'Carhartt', category: 'Men', subCategory: 'Hoodies', price: 85, image_url: '', sizes: ['S', 'M', 'L', 'XL'] },
  { id: 104, name: 'Nike Graphic Tee', brand: 'Nike', category: 'Men', subCategory: 'T-Shirts', price: 45, image_url: '', sizes: ['S', 'M', 'L', 'XL'] },
  { id: 105, name: 'Adidas Vintage Tee', brand: 'Adidas', category: 'Women', subCategory: 'Tops', price: 40, image_url: '', sizes: ['S', 'M', 'L'] },
  { id: 106, name: 'Carhartt Utility Pants', brand: 'Carhartt', category: 'Men', subCategory: 'Pants', price: 95, image_url: '', sizes: ['S', 'M', 'L', 'XL'] },
  { id: 107, name: 'New Balance Basic Tee', brand: 'New Balance', category: 'Men', subCategory: 'T-Shirts', price: 35, image_url: '', sizes: ['S', 'M', 'L'] },
];

const parseSizes = (sizes) => {
  if (Array.isArray(sizes)) {
    return sizes.map((size) => String(size).trim()).filter(Boolean);
  }

  if (!sizes) return [];

  try {
    const parsed = JSON.parse(sizes);
    if (Array.isArray(parsed)) {
      return parsed.map((size) => String(size).trim()).filter(Boolean);
    }
  } catch {
    // Fall through to comma-separated parsing for older/manual data.
  }

  return String(sizes)
    .split(',')
    .map((size) => size.trim())
    .filter(Boolean);
};

const normalizeProductRow = (product = {}) => ({
  ...product,
  sizes: parseSizes(product.sizes),
});

const productSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  brand: Joi.string().trim().min(1).max(255).required(),
  category: Joi.string().trim().min(1).max(255).required(),
  subCategory: Joi.string().trim().max(255).default('General'),
  price: Joi.number().positive().precision(2).max(999999.99).required(),
  sizes: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().max(50)).default([]),
      Joi.string().allow('').default('')
    )
    .default([]),
  image: Joi.string().trim().uri({ allowRelative: true }).max(500).allow('').default(''),
}).required();

const validateId = (value) => {
  const { error, value: id } = idSchema.validate(value);
  if (error) return null;
  return id;
};

// Helper to ensure tables exist
const ensureTableExists = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        brand VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        subCategory VARCHAR(255) DEFAULT 'General',
        price DECIMAL(10,2) NOT NULL,
        image_url VARCHAR(500) DEFAULT '',
        sizes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [columns] = await db.query("SHOW COLUMNS FROM products LIKE 'sizes'");
    if (columns.length === 0) {
      await db.query('ALTER TABLE products ADD COLUMN sizes TEXT NULL AFTER image_url');
    }

    return true;
  } catch (e) {
    console.error('Table creation error:', e);
    return false;
  }
};

// Development-only debug endpoint
router.get('/debug', authMiddleware, adminMiddleware, async (req, res) => {
  if (isProduction) {
    return res.status(404).json({ message: 'Route not found' });
  }

  try {
    const [tables] = await db.query("SHOW TABLES LIKE 'products'");
    const hasProductsTable = tables.length > 0;
    
    if (!hasProductsTable) {
      await ensureTableExists();
      return res.json({ status: 'created', message: 'Products table created' });
    }
    
    const [count] = await db.query('SELECT COUNT(*) as count FROM products');
    res.json({ status: 'ok', count: count[0].count });
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ error: err.message, code: err.code });
  }
});

// Development-only seed products endpoint
router.post('/seed', authMiddleware, adminMiddleware, csrfProtection, async (req, res) => {
  if (isProduction) {
    return res.status(404).json({ message: 'Route not found' });
  }

  try {
    const [count] = await db.query('SELECT COUNT(*) as count FROM products');
    if (count[0].count > 0) {
      return res.json({ message: 'Products already exist', count: count[0].count });
    }
    await db.query(`INSERT INTO products (name, brand, category, subCategory, price, image_url) VALUES
      ('Nike Dunk', 'Nike', 'Men', 'Shoes', 120, ''),
      ('Adidas Spezial', 'Adidas', 'Men', 'Shoes', 110, ''),
      ('Carhartt Hoodie', 'Carhartt', 'Men', 'Hoodies', 85, ''),
      ('Nike T-Shirt', 'Nike', 'Men', 'T-Shirts', 45, ''),
      ('Adidas T-Shirt', 'Adidas', 'Men', 'T-Shirts', 40, ''),
      ('Carhartt Pant', 'Carhartt', 'Men', 'Pants', 95, ''),
      ('New Balance Basic Tee', 'New Balance', 'Men', 'T-Shirts', 35, '')`);
    res.json({ message: 'Products seeded successfully' });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET all products
router.get('/', async (req, res, next) => {
  if (!databaseAvailable && !isProduction) {
    return res.json(fallbackProducts);
  }

  try {
    await ensureTableExists();
    const [rows] = await db.query('SELECT * FROM products');
    res.json(rows.map(normalizeProductRow));
  } catch (err) {
    if (!isProduction) {
      console.warn('Using fallback products because the database is unavailable:', err.code || err.message);
      return res.json(fallbackProducts);
    }

    console.error('Get products error:', err);
    next(err);
  }
});

// GET single product
router.get('/:id', async (req, res, next) => {
  try {
    await ensureTableExists();
    const productId = validateId(req.params.id);
    if (!productId) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const [rows] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(normalizeProductRow(rows[0]));
  } catch (err) {
    next(err);
  }
});

// CREATE product (Admin only)
router.post('/', authMiddleware, adminMiddleware, csrfProtection, async (req, res, next) => {
  try {
    await ensureTableExists();
    const { error, value } = productSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, brand, category, subCategory, price, image } = value;
    const sizes = parseSizes(value.sizes);

    const [result] = await db.query(
      'INSERT INTO products (name, brand, category, subCategory, price, image_url, sizes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, brand, category, subCategory || 'General', Number(price), image || '', JSON.stringify(sizes)]
    );

    if (!result || !result.insertId) {
      return res.status(500).json({ message: 'Failed to create product - database error' });
    }

    res.status(201).json({
      id: result.insertId,
      name,
      brand,
      category,
      subCategory: subCategory || 'General',
      price: Number(price),
      image_url: image || '',
      sizes
    });
  } catch (err) {
    console.error('Product creation error:', err);
    next(err);
  }
});

// UPDATE product (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, csrfProtection, async (req, res, next) => {
  try {
    await ensureTableExists();
    const productId = validateId(req.params.id);
    if (!productId) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const { error, value } = productSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, brand, category, subCategory, price, image } = value;
    const sizes = parseSizes(value.sizes);

    const [result] = await db.query(
      'UPDATE products SET name=?, brand=?, category=?, subCategory=?, price=?, image_url=?, sizes=? WHERE id=?',
      [name, brand, category, subCategory || 'General', Number(price), image || '', JSON.stringify(sizes), productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      id: productId,
      name,
      brand,
      category,
      subCategory: subCategory || 'General',
      price: Number(price),
      image_url: image || '',
      sizes
    });
  } catch (err) {
    next(err);
  }
});

// DELETE product (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, csrfProtection, async (req, res, next) => {
  try {
    const productId = validateId(req.params.id);
    if (!productId) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const [result] = await db.query(
      'DELETE FROM products WHERE id = ?',
      [productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
