import { jest } from '@jest/globals';
import { ProductVO } from '../../valueObjects/products/product.vo.js';

/**
 * Products Service Test
 * @module ProductsServiceTest
 * @description This module contains unit tests for the ProductsService.
 *              It uses `jest` for mocking services and assertions.
 * 
 * @author Carlos Alejandro Ortiz Caro
 * @author Roberto Santiago Estrada Orozco
 * @author Renata Loaiza
 */

jest.unstable_mockModule('../../models/products.model.js', () => ({
  productsModel: {
    getCatalog: jest.fn(),
    getProductQuantity: jest.fn(),
    getInventory: jest.fn(),
    createProduct: jest.fn(),
    deleteProduct: jest.fn(),
    update: jest.fn(),
    getById: jest.fn(),
    getAvailableProducts: jest.fn(),
  },
}));

jest.unstable_mockModule('../../services/notifications.service.js', () => ({
  notificationService: { addNotification: jest.fn() },
}));

const { productsModel } = await import('../../models/products.model.js');
const { notificationService } = await import('../../services/notifications.service.js');
const { productsService } = await import('../../services/products.service.js');

const newProduct = { category_id: 1, unit_id: 1, name: 'test product', perishable: false, min_stock: 10, max_stock: 100, user_id: 3 };

beforeEach(() => {
  jest.clearAllMocks();
  notificationService.addNotification.mockResolvedValue({ id: 1 });
});

describe('Product Service', () => {
  describe('addProduct', () => {
    test('Given valid data When create Then returns success and product', async () => {
      // GIVEN
      productsModel.createProduct.mockResolvedValue([{ insertId: 1 }]);

      // WHEN
      const result = await productsService.addProduct(newProduct);

      // THEN
      expect(result.success).toBe(true);
      expect(result.product).toBeInstanceOf(ProductVO);
      expect(result.product.name).toBe('test product');
      expect(productsModel.createProduct).toHaveBeenCalledWith(1, 1, 'test product', false, 10, 100);
      expect(notificationService.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 3, product_id: 1, type_id: 1, permission_id: 4 })
      );
    });

    test('Given failed insert When create Then throws', async () => {
      // GIVEN
      productsModel.createProduct.mockResolvedValue([{}]);

      // WHEN / THEN
      await expect(productsService.addProduct(newProduct)).rejects.toThrow('El producto no pudo ser creado');
      expect(notificationService.addNotification).not.toHaveBeenCalled();
    });
  });

  describe('removeProduct', () => {
    test('Given valid ID When delete Then returns success', async () => {
      // GIVEN
      productsModel.getById.mockResolvedValue({ id: 1, name: 'arroz' });
      productsModel.deleteProduct.mockResolvedValue([{ affectedRows: 1 }]);

      // WHEN
      const result = await productsService.removeProduct(1, 3);

      // THEN
      expect(result).toEqual({ success: true, message: 'Product deleted successfully' });
      expect(productsModel.deleteProduct).toHaveBeenCalledWith(1);
      expect(notificationService.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Se ha eliminado un producto: arroz', type_id: 2 })
      );
    });

    test('Given non-existent ID When delete Then throws 404', async () => {
      // GIVEN
      productsModel.getById.mockResolvedValue(undefined);

      // WHEN / THEN
      await expect(productsService.removeProduct(999, 3)).rejects.toMatchObject({ statusCode: 404 });
      expect(productsModel.deleteProduct).not.toHaveBeenCalled();
    });
  });

  /**
   *  @author Roberto Santiago Estrada Orozco
   */

  describe('getInventory', () => {
    test('Given valid request, When getInventory, Then should return inventory list', async () => {
      // GIVEN
      productsModel.getInventory.mockResolvedValue([
        { id: 1, name: 'Product 1', actual_stock: 10, unit_id: 1 },
        { id: 2, name: 'Product 2', actual_stock: 0, unit_id: 2 },
      ]);

      // WHEN
      const result = await productsService.getInventory();

      // THEN
      expect(result).toEqual([
        { id: 1, name: 'Product 1', quantity: 10, unit: 1 },
        { id: 2, name: 'Product 2', quantity: 0, unit: 2 },
      ]);
    });

    test('Given empty inventory, When getInventory, Then should return empty array', async () => {
      // GIVEN
      productsModel.getInventory.mockResolvedValue([]);

      // WHEN
      const result = await productsService.getInventory();

      // THEN
      expect(result).toEqual([]);
    });
  });

  /**
   * @author Roberto Santiago Estrada Orozco
   */
  describe('getProductQuantity', () => {
    test('Given valid product ID, When getProductQuantity, Then should return product quantity', async () => {
      // GIVEN
      productsModel.getProductQuantity.mockResolvedValue({ name: 'Test Product', actual_stock: 15, unit_id: 1 });

      // WHEN
      const result = await productsService.getProductQuantity(1);

      // THEN
      expect(result).toEqual({ name: 'Test Product', quantity: 15, unit: 1 });
      expect(productsModel.getProductQuantity).toHaveBeenCalledWith(1);
    });

    test('Given non-existent product ID, When getProductQuantity, Then should throw 404', async () => {
      // GIVEN
      productsModel.getProductQuantity.mockResolvedValue(undefined);

      // WHEN/THEN
      await expect(productsService.getProductQuantity(999)).rejects.toMatchObject({
        statusCode: 404, message: 'Producto no encontrado',
      });
    });
  });

  describe('catalog and available products', () => {
    test('Given products, When getCatalog, Then perishable comes from the `perishable` column', async () => {
      productsModel.getCatalog.mockResolvedValue([[{ id: 1, name: 'leche', perishable: 1, category: 'Alimentos y Aseo', unit: 'L' }]]);

      const result = await productsService.getCatalog();

      expect(result).toEqual([{ id: 1, name: 'leche', perishable: true, category: 'Alimentos y Aseo', unit: 'L' }]);
    });

    test('Given products in stock, When getAvailableProducts, Then each includes its stock', async () => {
      productsModel.getAvailableProducts.mockResolvedValue([{ id: 1, name: 'leche', perishable: 1, unit_id: 2, actual_stock: '7.50' }]);

      const result = await productsService.getAvailableProducts();

      expect(result).toEqual([{ id: 1, name: 'leche', perishable: 1, unit_id: 2, actual_stock: 7.5 }]);
    });
  });

  /**
   * @author Renata Loaiza
   */
  describe('editProduct', () => {
    const edit = {
      category_id: 2, unit_id: 2, name: 'Updated Product', perishable: true, min_stock: 20, max_stock: 200, productId: 1, user_id: 1,
    };

    test('Given valid product data When edit Then returns success and updated product', async () => {
      // GIVEN
      const updatedProduct = { id: 1, name: 'Updated Product', category_id: 2, unit_id: 2, perishable: 1, min_stock: 20, max_stock: 200 };
      productsModel.getById.mockResolvedValue({ id: 1, name: 'Original Product' });
      productsModel.update.mockResolvedValue(updatedProduct);

      // WHEN
      const result = await productsService.editProduct(edit);

      // THEN
      expect(result).toEqual({ success: true, message: 'Producto editado exitosamente', product: updatedProduct });
      expect(productsModel.update).toHaveBeenCalledWith(1, {
        category_id: 2, unit_id: 2, name: 'Updated Product', perishable: true, min_stock: 20, max_stock: 200,
      });
    });

    test('Given actual_stock in the body When edit Then stock is not touched', async () => {
      // GIVEN
      productsModel.getById.mockResolvedValue({ id: 1, name: 'Original Product' });
      productsModel.update.mockResolvedValue({ id: 1 });

      // WHEN
      await productsService.editProduct({ ...edit, actual_stock: 0, is_active: false });

      // THEN
      const fields = productsModel.update.mock.calls[0][1];
      expect(fields).not.toHaveProperty('actual_stock');
      expect(fields).not.toHaveProperty('is_active');
    });

    test('Given non-existent product ID When edit Then throws 404', async () => {
      // GIVEN
      productsModel.getById.mockResolvedValue(null);

      // WHEN/THEN
      await expect(productsService.editProduct({ ...edit, productId: 999 })).rejects.toMatchObject({
        statusCode: 404, message: 'Producto no encontrado',
      });
    });

    test('Given failed update When edit Then throws error', async () => {
      // GIVEN
      productsModel.getById.mockResolvedValue({ id: 1, name: 'Original Product' });
      productsModel.update.mockResolvedValue(null);

      // WHEN/THEN
      await expect(productsService.editProduct(edit)).rejects.toThrow('El producto no pudo ser editado');
    });
  });
});
