/**
 * Reports Controller Test
 * @description Tests the PDF/XLSX report endpoints through the real routes, validation and auth.
 *              The report service is mocked.
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import ExcelJS from 'exceljs';
import { bearer } from '../helpers.js';

jest.unstable_mockModule('../../services/reports.service.js', () => ({
  reportsService: { postReportPDFService: jest.fn(), postReportXLSXService: jest.fn() },
}));

const { reportsService } = await import('../../services/reports.service.js');
const { default: app } = await import('../../app.js');

const reporter = bearer(['generate-reports'], { id: 4 });
const body = { initialDate: '2025-08-01', endDate: '2025-08-31', type: [1, 2] };

describe('Reports Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Given valid dates When requesting a PDF Then streams a PDF attachment', async () => {
    reportsService.postReportPDFService.mockImplementation(async ({ doc }) => doc.text('Reporte'));

    const res = await request(app).post('/v1/reports/pdf').set('Authorization', reporter).send(body);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe('attachment; filename=2025-08-01to2025-08-31.pdf');
    expect(reportsService.postReportPDFService).toHaveBeenCalledWith(expect.objectContaining({ userId: 4, ...body }));
  });

  test('Given the report query fails When requesting a PDF Then returns a JSON 500 instead of a broken file', async () => {
    reportsService.postReportPDFService.mockRejectedValue(new Error('DB down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).post('/v1/reports/pdf').set('Authorization', reporter).send(body);

    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  test('Given valid dates When requesting an XLSX Then returns the workbook', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Inventario');
    reportsService.postReportXLSXService.mockResolvedValue(workbook);

    const res = await request(app).post('/v1/reports/xlsx').set('Authorization', reporter).send(body);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });

  test('Given a non-numeric type When requesting a report Then 400', async () => {
    const res = await request(app).post('/v1/reports/xlsx').set('Authorization', reporter).send({ ...body, type: ['1'] });

    expect(res.status).toBe(400);
  });

  test('Given an invalid date When requesting a report Then 400', async () => {
    const res = await request(app).post('/v1/reports/pdf').set('Authorization', reporter).send({ ...body, endDate: 'ayer' });

    expect(res.status).toBe(400);
  });

  test('Given a user without generate-reports When requesting a report Then 403', async () => {
    const res = await request(app).post('/v1/reports/pdf').set('Authorization', bearer(['products-outs'])).send(body);

    expect(res.status).toBe(403);
  });
});
