import { jest } from '@jest/globals';
import request from 'supertest';
import { bearer } from '../helpers.js';

jest.unstable_mockModule('../../services/permissions.service.js', () => ({
  permissionsService: {
    getAllPermissions: jest.fn(),
    getUserPermissions: jest.fn(),
    updateUserPermissions: jest.fn(),
  },
}));

const { permissionsService } = await import('../../services/permissions.service.js');
const { default: app } = await import('../../app.js');

const manager = bearer(['manage-users']);

describe("Permission Controller tests", () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Get All Permissions Endpoint Test', () => {
    test('Given request When get all permissions Then status 200', async () => {
      permissionsService.getAllPermissions.mockResolvedValue([{ id: 1, permission: 'admin' }]);

      const res = await request(app).get('/v1/permissions').set('Authorization', bearer(['products-outs']));

      expect(res.status).toBe(200);
      expect(res.body[0]).toEqual({ id: 1, permission: 'admin' });
    });
  });

  describe('Get User Permissions Endpoint Test', () => {
    test('Given valid user ID When get permissions Then status 200', async () => {
      permissionsService.getUserPermissions.mockResolvedValue({ user_id: 1, permissions: [], permission_count: 0 });

      const res = await request(app).get('/v1/permissions/user/1').set('Authorization', manager);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('permission_count');
      expect(permissionsService.getUserPermissions).toHaveBeenCalledWith('1');
    });

    test('Given invalid user ID When get permissions Then error 400', async () => {
      const res = await request(app).get('/v1/permissions/user/invalid').set('Authorization', manager);

      expect(res.status).toBe(400);
    });

    test('Given a user without manage-users When get permissions Then error 403', async () => {
      const res = await request(app).get('/v1/permissions/user/1').set('Authorization', bearer(['products-outs']));

      expect(res.status).toBe(403);
      expect(permissionsService.getUserPermissions).not.toHaveBeenCalled();
    });
  });

  describe('Update User Permissions Endpoint Test', () => {
    test('Given valid data When update permissions Then status 200', async () => {
      permissionsService.updateUserPermissions.mockResolvedValue({ success: true, message: 'Permisos actualizados exitosamente' });

      const res = await request(app).put('/v1/permissions/user/1').set('Authorization', manager).send({ 'permission-ids': [1, 2, 3] });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Permisos actualizados exitosamente');
      expect(permissionsService.updateUserPermissions).toHaveBeenCalledWith('1', [1, 2, 3]);
    });

    test('Given invalid user ID When update permissions Then error 400', async () => {
      const res = await request(app).put('/v1/permissions/user/abc').set('Authorization', manager).send({ 'permission-ids': [1] });

      expect(res.status).toBe(400);
    });

    test('Given invalid permission_ids format When update Then error 400', async () => {
      const res = await request(app).put('/v1/permissions/user/1').set('Authorization', manager).send({ 'permission-ids': 'not-an-array' });

      expect(res.status).toBe(400);
    });

    test('Given non-numeric permission IDs When update Then error 400', async () => {
      const res = await request(app).put('/v1/permissions/user/1').set('Authorization', manager).send({ 'permission-ids': ['a', 'b'] });

      expect(res.status).toBe(400);
    });

    test('Given missing body When update permissions Then error 400', async () => {
      const res = await request(app).put('/v1/permissions/user/1').set('Authorization', manager);

      expect(res.status).toBe(400);
      expect(permissionsService.updateUserPermissions).not.toHaveBeenCalled();
    });
  });
});
