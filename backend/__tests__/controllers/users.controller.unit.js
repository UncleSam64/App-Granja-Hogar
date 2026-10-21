import request from 'supertest';
import { jest } from '@jest/globals';
import { bearer } from '../helpers.js';

/**
 * Users Test
 * @module UsersControllerTest
 * @description This module contains unit tests for the UsersController.
 *              It uses `supertest` for making HTTP requests to the Express app
 *              and `jest` for mocking services and assertions.
 * 
 * @author Jared Alejandro Marquez Muñoz Grado
 * @author Renata Loaiza Bailon
 * @author Renata Soto Bravo
 * @author Roberto Santiago Estrada Orozco  
 */

jest.unstable_mockModule('../../services/users.service.js', () => ({
  usersService: {
    login: jest.fn(),
    verify: jest.fn(),
    getUsers: jest.fn(),
    getUserById: jest.fn(),
    createUser: jest.fn(),
    editUser: jest.fn(),
    updatePassword: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

const { usersService } = await import('../../services/users.service.js');
const { AppError } = await import('../../utils/error.util.js');
const { default: app } = await import('../../app.js');

const manager = bearer(['manage-users'], { id: 1 });
const staff = bearer(['products-outs'], { id: 2 });
const newUser = { name: 'Camila', lastName: 'Beltran', username: 'camilab', password: 'password123', permissions: ['products-entries'] };

describe("User Controller Unit Tests", () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /v1/users/login', () => {
    test('Given correct credentials, When login, Then return 200 and a token', async () => {
      usersService.login.mockResolvedValue('fake.jwt.token');

      const res = await request(app).post('/v1/users/login').send({ username: 'Admin ', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ token: 'fake.jwt.token' });
      expect(usersService.login).toHaveBeenCalledWith({ username: 'admin', password: 'password123' });
    });

    test('Given incorrect password, When login, Then return 401', async () => {
      usersService.login.mockRejectedValue(new AppError('Contraseña incorrecta', 401));

      const res = await request(app).post('/v1/users/login').send({ username: 'admin', password: 'wrongpass1' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Contraseña incorrecta');
    });

    test('Given non-existent username, When login, Then return 401', async () => {
      usersService.login.mockRejectedValue(new AppError('Datos Incorrectos', 401));

      const res = await request(app).post('/v1/users/login').send({ username: 'nobody', password: 'password123' });

      expect(res.status).toBe(401);
    });

    test('Given missing password, When login, Then return 400 for validation error', async () => {
      const res = await request(app).post('/v1/users/login').send({ username: 'admin' });

      expect(res.status).toBe(400);
      expect(usersService.login).not.toHaveBeenCalled();
    });

    test('Given password too short, When login, Then return 400 for validation error', async () => {
      const res = await request(app).post('/v1/users/login').send({ username: 'admin', password: '123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/users/verify', () => {
    test('Given a valid token in header, When verify, Then return 200 and the user', async () => {
      usersService.verify.mockResolvedValue({ id: 1, username: 'admin' });

      const res = await request(app).post('/v1/users/verify').set('Authorization', 'Bearer some.token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, username: 'admin' });
      expect(usersService.verify).toHaveBeenCalledWith({ token: 'some.token' });
    });

    test('Given an invalid token, When verify, Then return 200 and false', async () => {
      usersService.verify.mockResolvedValue(false);

      const res = await request(app).post('/v1/users/verify').set('Authorization', 'Bearer bad.token');

      expect(res.status).toBe(200);
      expect(res.body).toBe(false);
    });

    test('Given no token, When verify, Then return 401 Unauthorized', async () => {
      const res = await request(app).post('/v1/users/verify');

      expect(res.status).toBe(401);
    });
  });

  /**
   * @author Reoberto Santiago Estrada Orozco
   */
  describe('PUT /v1/users/update-password', () => {
    const passwords = { currentPassword: 'currentpass123', newPassword: 'newpass123', confirmPassword: 'newpass123' };

    test('Given valid password data, When updatePassword, Then return 200 and success message', async () => {
      usersService.updatePassword.mockResolvedValue({ success: true, message: 'Contraseña actualizada exitosamente' });

      const res = await request(app).put('/v1/users/update-password').set('Authorization', staff).send(passwords);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Contraseña actualizada exitosamente');
      expect(usersService.updatePassword).toHaveBeenCalledWith({ userId: 2, ...passwords });
    });

    test('Given incorrect current password, When updatePassword, Then return 400', async () => {
      usersService.updatePassword.mockRejectedValue(new AppError('La contraseña actual es incorrecta', 400));

      const res = await request(app).put('/v1/users/update-password').set('Authorization', staff).send(passwords);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('La contraseña actual es incorrecta');
    });

    test('Given non-matching password confirmation, When updatePassword, Then return 400', async () => {
      usersService.updatePassword.mockRejectedValue(new AppError('La nueva contraseña y la confirmación no coinciden', 400));

      const res = await request(app).put('/v1/users/update-password').set('Authorization', staff)
        .send({ ...passwords, confirmPassword: 'different123' });

      expect(res.status).toBe(400);
    });

    test.each(['currentPassword', 'newPassword', 'confirmPassword'])(
      'Given missing %s, When updatePassword, Then return 400 for validation error',
      async (field) => {
        const { [field]: _omitted, ...body } = passwords;

        const res = await request(app).put('/v1/users/update-password').set('Authorization', staff).send(body);

        expect(res.status).toBe(400);
        expect(usersService.updatePassword).not.toHaveBeenCalled();
      }
    );

    test('Given no authorization token, When updatePassword, Then return 401', async () => {
      const res = await request(app).put('/v1/users/update-password').send(passwords);

      expect(res.status).toBe(401);
    });
  });

  /**
   * @author Renata Loaiza Bailon
   */
  describe('POST /v1/users/new', () => {
    test('Given valid user data, When create user, Then return 201 and user created', async () => {
      usersService.createUser.mockResolvedValue({ id: 5, username: 'camilab' });

      const res = await request(app).post('/v1/users/new').set('Authorization', manager).send(newUser);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ ok: true, message: 'Usuario creado', user: { id: 5, username: 'camilab' } });
      expect(usersService.createUser).toHaveBeenCalledWith({
        ...newUser, name: 'camila', lastName: 'beltran', user_id: 1,
      });
    });

    test('Given user data with username too short, When create user, Then return 400 for validation error', async () => {
      const res = await request(app).post('/v1/users/new').set('Authorization', manager).send({ ...newUser, username: 'ab' });

      expect(res.status).toBe(400);
    });

    test('Given user data with password too short, When create user, Then return 400 for validation error', async () => {
      const res = await request(app).post('/v1/users/new').set('Authorization', manager).send({ ...newUser, password: '123' });

      expect(res.status).toBe(400);
    });

    test('Given user data with invalid permissions, When create user, Then return 400 for validation error', async () => {
      const res = await request(app).post('/v1/users/new').set('Authorization', manager).send({ ...newUser, permissions: ['superuser'] });

      expect(res.status).toBe(400);
      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    test('Given a duplicate username, When create user, Then return 409', async () => {
      usersService.createUser.mockRejectedValue(Object.assign(new Error("Duplicate entry 'camilab'"), { code: 'ER_DUP_ENTRY' }));

      const res = await request(app).post('/v1/users/new').set('Authorization', manager).send(newUser);

      expect(res.status).toBe(409);
    });

    test('Given a user without manage-users, When create user, Then return 403', async () => {
      const res = await request(app).post('/v1/users/new').set('Authorization', staff).send(newUser);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /v1/users/edit/:id', () => {
    test('Given valid data, When edit user, Then return 200', async () => {
      usersService.editUser.mockResolvedValue({ id: 5, name: 'camila' });

      const res = await request(app).put('/v1/users/edit/5').set('Authorization', manager)
        .send({ name: 'Camila', lastName: 'Beltran', permissions: ['products-outs'] });

      expect(res.status).toBe(200);
      expect(usersService.editUser).toHaveBeenCalledWith({
        id: '5', name: 'camila', lastName: 'beltran', permissions: ['products-outs'], user_id: 1,
      });
    });
  });

  describe('DELETE /v1/users/delete/:id', () => {
    test('Given valid user ID, When delete user, Then return 200 and success message', async () => {
      usersService.deleteUser.mockResolvedValue({ message: 'Usuario eliminado exitosamente' });

      const res = await request(app).delete('/v1/users/delete/5').set('Authorization', manager);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, message: 'Usuario eliminado exitosamente' });
    });

    test('Given non-existent user ID, When delete user, Then return 404', async () => {
      usersService.deleteUser.mockRejectedValue(new AppError('Usuario no encontrado o no se pudo eliminar', 404));

      const res = await request(app).delete('/v1/users/delete/999').set('Authorization', manager);

      expect(res.status).toBe(404);
    });

    test('Given invalid ID format (not a number), When delete user, Then return 400 for validation error', async () => {
      const res = await request(app).delete('/v1/users/delete/abc').set('Authorization', manager);

      expect(res.status).toBe(400);
    });
  });
});
