import express from "express"
import { body, param } from "express-validator"
import { reasonsController } from "../controllers/reasons.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import { authAuthorizePermissions } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get('/', authAuthorizePermissions("products-outs"), reasonsController.getAll);

router.get('/:id',
  [
    authAuthorizePermissions("products-outs"),
    param('id').isInt().withMessage('id must be an integer'),
    validate
  ],
  reasonsController.getById
);

router.post('/',
  [
    authAuthorizePermissions("products-outs"),
    body('name').isString().withMessage('name es obligatorio').bail().trim().notEmpty().withMessage('name es obligatorio').isLength({ max: 100 }).withMessage('name admite máximo 100 caracteres'),
    validate
  ],
  reasonsController.create
);

export default router