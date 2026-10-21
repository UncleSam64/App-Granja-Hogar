/**
 * @module services/productOuts
 * 
 * @description
 * This module defines the `ProductOutService` class, which encapsulates the business logic 
 * for product out operations. It serves as the intermediary layer between controllers and models, 
 * ensuring clean separation of concerns. 
 * 
 * The service interacts with the `productOutModel` for database operations and leverages 
 * `ProductOutVO` (Value Object) for consistent data transformation. It provides methods to:
 * - Retrieve all product out records.
 * - Retrieve a single record by its ID.
 * - Create new product out entries and update product stock accordingly.
 * 
 * @author
 * Samuel Isaac Lopez Mar
 */

import { notificationsModel } from "../models/notifications.model.js";
import { withTransaction } from "../models/index.js";
import { productOutModel } from "../models/productOuts.model.js";
import { productsModel } from "../models/products.model.js";
import { AppError } from "../utils/error.util.js";
import { getUnitNameById } from "../utils/units.util.js";
import { ProductOutVO } from "../valueObjects/products/productOuts.vo.js";

/**
 * Service class responsible for implementing business logic for product outflows.
 * 
 * @class
 * @classdesc Handles operations such as retrieving, fetching, and creating product out records.
 */
class ProductOutService {
  /**
   * Retrieves all product out records from the database and converts them into `ProductOutVO` instances.
   *
   * @async
   * @memberof ProductOutService
   * @returns {Promise<{ success: boolean, data: ProductOutVO[] }>}
   * Returns a success flag and an array of `ProductOutVO` objects representing product out records.
   *
   * @example
   * const result = await productOutService.getAll();
   * // Output: { success: true, data: [ProductOutVO, ProductOutVO, ...] }
   */
  async getAll() {
    const records = await productOutModel.getAll();

    if (!records || records.length === 0)
      throw new AppError("No hay registros", 404);

    const data = records.map(record => new ProductOutVO(record));

    return { success: true, data };
  }

  /**
   * Retrieves a specific product out record by its unique identifier.
   * The retrieved data is transformed into a `ProductOutVO` instance.
   *
   * @async
   * @memberof ProductOutService
   * @param {number} id - The unique identifier of the product out record.
   * @returns {Promise<{ success: boolean, data: ProductOutVO }>}
   * Returns a success flag and a `ProductOutVO` object representing the product out record.
   *
   * @example
   * const result = await productOutService.getById(5);
   * // Output: { success: true, data: ProductOutVO }
   */
  async getById(id) {
    const record = await productOutModel.getById(id);

    if (!record) throw new AppError("Registro no encontrado", 404);

    const data = new ProductOutVO(record);

    return { success: true, data };
  }

  /**
   * Creates a new product out record and updates the product's current stock.
   * 
   * Runs in one transaction:
   * 1. Checks that the product exists and is active.
   * 2. Subtracts the quantity only if enough stock remains (single conditional UPDATE),
   *    so two simultaneous outs can never push stock below zero.
   * 3. Inserts the `product_outs` record and its notification.
   * If any step fails, nothing is written.
   * 
   * @async
   * @memberof ProductOutService
   * @param {Object} data - The data object containing the new product out information.
   * @param {number} data.user_id - The ID of the user registering the outflow (taken from the token, never the body).
   * @param {number} data.product_id - The ID of the product being deducted.
   * @param {number} data.reason_id - The ID representing the reason for the outflow.
   * @param {number} data.department_id - The ID of the department receiving the product.
   * @param {number} data.unit_id - The ID of the unit associated with the product.
   * @param {number} data.quantity - The quantity of product being deducted.
   * @param {string} [data.notes] - Optional notes or comments for the outflow record.
   * 
   * @throws {AppError} 404 if the product doesn't exist or is inactive, 400 if stock is insufficient.
   * 
   * @returns {Promise<{ success: boolean, updatedStock: boolean, insertId: number, message: string }>}
   * Returns a confirmation object containing the operation result, including the insert ID.
   * 
   * @example
   * const result = await productOutService.create({
   *   user_id: 1,
   *   product_id: 15,
   *   reason_id: 3,
   *   department_id: 2,
   *   unit_id: 4,
   *   quantity: 10,
   *   notes: "Donativo a otra granja hogar."
   * });
   * 
   * // Output:
   * // {
   * //   success: true,
   * //   updatedStock: true,
   * //   insertId: 25,
   * //   message: "Salida registrada correctamente"
   * // }
   */
  async create(data) {
    const quantity = Number(data.quantity);

    const insertId = await withTransaction(async (conn) => {
      const product = await productsModel.getById(data.product_id, conn);
      if (!product || !product.is_active) throw new AppError("Producto no encontrado", 404);

      const updatedStock = await productsModel.decreaseStock(data.product_id, quantity, conn);
      if (updatedStock.affectedRows === 0) {
        throw new AppError(
          `Stock insuficiente: disponibles ${Number(product.actual_stock)}, solicitados ${quantity}.`,
          400
        );
      }

      const result = await productOutModel.create({ ...data, quantity }, conn);

      await notificationsModel.createNotification({
        user_id: data.user_id,
        product_id: data.product_id,
        product_out_id: result.insertId,
        content: `Se ha registrado una nueva salida de ${quantity}${getUnitNameById(data.unit_id)} para el producto ${product.name}.`,
        type_id: 5,
        permission_id: 3
      }, conn);

      return result.insertId;
    });

    return {
      success: true,
      updatedStock: true,
      insertId,
      message: "Salida registrada correctamente"
    };
  }
}

export const productOutService = new ProductOutService();
