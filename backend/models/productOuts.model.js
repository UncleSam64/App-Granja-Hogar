/**
 * @module models/productOuts
 *
 * @description
 * This module defines the `ProductOutModel` class, which manages direct database operations 
 * related to product outflow records (`product_outs` table). 
 * 
 * It provides methods to:
 * - Retrieve all product out records.
 * - Retrieve a single record by its ID.
 * - Insert new product out entries.
 * - Update the stock of a related product.
 * 
 * @author
 * Samuel Isaac Lopez Mar
 */

import db from "./index.js";

/**
 * Model class for managing product out database operations.
 * @class
 */
class ProductOutModel {
  /**
   * Retrieves all product out records from the database, ordered by creation date (descending).
   *
   * @async
   * @memberof ProductOutModel
   * @returns {Promise<Object[]>} A promise that resolves to an array of product out records.
   *
   * @example
   * const records = await productOutModel.getAll();
   * console.log(records);
   * // [
   * //   { id: 10, user_id: 2, product_id: 8, reason_id: 2, department_id: 1, unit_id: 4, quantity: 4, notes: "Limpieza general", created_at: "2025-10-20T10:00:00Z" },
   * //   { id: 9, user_id: 2, product_id: 8, reason_id: 2, department_id: 1, unit_id: 4, quantity: 4, notes: "Limpieza general", created_at: "2025-10-19T07:00:00Z" }
   * // ]
   */
  async getAll() {
    const [rows] = await db.query(
      "SELECT * FROM product_outs ORDER BY created_at DESC"
    );
    return rows;
  }

  /**
   * Retrieves a specific product out record by its ID.
   *
   * @async
   * @memberof ProductOutModel
   * @param {number} id - The unique ID of the product out record.
   * @returns {Promise<Object|null>} The product out record if found, or `null` if it doesn’t exist.
   *
   * @example
   * const out = await productOutModel.getById(10);
   * console.log(out);
   * // { id: 10, user_id: 2, product_id: 8, reason_id: 3, department_id: 1, unit_id: 4, quantity: 4, notes: "Limpieza general", created_at: "2025-10-20T10:00:00Z" }
   */
  async getById(id) {
    const [rows] = await db.query("SELECT * FROM product_outs WHERE id = ?", [id]);
    return rows[0] || null;
  }

  /**
   * Inserts a new product out record into the database.
   *
   * @async
   * @memberof ProductOutModel
   * @param {Object} data - The data of the new product out record.
   * @param {number} data.user_id - The ID of the user registering the product outflow.
   * @param {number} data.product_id - The ID of the product being deducted.
   * @param {number} data.reason_id - The reason ID associated with the outflow.
   * @param {number} data.department_id - The department ID that receives or records the outflow.
   * @param {number} data.unit_id - The unit ID used for measuring the product.
   * @param {number} data.quantity - The quantity of the product being deducted.
   * @param {string} [data.notes] - Optional notes describing the reason or context of the outflow.
   * 
   * @returns {Promise<Object>} The MySQL response object, including `insertId` and affected rows.
   *
   * @example
   * const newOut = await productOutModel.create({
   *   user_id: 1,
   *   product_id: 15,
   *   reason_id: 3,
   *   department_id: 2,
   *   unit_id: 4,
   *   quantity: 10,
   *   notes: "Donativo a otra granja hogar."
   * });
   * console.log(newOut.insertId);
   */
  async create(data, conn = db) {
    const { user_id, product_id, reason_id, department_id, unit_id, quantity, notes } = data;

    const [result] = await conn.query(
      `INSERT INTO product_outs 
       (user_id, product_id, reason_id, department_id, unit_id, quantity, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, product_id, reason_id, department_id, unit_id, quantity, notes]
    );

    return result;
  }

}

export const productOutModel = new ProductOutModel();
