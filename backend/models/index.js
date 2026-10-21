/**
 * @module models/index.js
 * 
 * @description
 * This module initializes a MySQL connection pool using the `mysql2/promise` library.
 * Connection details are loaded from environment variables using `dotenv`.
 * 
 * @example
 * import db from './models/index.js';
 * const [rows] = await db.query('SELECT * FROM products');
 *
 * @author Yahir Alfredo Tapia Sifuentes
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  decimalNumbers: true,
});

/**
 * Runs `fn` inside a transaction on a dedicated connection.
 * Commits if `fn` resolves, rolls back if it throws.
 *
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<any>} fn
 */
export const withTransaction = async (fn) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export default pool