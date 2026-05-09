import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ecommerce_db'
});

async function seed() {
  try {
    // Check table structure
    const [columns] = await pool.query('DESCRIBE products');
    console.log('Columns:', columns.map(c => c.Field));
    
    const [existing] = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log('Existing count:', existing[0].count);
    
    if (existing[0].count > 0) {
      console.log(`${existing[0].count} products already exist`);
      return;
    }
    
    // Use image_url column
    const data = [['Nike Dunk', 'Nike', 'Men', 'Shoes', 120, ''], ['Adidas Spezial', 'Adidas', 'Men', 'Shoes', 110, ''], ['Carhartt Hoodie', 'Carhartt', 'Men', 'Hoodies', 85, ''], ['Nike T-Shirt', 'Nike', 'Men', 'T-Shirts', 45, ''], ['Adidas T-Shirt', 'Adidas', 'Men', 'T-Shirts', 40, ''], ['Carhartt Pant', 'Carhartt', 'Men', 'Pants', 95, ''], ['New Balance Basic Tee', 'New Balance', 'Men', 'T-Shirts', 35, '']];
    
    await pool.query(`INSERT INTO products (name, brand, category, subCategory, price, image_url) VALUES ?`, [data]);
    console.log('Products seeded successfully');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    process.exit(0);
  }
}

seed();