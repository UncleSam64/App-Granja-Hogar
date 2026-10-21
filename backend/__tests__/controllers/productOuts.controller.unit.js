/**
 * @file Tests de ProductOutsController
 * @description Pruebas del controlador de salidas de productos a través de las rutas reales
 * (autenticación y express-validator incluidos). Solo el servicio está mockeado.
 * @author
 * Samuel Isaac López Mar
 */

import { jest } from "@jest/globals";
import request from "supertest";
import { bearer } from "../helpers.js";

jest.unstable_mockModule("../../services/productOuts.service.js", () => ({
  productOutService: { getAll: jest.fn(), getById: jest.fn(), create: jest.fn() },
}));

const { productOutService } = await import("../../services/productOuts.service.js");
const { AppError } = await import("../../utils/error.util.js");
const { default: app } = await import("../../app.js");

const auth = bearer(["products-outs"], { id: 7 });
const validOut = { product_id: 3, reason_id: 2, department_id: 1, unit_id: 1, quantity: 4, notes: "cena" };

describe("ProductOuts Controller Tests", () => {
  beforeEach(() => jest.clearAllMocks());

  test("Given valid out data When createOut Then 201 and success message", async () => {
    productOutService.create.mockResolvedValue({ success: true, updatedStock: true, insertId: 55, message: "Salida registrada correctamente" });

    const res = await request(app).post("/v1/product-outs").set("Authorization", auth).send(validOut);

    expect(res.status).toBe(201);
    expect(res.body.insertId).toBe(55);
  });

  test("Given a user_id in the body When createOut Then the logged-in user is recorded instead", async () => {
    productOutService.create.mockResolvedValue({ success: true });

    await request(app).post("/v1/product-outs").set("Authorization", auth).send({ ...validOut, user_id: 999 });

    expect(productOutService.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 7, quantity: 4 }));
  });

  test("Given missing product_id When createOut Then 400", async () => {
    const { product_id, ...rest } = validOut;

    const res = await request(app).post("/v1/product-outs").set("Authorization", auth).send(rest);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("product_id");
    expect(productOutService.create).not.toHaveBeenCalled();
  });

  test("Given zero or negative quantity When createOut Then 400", async () => {
    const res = await request(app).post("/v1/product-outs").set("Authorization", auth).send({ ...validOut, quantity: -1 });

    expect(res.status).toBe(400);
    expect(productOutService.create).not.toHaveBeenCalled();
  });

  test("Given insufficient stock When createOut Then 400 with the service message", async () => {
    productOutService.create.mockRejectedValue(new AppError("Stock insuficiente: disponibles 2, solicitados 4.", 400));

    const res = await request(app).post("/v1/product-outs").set("Authorization", auth).send(validOut);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Stock insuficiente: disponibles 2, solicitados 4.");
  });

  test("Given a user without products-outs permission When createOut Then 403", async () => {
    const res = await request(app).post("/v1/product-outs").set("Authorization", bearer(["generate-reports"])).send(validOut);

    expect(res.status).toBe(403);
  });

  test("Given no token When createOut Then 401", async () => {
    const res = await request(app).post("/v1/product-outs").send(validOut);

    expect(res.status).toBe(401);
  });

  test("Given request to getAllOuts Then 200 and list of outs", async () => {
    productOutService.getAll.mockResolvedValue({ success: true, data: [{ id: 1 }] });

    const res = await request(app).get("/v1/product-outs").set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 1 }]);
  });

  test("Given valid ID When getOutById Then 200 and record returned", async () => {
    productOutService.getById.mockResolvedValue({ success: true, data: { id: 9 } });

    const res = await request(app).get("/v1/product-outs/9").set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(productOutService.getById).toHaveBeenCalledWith("9");
  });

  test("Given unknown ID When getOutById Then 404 and error message", async () => {
    productOutService.getById.mockRejectedValue(new AppError("Registro no encontrado", 404));

    const res = await request(app).get("/v1/product-outs/9").set("Authorization", auth);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Registro no encontrado");
  });

  test("Given non-numeric ID When getOutById Then 400", async () => {
    const res = await request(app).get("/v1/product-outs/abc").set("Authorization", auth);

    expect(res.status).toBe(400);
  });
});
