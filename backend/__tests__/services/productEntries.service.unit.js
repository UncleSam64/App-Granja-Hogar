/**
 * @file Tests del servicio de entradas de productos.
 * @author Dania Sagarnaga Macías
 */

import { jest } from "@jest/globals";
import { dbModuleMock } from "../helpers.js";

jest.unstable_mockModule("../../models/index.js", () => dbModuleMock(jest));
jest.unstable_mockModule("../../models/productEntries.model.js", () => ({
  productEntriesModel: { create: jest.fn(), getAll: jest.fn(), getById: jest.fn() },
}));
jest.unstable_mockModule("../../models/products.model.js", () => ({
  productsModel: { getById: jest.fn(), increaseStock: jest.fn() },
}));
jest.unstable_mockModule("../../models/notifications.model.js", () => ({
  notificationsModel: { createNotification: jest.fn() },
}));

const { withTransaction } = await import("../../models/index.js");
const { productEntriesModel } = await import("../../models/productEntries.model.js");
const { productsModel } = await import("../../models/products.model.js");
const { notificationsModel } = await import("../../models/notifications.model.js");
const { productEntriesService } = await import("../../services/productEntries.service.js");

const entryData = {
  product_id: "3", user_id: 7, unit_id: "1", is_donation: false, quantity: "5", cost: "12.5", exp_date: null,
};

describe("ProductEntriesService", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("should create a product entry and update stock successfully", async () => {
      productsModel.getById
        .mockResolvedValueOnce({ id: 3, name: "frijol", unit_id: 1, actual_stock: 10, is_active: 1 })
        .mockResolvedValueOnce({ id: 3, actual_stock: 15 });
      productEntriesModel.create.mockResolvedValue(21);

      const result = await productEntriesService.create(entryData);

      expect(withTransaction).toHaveBeenCalledTimes(1);
      expect(productEntriesModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ product_id: 3, quantity: 5, cost: 12.5, is_donation: false }),
        "tx-conn"
      );
      // Stock is incremented in SQL, not computed from a value read earlier.
      expect(productsModel.increaseStock).toHaveBeenCalledWith(3, 5, "tx-conn");
      expect(notificationsModel.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ product_entry_id: 21, type_id: 4, permission_id: 2 }),
        "tx-conn"
      );
      expect(result.updated_stock).toBe(15);
      expect(result.entry).toMatchObject({ id: 21, product_id: 3, quantity: 5 });
    });

    it("should ignore cost for donations", async () => {
      productsModel.getById
        .mockResolvedValueOnce({ id: 3, name: "frijol", unit_id: 1, actual_stock: 0, is_active: 1 })
        .mockResolvedValueOnce({ id: 3, actual_stock: 5 });
      productEntriesModel.create.mockResolvedValue(22);

      await productEntriesService.create({ ...entryData, is_donation: true });

      expect(productEntriesModel.create.mock.calls[0][0].cost).toBeNull();
    });

    it("should keep exp_date as the calendar date that was sent", async () => {
      productsModel.getById
        .mockResolvedValueOnce({ id: 3, name: "leche", unit_id: 2, actual_stock: 0, is_active: 1 })
        .mockResolvedValueOnce({ id: 3, actual_stock: 5 });
      productEntriesModel.create.mockResolvedValue(23);

      await productEntriesService.create({ ...entryData, exp_date: "2026-12-01" });

      expect(productEntriesModel.create.mock.calls[0][0].exp_date).toBe("2026-12-01");
    });

    it("should throw 404 if product is not found", async () => {
      productsModel.getById.mockResolvedValue(undefined);

      await expect(productEntriesService.create(entryData)).rejects.toMatchObject({
        statusCode: 404, message: "Producto no encontrado",
      });
      expect(productEntriesModel.create).not.toHaveBeenCalled();
    });

    it("should throw 400 if product is not active", async () => {
      productsModel.getById.mockResolvedValue({ id: 3, is_active: 0 });

      await expect(productEntriesService.create(entryData)).rejects.toMatchObject({
        statusCode: 400, message: "El producto no está activo",
      });
      expect(productsModel.increaseStock).not.toHaveBeenCalled();
    });
  });

  describe("getAll", () => {
    it("should return all product entries", async () => {
      const rows = [{ id: 1, product_name: "frijol" }, { id: 2, product_name: "arroz" }];
      productEntriesModel.getAll.mockResolvedValue(rows);

      await expect(productEntriesService.getAll()).resolves.toEqual(rows);
    });
  });

  describe("getById", () => {
    it("should return a product entry by id", async () => {
      productEntriesModel.getById.mockResolvedValue({ id: 1, product_name: "frijol" });

      await expect(productEntriesService.getById(1)).resolves.toEqual({ id: 1, product_name: "frijol" });
    });

    it("should throw 404 if entry is not found", async () => {
      productEntriesModel.getById.mockResolvedValue(undefined);

      await expect(productEntriesService.getById(99)).rejects.toMatchObject({
        statusCode: 404, message: "Entrada no encontrada",
      });
    });
  });
});
