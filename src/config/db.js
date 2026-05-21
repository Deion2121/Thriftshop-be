import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export let databaseAvailable = false;

const getTableColumns = async (connection, tableName) => {
  const [columns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Set(columns.map((column) => column.Field));
};

const addColumnIfMissing = async (connection, columns, tableName, columnName, definition) => {
  if (columns.has(columnName)) return;

  await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
  columns.add(columnName);
};

const ensureOrderTableSchema = async (connection) => {
  const columns = await getTableColumns(connection, 'orders');

  await addColumnIfMissing(
    connection,
    columns,
    'orders',
    'order_number',
    'order_number VARCHAR(20) NULL UNIQUE'
  );
  await addColumnIfMissing(
    connection,
    columns,
    'orders',
    'subtotal',
    'subtotal DECIMAL(10,2) NOT NULL DEFAULT 0'
  );
  await addColumnIfMissing(
    connection,
    columns,
    'orders',
    'shipping',
    'shipping DECIMAL(10,2) NOT NULL DEFAULT 0'
  );
  await addColumnIfMissing(
    connection,
    columns,
    'orders',
    'total',
    'total DECIMAL(10,2) NOT NULL DEFAULT 0'
  );
  await addColumnIfMissing(
    connection,
    columns,
    'orders',
    'total_amount',
    'total_amount DECIMAL(10,2) NULL'
  );
  await addColumnIfMissing(
    connection,
    columns,
    'orders',
    'items',
    'items JSON NULL'
  );
  await addColumnIfMissing(
    connection,
    columns,
    'orders',
    'email',
    'email VARCHAR(255) NULL'
  );
  await addColumnIfMissing(
    connection,
    columns,
    'orders',
    'notes',
    'notes TEXT'
  );
};

  // Initialize database tables
  const initTables = async () => {
    try {
      const connection = await pool.getConnection();

      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role ENUM('user', 'admin') DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
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

      await connection.query(`
        CREATE TABLE IF NOT EXISTS assets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(255) NOT NULL,
          location VARCHAR(255) DEFAULT '',
          status ENUM('available', 'in_use', 'maintenance', 'retired') DEFAULT 'available',
          assigned_to INT NULL,
          assigned_at TIMESTAMP NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          order_number VARCHAR(20) NOT NULL UNIQUE,
          subtotal DECIMAL(10,2) NOT NULL,
          shipping DECIMAL(10,2) DEFAULT 0,
          total DECIMAL(10,2) NOT NULL,
          total_amount DECIMAL(10,2) NULL,
          email VARCHAR(255) NULL,
          status ENUM('pending', 'confirmed', 'shipped', 'in_transit', 'delivered') DEFAULT 'pending',
          items JSON NULL,
          shipping_address TEXT,
          tracking_number VARCHAR(100) DEFAULT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await ensureOrderTableSchema(connection);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS order_status_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          status ENUM('pending', 'confirmed', 'shipped', 'in_transit', 'delivered') NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
      `);

      databaseAvailable = true;
      console.log('MySQL connected and tables initialized');
      connection.release();
    } catch (err) {
      databaseAvailable = false;
      console.error(
        'Database initialization failed:',
        err.code || err.message || 'Unable to connect to MySQL'
      );
      console.warn('Server will keep running with limited read-only fallback data.');
    }
  };

initTables();

export default pool;
