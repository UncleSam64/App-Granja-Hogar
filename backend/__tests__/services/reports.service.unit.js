/**
 * Reports Service Test
 * @module Reports.Service.Unit
 * @description This module contains unit tests for the ReportsService.
 *              The database and notifications are mocked; the value objects and ExcelJS are real,
 *              so the tests check what actually ends up in the generated files.
 *              (Timing checks live in __tests__/performance, run with k6.)
 *
 * @author Yahir Alfredo Tapia Sifuentes
 */
import { jest } from "@jest/globals";

jest.unstable_mockModule("../../models/reports.model.js", () => ({
  reportsModel: {
    postReportInventory: jest.fn(),
    postReportEntries: jest.fn(),
    postReportOuts: jest.fn(),
    postReport: jest.fn(),
    postReportInclude: jest.fn(),
  },
}));

jest.unstable_mockModule("../../services/notifications.service.js", () => ({
  notificationService: { addNotification: jest.fn() },
}));

const { reportsModel } = await import("../../models/reports.model.js");
const { notificationService } = await import("../../services/notifications.service.js");
const { reportsService } = await import("../../services/reports.service.js");

const createdAt = new Date("2023-01-10T10:00:00");

const MOCK_USER_ID = 1;
const MOCK_INITIAL_DATE = "2023-01-01";
const MOCK_END_DATE = "2023-01-31";
const MOCK_REPORT_ID = 50;

const MOCK_INVENTORY_ROWS = [
  { name: "arroz", perishable: 0, category: "Alimentos y Aseo", unit: "Kg", actual_stock: 100, min_stock: 10, max_stock: 200, created_at: createdAt, updated_at: createdAt },
  { name: "huevos", perishable: 1, category: "Alimentos y Aseo", unit: "Pcs", actual_stock: 50, min_stock: 30, max_stock: 300, created_at: createdAt, updated_at: createdAt },
];
const MOCK_ENTRIES_ROWS = [
  { name: "leche", user: "ana lopez", is_donation: 1, unit: "L", quantity: 50, exp_date: new Date("2023-02-01T00:00:00"), created_at: createdAt },
  // Non-perishable entries have no expiration date; this used to crash report generation.
  { name: "harina", user: "ana lopez", is_donation: 0, unit: "Kg", quantity: 20, exp_date: null, created_at: createdAt },
];
const MOCK_OUTS_ROWS = [
  { productName: "jamon", userName: "luis perez", reason: "Uso", departmentName: "Cocina", unit: "Kg", quantity: 5, notes: "", created_at: createdAt },
];

const mockDoc = () => ({
  image: jest.fn().mockReturnThis(),
  fontSize: jest.fn().mockReturnThis(),
  font: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  moveDown: jest.fn().mockReturnThis(),
  table: jest.fn().mockReturnThis(),
});

const sheetRows = (workbook, name) =>
  workbook.getWorksheet(name).getSheetValues().slice(1).map((row) => row.slice(1));

describe('ReportsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reportsModel.postReport.mockResolvedValue([{ insertId: MOCK_REPORT_ID }]);
  });

  describe('postReportPDFService', () => {
    test('1. Debe generar un PDF con las 3 secciones (1, 2, 3) y notificar', async () => {
      reportsModel.postReportInventory.mockResolvedValue([MOCK_INVENTORY_ROWS]);
      reportsModel.postReportEntries.mockResolvedValue([MOCK_ENTRIES_ROWS]);
      reportsModel.postReportOuts.mockResolvedValue([MOCK_OUTS_ROWS]);
      const doc = mockDoc();

      const resultDoc = await reportsService.postReportPDFService({
        doc, userId: MOCK_USER_ID, initialDate: MOCK_INITIAL_DATE, endDate: MOCK_END_DATE, type: [1, 2, 3],
      });

      expect(resultDoc).toBe(doc);
      expect(doc.table).toHaveBeenCalledTimes(3);
      expect(reportsModel.postReportEntries).toHaveBeenCalledWith(MOCK_INITIAL_DATE, MOCK_END_DATE);
      expect(reportsModel.postReportInclude.mock.calls).toEqual([[MOCK_REPORT_ID, 1], [MOCK_REPORT_ID, 2], [MOCK_REPORT_ID, 3]]);
      expect(notificationService.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: MOCK_USER_ID, content: expect.stringContaining("pdf") })
      );
    });

    test('2. Debe mostrar nombres de categoría/unidad y el perecedero real en el inventario', async () => {
      reportsModel.postReportInventory.mockResolvedValue([MOCK_INVENTORY_ROWS]);
      const doc = mockDoc();

      await reportsService.postReportPDFService({
        doc, userId: MOCK_USER_ID, initialDate: MOCK_INITIAL_DATE, endDate: MOCK_END_DATE, type: [1],
      });

      const [, arroz, huevos] = doc.table.mock.calls[0][0].data;
      expect(arroz.slice(0, 4)).toEqual(["arroz", "Alimentos y Aseo", "No", "Kg"]);
      expect(huevos.slice(0, 4)).toEqual(["huevos", "Alimentos y Aseo", "Si", "Pcs"]);
    });

    test('3. Debe generar entradas sin fecha de vencimiento como "N/A"', async () => {
      reportsModel.postReportEntries.mockResolvedValue([MOCK_ENTRIES_ROWS]);
      const doc = mockDoc();

      await reportsService.postReportPDFService({
        doc, userId: MOCK_USER_ID, initialDate: MOCK_INITIAL_DATE, endDate: MOCK_END_DATE, type: [2],
      });

      const rows = doc.table.mock.calls[0][0].data;
      expect(rows[1]).toEqual(["leche", "ana lopez", "Si", "L", 50, "02-01-23", "01-10-23 10:00"]);
      expect(rows[2][5]).toBe("N/A");
    });

    test('4. Debe generar solo la sección de Entradas (2) y manejar datos vacíos en esa sección', async () => {
      reportsModel.postReportEntries.mockResolvedValue([[]]);
      const doc = mockDoc();

      await reportsService.postReportPDFService({
        doc, userId: MOCK_USER_ID, initialDate: MOCK_INITIAL_DATE, endDate: MOCK_END_DATE, type: [2],
      });

      expect(reportsModel.postReportInventory).not.toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalledWith('Entradas', { align: 'left' });
      expect(doc.table).toHaveBeenCalledTimes(1);
      expect(doc.table.mock.calls[0][0].data.length).toBe(1);
      expect(reportsModel.postReportInclude.mock.calls).toEqual([[MOCK_REPORT_ID, 2]]);
    });
  });

  describe('postReportXLSXService', () => {
    test('1. Debe generar un XLSX con las 3 hojas (1, 2, 3) y notificar', async () => {
      reportsModel.postReportInventory.mockResolvedValue([MOCK_INVENTORY_ROWS]);
      reportsModel.postReportEntries.mockResolvedValue([MOCK_ENTRIES_ROWS]);
      reportsModel.postReportOuts.mockResolvedValue([MOCK_OUTS_ROWS]);

      const workbook = await reportsService.postReportXLSXService({
        userId: MOCK_USER_ID, initialDate: MOCK_INITIAL_DATE, endDate: MOCK_END_DATE, type: [1, 2, 3],
      });

      expect(workbook.worksheets.map((w) => w.name)).toEqual(['Inventario', 'Entradas', 'Salidas']);
      expect(reportsModel.postReportInclude).toHaveBeenCalledTimes(3);
      expect(notificationService.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: MOCK_USER_ID, content: expect.stringContaining("excel") })
      );
    });

    test('2. Debe llenar todas las columnas del inventario (perecedero y unidad incluidos)', async () => {
      reportsModel.postReportInventory.mockResolvedValue([MOCK_INVENTORY_ROWS]);

      const workbook = await reportsService.postReportXLSXService({
        userId: MOCK_USER_ID, initialDate: MOCK_INITIAL_DATE, endDate: MOCK_END_DATE, type: [1],
      });

      const [header, arroz] = sheetRows(workbook, 'Inventario');
      expect(header).toEqual(["Nombre", "Categoria", "Perecedero", "Unidad", "Stock Actual", "Stock Min", "Stock Max", "Creado", "Actualizado"]);
      expect(arroz).toEqual(["arroz", "Alimentos y Aseo", "No", "Kg", 100, 10, 200, "01-10-23 10:00", "01-10-23 10:00"]);
    });

    test('3. Debe generar XLSX con Entradas (vacío) y Salidas (con datos)', async () => {
      reportsModel.postReportEntries.mockResolvedValue([[]]);
      reportsModel.postReportOuts.mockResolvedValue([MOCK_OUTS_ROWS]);

      const workbook = await reportsService.postReportXLSXService({
        userId: MOCK_USER_ID, initialDate: MOCK_INITIAL_DATE, endDate: MOCK_END_DATE, type: [2, 3],
      });

      expect(workbook.worksheets.map((w) => w.name)).toEqual(['Entradas', 'Salidas']);
      expect(sheetRows(workbook, 'Entradas')).toHaveLength(1);
      expect(sheetRows(workbook, 'Salidas')[1]).toEqual(["jamon", "luis perez", "Uso", "Cocina", "Kg", 5, "", "01-10-23 10:00"]);
      expect(reportsModel.postReportInclude.mock.calls).toEqual([[MOCK_REPORT_ID, 2], [MOCK_REPORT_ID, 3]]);
      expect(notificationService.addNotification).toHaveBeenCalledTimes(1);
    });
  });
});
