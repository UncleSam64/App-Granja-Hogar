/**
 * @file Tests de ProductOutService
 * @description Pruebas unitarias del servicio de salidas de productos.
 * Verifica que la salida, el descuento de stock y la notificación se hagan en una sola transacción,
 * y que nunca se descuente más stock del disponible.
 * @author
 * Samuel Isaac López Mar
 */

import { jest } from "@jest/globals";
import { dbModuleMock } from "../helpers.js";

jest.unstable_mockModule("../../models/index.js", () => dbModuleMock(jest));
jest.unstable_mockModule("../../models/productOuts.model.js", () => ({
  productOutModel: { getAll: jest.fn(), getById: jest.fn(), create: jest.fn() },
}));
jest.unstable_mockModule("../../models/products.model.js", () => ({
  productsModel: { getById: jest.fn(), decreaseStock: jest.fn() },
}));
jest.unstable_mockModule("../../models/notifications.model.js", () => ({
  notificationsModel: { createNotification: jest.fn() },
}));

const { withTransaction } = await import("../../models/index.js");
const { productOutModel } = await import("../../models/productOuts.model.js");
const { productsModel } = await import("../../models/products.model.js");
const { notificationsModel } = await import("../../models/notifications.model.js");
const { productOutService } = await import("../../services/productOuts.service.js");

const outData = {
  user_id: 7, product_id: 3, reason_id: 2, department_id: 1, unit_id: 1, quantity: "4", notes: "cena",
};

describe("ProductOutService", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("create", () => {
    test("Given enough stock When create Then inserts out, decreases stock and notifies in one transaction", async () => {
      productsModel.getById.mockResolvedValue({ id: 3, name: "arroz", actual_stock: 10, is_active: 1 });
      productsModel.decreaseStock.mockResolvedValue({ affectedRows: 1 });
      productOutModel.create.mockResolvedValue({ insertId: 55 });

      const result = await productOutService.create(outData);

      expect(result).toEqual({
        success: true, updatedStock: true, insertId: 55, message: "Salida registrada correctamente",
      });
      expect(withTransaction).toHaveBeenCalledTimes(1);
      expect(productsModel.decreaseStock).toHaveBeenCalledWith(3, 4, "tx-conn");
      expect(productOutModel.create).toHaveBeenCalledWith({ ...outData, quantity: 4 }, "tx-conn");
      expect(notificationsModel.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 7, product_out_id: 55, type_id: 5, permission_id: 3 }),
        "tx-conn"
      );
      expect(notificationsModel.createNotification.mock.calls[0][0].content).toContain("4Kg");
    });

    test("Given insufficient stock When create Then throws 400 and records nothing", async () => {
      productsModel.getById.mockResolvedValue({ id: 3, name: "arroz", actual_stock: 2, is_active: 1 });
      productsModel.decreaseStock.mockResolvedValue({ affectedRows: 0 });

      await expect(productOutService.create(outData)).rejects.toMatchObject({
        statusCode: 400,
        message: "Stock insuficiente: disponibles 2, solicitados 4.",
      });
      expect(productOutModel.create).not.toHaveBeenCalled();
      expect(notificationsModel.createNotification).not.toHaveBeenCalled();
    });

    test("Given non-existent product When create Then throws 404", async () => {
      productsModel.getById.mockResolvedValue(undefined);

      await expect(productOutService.create(outData)).rejects.toMatchObject({ statusCode: 404 });
      expect(productsModel.decreaseStock).not.toHaveBeenCalled();
    });

    test("Given inactive product When create Then throws 404", async () => {
      productsModel.getById.mockResolvedValue({ id: 3, name: "arroz", actual_stock: 10, is_active: 0 });

      await expect(productOutService.create(outData)).rejects.toMatchObject({ statusCode: 404 });
      expect(productsModel.decreaseStock).not.toHaveBeenCalled();
    });

    test("Given DB error inserting the out When create Then error propagates (transaction rolls back)", async () => {
      productsModel.getById.mockResolvedValue({ id: 3, name: "arroz", actual_stock: 10, is_active: 1 });
      productsModel.decreaseStock.mockResolvedValue({ affectedRows: 1 });
      productOutModel.create.mockRejectedValue(new Error("DB down"));

      await expect(productOutService.create(outData)).rejects.toThrow("DB down");
      expect(notificationsModel.createNotification).not.toHaveBeenCalled();
    });
  });

  describe("getAll", () => {
    test("Given records When getAll Then returns them as ProductOutVO", async () => {
      productOutModel.getAll.mockResolvedValue([{ id: 1, product_id: 3, quantity: 2, notes: null }]);

      const result = await productOutService.getAll();

      expect(result.success).toBe(true);
      expect(result.data[0]).toMatchObject({ id: 1, product_id: 3, quantity: 2, notes: null });
    });

    test("Given no records When getAll Then throws 404", async () => {
      productOutModel.getAll.mockResolvedValue([]);

      await expect(productOutService.getAll()).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("getById", () => {
    test("Given existing ID When getById Then returns the record", async () => {
      productOutModel.getById.mockResolvedValue({ id: 9, product_id: 3, quantity: 1 });

      const result = await productOutService.getById(9);

      expect(result.data).toMatchObject({ id: 9, product_id: 3 });
    });

    test("Given unknown ID When getById Then throws 404", async () => {
      productOutModel.getById.mockResolvedValue(null);

      await expect(productOutService.getById(9)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
