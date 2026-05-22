import db from '../config/db.js';

// Find user by username
export const findByEmail = async (email) => {
  const [rows] = await db.query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return rows[0] || null;
};

// Find user by ID
export const findById = async (id) => {
  const [rows] = await db.query(
    'SELECT id, email, role FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

// Create user
export const createUser = async ({ email, password, role = 'user' }) => {
  const [result] = await db.query(
    'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
    [email, password, role]
  );
  return { id: result.insertId, email, role };
};

// Update user
export const updateUser = async (id, { email }) => {
  const [result] = await db.query(
    'UPDATE users SET email = ? WHERE id = ?',
    [email, id]
  );
  if (result.affectedRows === 0) return null;
  return { id, email };
};

export const updatePassword = async (id, password) => {
  const [result] = await db.query(
    'UPDATE users SET password = ? WHERE id = ?',
    [password, id]
  );
  return result.affectedRows > 0;
};

// Optional: get all users
export const getAllUsers = async () => {
  const [rows] = await db.query('SELECT id, email, role FROM users');
  return rows;
};
