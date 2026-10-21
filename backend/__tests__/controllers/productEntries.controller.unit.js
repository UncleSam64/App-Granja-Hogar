/**
 * @file Tests de ProductEntriesController
 * @description Pruebas del controlador de entradas de productos a través de las rutas reales
 * (autenticación y express-validator incluidos). Solo el servicio está mockeado.
 * @author
 * Dania Sagarnaga Macías
 */

import { jest } from "@jest/globals";
import request from "supertest";
import { bearer } from "../helpers.js";

jest.unstable_mockModule("../../services/productEntries.service.js", () => ({
  productEntriesService: { create: jest.fn(), getAll: jest.fn(), getById: jest.fn() },
}));

const { productEntriesService } = await import("../../services/productEntries.service.js");
const { AppError } = await import("../../utils/error.util.js");
const { default: app } = await import("../../app.js");

const auth = bearer(["products-entries"], { id: 4, username: "dania" });
const validEntry = { product_id: 3, unit_id: 1, is_donation: false, quantity: 5, cost: 12.5 };

describe("ProductEntries Controller Tests", () => {
  beforeEach(() => jest.clearAllMocks());

  test("Given valid entry data When createEntry Then Status 201 and response with entry and updated stock", async () => {
    productEntriesService.create.mockResolvedValue({ message: "ok", entry: { id: 21 }, updated_stock: 15 });

    const res = await request(app).post("/v1/product-entries/new").set("Authorization", auth).send(validEntry);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: "ok", data: { entry: { id: 21 }, updated_stock: 15 } });
    expect(productEntriesService.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 4, username: "dania" }));
  });

  test("Given missing product_id When createEntry Then Error 400", async () => {
    const { product_id, ...rest } = validEntry;

    const res = await request(app).post("/v1/product-entries/new").set("Authorization", auth).send(rest);

    expect(res.status).toBe(400);
    expect(productEntriesService.create).not.toHaveBeenCalled();
  });

  test('Given is_donation "false" as text and no cost When createEntry Then Error 400', async () => {
    const res = await request(app).post("/v1/product-entries/new").set("Authorization", auth)
      .send({ product_id: 3, unit_id: 1, is_donation: "false", quantity: 5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("cost es obligatorio");
  });

  test("Given a donation without cost When createEntry Then Status 201", async () => {
    productEntriesService.create.mockResolvedValue({ message: "ok", entry: {}, updated_stock: 5 });

    const res = await request(app).post("/v1/product-entries/new").set("Authorization", auth)
      .send({ product_id: 3, unit_id: 1, is_donation: true, quantity: 5 });

    expect(res.status).toBe(201);
  });

  test("Given request to getAllEntries Then Status 200 and list of entries", async () => {
    productEntriesService.getAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const res = await request(app).get("/v1/product-entries").set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test("Given valid ID When getEntryById Then Status 200 and entry returned", async () => {
    productEntriesService.getById.mockResolvedValue({ id: 1, product_name: "frijol" });

    const res = await request(app).get("/v1/product-entries/1").set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.product_name).toBe("frijol");
  });

  test("Given unknown ID When getEntryById Then Status 404 and error message", async () => {
    productEntriesService.getById.mockRejectedValue(new AppError("Entrada no encontrada", 404));

    const res = await request(app).get("/v1/product-entries/99").set("Authorization", auth);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Entrada no encontrada");
  });
});
