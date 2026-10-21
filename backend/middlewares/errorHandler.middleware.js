/**
 * @module middlewares/errorHandler
 * @description Express error-handling middleware that logs the error and sends a JSON response with error details.
 * 
 * @author Yahir Alfredo Tapia Sifuentes
 */
import { AppError } from '../utils/error.util.js';

export const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') err = new AppError('JSON inválido', 400);
  if (err.code === 'ER_DUP_ENTRY') err = new AppError('Ya existe un registro con ese valor', 409);
  if (err.code === 'ER_NO_REFERENCED_ROW_2') err = new AppError('Uno de los registros referenciados no existe', 400);

  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) console.error('Error:', err);

  // Headers are already out when a streamed report (PDF/XLSX) fails midway.
  if (res.headersSent) return res.end();

  res.status(statusCode).json({
    status: err.status || 'Error',
    message: statusCode >= 500 && !err.isOperational ? 'Error interno del servidor' : err.message
  });
};
