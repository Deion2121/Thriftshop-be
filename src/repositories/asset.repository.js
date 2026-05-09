import db from '../config/db.js';

export const findAll = async () => {
  const [rows] = await db.query('SELECT * FROM assets');
  return rows;
};

export const findById = async (id) => {
  const [rows] = await db.query('SELECT * FROM assets WHERE id = ?', [id]);
  return rows[0];
};

