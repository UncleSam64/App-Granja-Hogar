/**
 * @module routes/productOuts
 * @description
 * This module defines the API routes for managing product out records.
 * It includes endpoints for retrieving all records, fetching a single record by ID, and creating new records.
 * All routes are protected by authorization middleware, ensuring only users with the "products-outs" permission can access them.
 * @author Yahir Alfredo Tapia Sifuentes
 */

import express from "express"
import { body, param } from "express-validator"
import { productOutController } from "../controllers/productOuts.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import { authAuthorizePermissions, authMiddlewareLogged } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * Route to retrieve all product out records.
 * @middleware {function} authAuthorizePermissions - Requires "products-outs" permission.
 */
router.get('/', authAuthorizePermissions("products-outs"), productOutController.getAll);

/**
 * Route to retrieve a specific product out record by ID.
 * @param {number} :id - The ID of the product out record. Must be an integer.
 * @middleware {function} authAuthorizePermissions - Requires "products-outs" permission.
 * @middleware {function} param('id') - Validates that the ID is a non-empty integer.
 * @middleware {function} validate - Express-validator middleware to check validation results.
 */
router.get('/:id',
  [
    authAuthorizePermissions("products-outs"),
    param('id').notEmpty().isInt().withMessage('id tiene que ser un número entero'),
    validate
  ],
  productOutController.getById
);

/**
 * Route to create a new product out record.
 * @middleware {function} authAuthorizePermissions - Requires "products-outs" permission.
 */
router.post('/',
  [
    authAuthorizePermissions("products-outs"),
    body('product_id').isInt({ min: 1 }).withMessage('product_id es obligatorio y debe ser un número entero'),
    body('reason_id').isInt({ min: 1 }).withMessage('reason_id es obligatorio y debe ser un número entero'),
    body('department_id').isInt({ min: 1 }).withMessage('department_id es obligatorio y debe ser un número entero'),
    body('unit_id').isInt({ min: 1 }).withMessage('unit_id es obligatorio y debe ser un número entero'),
    body('quantity').isFloat({ gt: 0 }).withMessage('quantity es obligatorio y debe ser un número positivo').toFloat(),
    body('notes').optional({ values: 'null' }).isString().isLength({ max: 255 }).withMessage('notes debe ser texto de máximo 255 caracteres'),
    validate
  ],
  productOutController.create);


export default router
