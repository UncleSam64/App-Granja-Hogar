import express from "express"
import { body, param } from "express-validator"
import { unitsController } from "../controllers/units.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import { authMiddlewareLogged } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get('/', authMiddlewareLogged, unitsController.getAll);

router.get('/:id',
  [
    authMiddlewareLogged,
    param('id').notEmpty().isInt().withMessage('id must be an integer'), 
    validate
  ],
  unitsController.getById
);

router.post('/',
  [
    authMiddlewareLogged,
    body('name').isString().withMessage('name es obligatorio').bail().trim().notEmpty().withMessage('name es obligatorio').isLength({ max: 100 }).withMessage('name admite máximo 100 caracteres'),
    validate
  ],
  unitsController.create
);


export default router
