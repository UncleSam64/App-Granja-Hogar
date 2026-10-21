import { AppError } from '../../utils/error.util.js';

/**
 * @author Renata Loaiza
 */
export class PasswordVO {
  /**
   * @author Renata Loaiza
   */
  constructor(value) {
    if (typeof value !== 'string' || value.length < 8) {
      throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
    }
    this.value = value;

    Object.freeze(this);
  }
}
