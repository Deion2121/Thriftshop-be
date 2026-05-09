import express from 'express';
import db from '../config/db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    return true;
  } catch (e) {
    console.error('Table creation error:', e);
    return false;
  }
};

// Debug endpoint
router.get('/debug', async (req, res) => {
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

// Seed products endpoint (for development)
router.post('/seed', async (req, res) => {
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
  try {
    await ensureTableExists();
    const [rows] = await db.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error('Get products error:', err);
    next(err);
  }
});

// GET single product
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// CREATE product (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    await ensureTableExists();
    const { name, brand, category, subCategory, price, image } = req.body;

    if (!name || !brand || !category || price === undefined || price === null || price === '') {
      return res.status(400).json({ message: 'Name, brand, category, and price are required' });
    }

    const [result] = await db.query(
      'INSERT INTO products (name, brand, category, subCategory, price, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, brand, category, subCategory || 'General', Number(price), image || '']
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
      image_url: image || ''
    });
  } catch (err) {
    console.error('Product creation error:', err);
    next(err);
  }
});

// UPDATE product (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { name, brand, category, subCategory, price, image } = req.body;

    if (!name || !brand || !category || price === undefined || price === null || price === '') {
      return res.status(400).json({ message: 'Name, brand, category, and price are required' });
    }

    const [result] = await db.query(
      'UPDATE products SET name=?, brand=?, category=?, subCategory=?, price=?, image_url=? WHERE id=?',
      [name, brand, category, subCategory || 'General', Number(price), image || '', req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      id: Number(req.params.id),
      name,
      brand,
      category,
      subCategory: subCategory || 'General',
      price: Number(price),
      image_url: image || ''
    });
  } catch (err) {
    next(err);
  }
});

// DELETE product (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const [result] = await db.query(
      'DELETE FROM products WHERE id = ?',
      [req.params.id]
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
