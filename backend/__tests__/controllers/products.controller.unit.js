import { jest } from '@jest/globals';
import request from 'supertest';
import { bearer } from '../helpers.js';

/**
 * Products Controller Unit Test
 * @module ProductsControllerUnitTest
 * @description This module contains unit tests for the ProductsController.
 *              It uses `jest` and `supertest` for mocking services and testing HTTP endpoints.
 * 
 * @author Roberto Santiago Estrada Orozco
 * @author Carlos Alejandro Ortiz Caro
 * @author Renata Loaiza
 */

jest.unstable_mockModule('../../services/products.service.js', () => ({
  productsService: {
    getCatalog: jest.fn(),
    getProductQuantity: jest.fn(),
    getInventory: jest.fn(),
    getProduct: jest.fn(),
    addProduct: jest.fn(),
    removeProduct: jest.fn(),
    editProduct: jest.fn(),
    getAvailableProducts: jest.fn(),
    getAvailableProductsForEntries: jest.fn(),
  },
}));

const { productsService } = await import('../../services/products.service.js');
const { AppError } = await import('../../utils/error.util.js');
const { default: app } = await import('../../app.js');

const editor = bearer(['edit-catalog'], { id: 3 });
const anyUser = bearer(['products-outs']);
const product = { category_id: 1, unit_id: 1, name: 'Leche 1/2 L', perishable: false, min_stock: 10, max_stock: 100 };

describe("Product Controller unit tests", () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Create Product Endpoint Test', () => {
    test('Given product When create Then status 200', async () => {
      productsService.addProduct.mockResolvedValue({ success: true, product: { name: 'leche 1/2 l' } });

      const res = await request(app).post('/v1/products/create').set('Authorization', editor).send(product);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Names are lower-cased but no longer HTML-escaped ("/" used to become "&#x2F;").
      expect(productsService.addProduct).toHaveBeenCalledWith({ ...product, name: 'leche 1/2 l', user_id: 3 });
    });

    test('Given product with invalid data When create Then error 400', async () => {
      const res = await request(app).post('/v1/products/create').set('Authorization', editor)
        .send({ ...product, category_id: 'invalid', name: '' });

      expect(res.status).toBe(400);
      expect(productsService.addProduct).not.toHaveBeenCalled();
    });

    test('Given negative min_stock When create Then error 400', async () => {
      const res = await request(app).post('/v1/products/create').set('Authorization', editor).send({ ...product, min_stock: -10 });

      expect(res.status).toBe(400);
    });

    test('Given product with missing data When create Then error 400', async () => {
      const { unit_id, ...rest } = product;

      const res = await request(app).post('/v1/products/create').set('Authorization', editor).send(rest);

      expect(res.status).toBe(400);
    });

    test('Given a user without edit-catalog When create Then error 403', async () => {
      const res = await request(app).post('/v1/products/create').set('Authorization', anyUser).send(product);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /v1/products/delete/:id', () => {
    test('Should delete a product successfully', async () => {
      productsService.removeProduct.mockResolvedValue({ success: true, message: 'Product deleted successfully' });

      const res = await request(app).delete('/v1/products/delete/1').set('Authorization', editor);

      expect(res.status).toBe(200);
      expect(productsService.removeProduct).toHaveBeenCalledWith('1', 3);
    });

    test('Given invalid product ID When delete Then error 400', async () => {
      const res = await request(app).delete('/v1/products/delete/invalid').set('Authorization', editor);

      expect(res.status).toBe(400);
    });

    test('Given non-existent product ID When delete Then error 404', async () => {
      productsService.removeProduct.mockRejectedValue(new AppError('Producto no encontrado', 404));

      const res = await request(app).delete('/v1/products/delete/9999').set('Authorization', editor);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Producto no encontrado');
    });
  });

  /**
   * @author Roberto Santiago Estrada Orozco
   */
  describe('GET /v1/products/inventory', () => {
    test('Given valid request, When getInventory, Then return 200 and inventory list', async () => {
      productsService.getInventory.mockResolvedValue([{ id: 1, name: 'arroz', quantity: 10, unit: 1 }]);

      const res = await request(app).get('/v1/products/inventory').set('Authorization', anyUser);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 1, name: 'arroz', quantity: 10, unit: 1 }]);
    });

    test('Given empty inventory, When getInventory, Then return 200 and empty array', async () => {
      productsService.getInventory.mockResolvedValue([]);

      const res = await request(app).get('/v1/products/inventory').set('Authorization', anyUser);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('Given service error, When getInventory, Then return 500', async () => {
      productsService.getInventory.mockRejectedValue(new Error('DB down'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/v1/products/inventory').set('Authorization', anyUser);

      expect(res.status).toBe(500);
    });
  });

  /**
   * @author Roberto Santiago Estrada Orozco
   */
  describe('GET /v1/products/:id/quantity', () => {
    test('Given valid product ID, When getProductQuantity, Then return 200 and product quantity', async () => {
      productsService.getProductQuantity.mockResolvedValue({ name: 'arroz', quantity: 15, unit: 1 });

      const res = await request(app).get('/v1/products/1/quantity').set('Authorization', anyUser);

      expect(res.status).toBe(200);
      expect(res.body.quantity).toBe(15);
    });

    test('Given non-existent product ID, When getProductQuantity, Then return 404', async () => {
      productsService.getProductQuantity.mockRejectedValue(new AppError('Producto no encontrado', 404));

      const res = await request(app).get('/v1/products/999/quantity').set('Authorization', anyUser);

      expect(res.status).toBe(404);
    });

    test('Given invalid product ID format, When getProductQuantity, Then return 400', async () => {
      const res = await request(app).get('/v1/products/abc/quantity').set('Authorization', anyUser);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/products/available-products', () => {
    test('Given products in stock, When requested by a products-outs user, Then return 200 with stock', async () => {
      productsService.getAvailableProducts.mockResolvedValue([{ id: 1, name: 'arroz', actual_stock: 4 }]);

      const res = await request(app).get('/v1/products/available-products').set('Authorization', anyUser);

      expect(res.status).toBe(200);
      expect(res.body[0].actual_stock).toBe(4);
    });
  });

  /**
   * @author Renata Loaiza
   */
  describe('PUT /v1/products/editar/:id', () => {
    test('Given valid product data When edit Then status 200', async () => {
      productsService.editProduct.mockResolvedValue({ success: true, message: 'Producto editado exitosamente', product: { id: 1 } });

      const res = await request(app).put('/v1/products/editar/1').set('Authorization', editor).send(product);

      expect(res.status).toBe(200);
      expect(productsService.editProduct).toHaveBeenCalledWith(expect.objectContaining({ productId: '1', user_id: 3 }));
    });

    test('Given invalid product data When edit Then error 400', async () => {
      const res = await request(app).put('/v1/products/editar/1').set('Authorization', editor).send({ ...product, perishable: 'maybe' });

      expect(res.status).toBe(400);
    });

    test('Given missing required fields When edit Then error 400', async () => {
      const res = await request(app).put('/v1/products/editar/1').set('Authorization', editor).send({ name: 'arroz' });

      expect(res.status).toBe(400);
    });

    test('Given invalid product ID When edit Then error 400', async () => {
      const res = await request(app).put('/v1/products/editar/abc').set('Authorization', editor).send(product);

      expect(res.status).toBe(400);
    });

    test('Given non-existent product ID When edit Then error 404', async () => {
      productsService.editProduct.mockRejectedValue(new AppError('Producto no encontrado', 404));

      const res = await request(app).put('/v1/products/editar/999').set('Authorization', editor).send(product);

      expect(res.status).toBe(404);
    });
  });
});
