/**
 * @file Servicio para gestionar las entradas de productos.
 * @author Dania Sagarnaga Macías
 */

import { ProductEntryVO } from "../valueObjects/products/productEntries.vo.js";
import { productEntriesModel } from "../models/productEntries.model.js";
import { productsModel } from "../models/products.model.js"; 
import { notificationsModel } from "../models/notifications.model.js";
import { getUnitNameById } from "../utils/units.util.js";
import { withTransaction } from "../models/index.js";
import { AppError } from "../utils/error.util.js";

class ProductEntriesService {
 
  async create(data) {
    /**
     * Crea una nueva entrada de producto y actualiza el stock del producto asociado.
     * @param {Object} data - Datos de la entrada de producto.
     * @returns {Object} Resultado con mensaje, entrada creada y stock actualizado.
     */

    const entryVO = new ProductEntryVO(data);

    // Insert, stock increment and notification succeed or fail together.
    const { id, newStock } = await withTransaction(async (conn) => {
      const product = await productsModel.getById(entryVO.product_id, conn);

      if (!product) throw new AppError("Producto no encontrado", 404);
      if (!product.is_active) throw new AppError("El producto no está activo", 400);

      const id = await productEntriesModel.create(entryVO, conn);
      await productsModel.increaseStock(entryVO.product_id, entryVO.quantity, conn);
      const { actual_stock } = await productsModel.getById(entryVO.product_id, conn);

      await notificationsModel.createNotification({
        user_id: entryVO.user_id,
        product_id: entryVO.product_id,
        product_entry_id: id,
        content: `Se ha registrado una nueva entrada de ${entryVO.quantity}${getUnitNameById(product.unit_id)} para el producto ${product.name}.`,
        type_id: 4,
        permission_id: 2
      }, conn);

      return { id, newStock: Number(actual_stock) };
    });

    const entry = { id, ...entryVO };

    return {
      message: `Entrada creada por el usuario ${entryVO.user_id} y stock actualizado correctamente`,
      entry,
      updated_stock: newStock
    };
  }

  async getAll() {
    /**
     * Obtiene todas las entradas de productos.
     * @returns {Array} Lista de entradas de productos.
     */
    return await productEntriesModel.getAll();
  }

  async getById(id) {
    /**
     * Obtiene una entrada de producto por su ID.
     * @param {number} id - ID de la entrada de producto.
     * @returns {Object} Entrada de producto correspondiente al ID.
     */
    const entry = await productEntriesModel.getById(id);
    if (!entry) throw new AppError("Entrada no encontrada", 404);
    return entry;
  }
}

export const productEntriesService = new ProductEntriesService();