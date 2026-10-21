/**
 * @module controllers/reports
 * 
 * @description This module defines the ReportsController class which handles HTTP requests related to reports.
 *              It interacts with the ReportsService to perform operations such as generating PDF and XLSX reports.
 * 
 * @author Yahir Alfredo Tapia Sifuentes
 * 
 * @example
 * import { reportsController } from '../controllers/reports.controller.js';
 * app.get('/reports', reportsController.getReports);
 */

import { reportsService } from "../services/reports.service.js";
import PDFDocument from "pdfkit"
import { catchAsync } from "../middlewares/catchAsync.middleware.js";

class ReportsController {
  constructor() {
    /**
     * Handles POST requests for generating reports.
     * Wrapped with async error handling middleware.
     * @function
     */
    this.postReportPDF = catchAsync(this.postReportPDF.bind(this));
    this.postReportXLSX = catchAsync(this.postReportXLSX.bind(this));
  }

  async postReportXLSX(req, res) {
    const { initialDate, endDate, type } = req.body;

    const workbook = await reportsService.postReportXLSXService({userId: req.user.id, initialDate, endDate, type});

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `${initialDate}to${endDate}.xlsx`
    );

    await workbook.xlsx.write(res);
    return res.end();
  }

  async postReportPDF(req, res) {
    const { initialDate, endDate, type } = req.body;

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });

    // Build the document before streaming it, so a failed query can still be answered with a JSON error.
    const docModified = await reportsService.postReportPDFService({doc, userId: req.user.id, initialDate, endDate, type});

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${initialDate}to${endDate}.pdf`);
    docModified.pipe(res);
    docModified.end();
  }
}

export const reportsController = new ReportsController();