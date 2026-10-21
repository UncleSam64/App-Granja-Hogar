import express from "express"
import { body, param } from "express-validator"
import { departmentsController } from "../controllers/departments.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import { authMiddlewareLogged } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get('/', authMiddlewareLogged, departmentsController.getAll);

router.get('/:id',
  [
    authMiddlewareLogged,
    param('id').isInt().withMessage('id debe de ser un número entero'),
    validate
  ],
  departmentsController.getById
);

router.post('/',
  [
    authMiddlewareLogged,
    body('name').isString().withMessage('name es obligatorio').bail().trim().notEmpty().withMessage('name es obligatorio').isLength({ max: 100 }).withMessage('name admite máximo 100 caracteres'),
    validate
  ],
  departmentsController.create
);


export default router
