import { jest } from '@jest/globals';
import { PermissionVO } from '../../valueObjects/permissions/permission.vo.js';
import { UserPermissionVO } from '../../valueObjects/permissions/userPermission.vo.js';

import { dbModuleMock } from '../helpers.js';

jest.unstable_mockModule('../../models/index.js', () => dbModuleMock(jest));
jest.unstable_mockModule('../../models/permissions.model.js', () => ({
  permissionsModel: {
    getAllPermissions: jest.fn(),
    getUserPermissions: jest.fn(),
    deleteUserPermissions: jest.fn(),
    insertUserPermissions: jest.fn(),
  },
}));

const { permissionsModel } = await import('../../models/permissions.model.js');
const { permissionsService } = await import('../../services/permissions.service.js');
const getAllPermissionsModelMock = permissionsModel.getAllPermissions;
const getUserPermissionsModelMock = permissionsModel.getUserPermissions;
const deleteUserPermissionsModelMock = permissionsModel.deleteUserPermissions;
const insertUserPermissionsModelMock = permissionsModel.insertUserPermissions;
const getAllPermissionsService = (...a) => permissionsService.getAllPermissions(...a);
const getUserPermissionsService = (...a) => permissionsService.getUserPermissions(...a);
const updateUserPermissionsService = (...a) => permissionsService.updateUserPermissions(...a);

afterEach(() => {
  jest.clearAllMocks();
});

describe('Permission Service', () => {
  describe('getAllPermissionsService', () => {
    test('Given permissions exist When get all Then returns array of PermissionVO', async () => {
      // GIVEN
      const mockDbPermissions = [
        { id: 1, permission: 'Entrada de productos' },
        { id: 2, permission: 'Salidas de productos' },
        { id: 3, permission: 'Generar reportes' },
      ];
      getAllPermissionsModelMock.mockResolvedValue(mockDbPermissions);

      // WHEN
      const result = await getAllPermissionsService();

      // THEN
      expect(result).toHaveLength(3);
      expect(result[0]).toBeInstanceOf(PermissionVO);
      expect(result[0].permission).toBe('Entrada de productos');
      expect(getAllPermissionsModelMock).toHaveBeenCalled();
    });

    test('Given no permissions When get all Then returns empty array', async () => {
      // GIVEN
      getAllPermissionsModelMock.mockResolvedValue([]);

      // WHEN
      const result = await getAllPermissionsService();

      // THEN
      expect(result).toEqual([]);
    });

    test('Given invalid data When get all Then returns empty array', async () => {
      // GIVEN
      getAllPermissionsModelMock.mockResolvedValue(null);

      // WHEN
      const result = await getAllPermissionsService();

      // THEN
      expect(result).toEqual([]);
    });
  });

  describe('getUserPermissionsService', () => {
    test('Given user with permissions When get Then returns UserPermissionVO', async () => {
      // GIVEN
      const user_id = 1;
      const mockDbPermissions = [
        { id: 1, permission: 'Entrada de productos' },
        { id: 2, permission: 'Salidas de productos' },
      ];
      getUserPermissionsModelMock.mockResolvedValue(mockDbPermissions);

      // WHEN
      const result = await getUserPermissionsService(user_id);

      // THEN
      expect(result).toBeInstanceOf(UserPermissionVO);
      expect(result.user_id).toBe(1);
      expect(result.permissions).toHaveLength(2);
      expect(result.permissions[0]).toBeInstanceOf(PermissionVO);
      expect(result.permission_count).toBe(2);
      expect(getUserPermissionsModelMock).toHaveBeenCalledWith(user_id);
    });

    test('Given user without permissions When get Then returns empty permissions', async () => {
      // GIVEN
      const user_id = 3;
      getUserPermissionsModelMock.mockResolvedValue([]);

      // WHEN
      const result = await getUserPermissionsService(user_id);

      // THEN
      expect(result).toBeInstanceOf(UserPermissionVO);
      expect(result.user_id).toBe(3);
      expect(result.permissions).toHaveLength(0);
      expect(result.permission_count).toBe(0);
    });

    test('Given null result When get Then returns empty permissions', async () => {
      // GIVEN
      const user_id = 999;
      getUserPermissionsModelMock.mockResolvedValue(null);

      // WHEN
      const result = await getUserPermissionsService(user_id);

      // THEN
      expect(result).toBeInstanceOf(UserPermissionVO);
      expect(result.permissions).toEqual([]);
      expect(result.permission_count).toBe(0);
    });
  });

  describe('updateUserPermissionsService', () => {
    test('Given valid data When update Then returns success', async () => {
      // GIVEN
      const user_id = 1;
      const permission_ids = [1, 2, 3];
      deleteUserPermissionsModelMock.mockResolvedValue([{ affectedRows: 1 }]);
      insertUserPermissionsModelMock.mockResolvedValue([{ affectedRows: 3 }]);

      // WHEN
      const result = await updateUserPermissionsService(user_id, permission_ids);

      // THEN
      expect(result.success).toBe(true);
      expect(result.message).toBe('Permisos actualizados exitosamente');
      expect(deleteUserPermissionsModelMock).toHaveBeenCalledWith(user_id, 'tx-conn');
      expect(insertUserPermissionsModelMock).toHaveBeenCalledWith(user_id, permission_ids, 'tx-conn');
    });

    test('Given empty array When update Then returns success', async () => {
      // GIVEN
      const user_id = 1;
      const permission_ids = [];
      deleteUserPermissionsModelMock.mockResolvedValue([{ affectedRows: 1 }]);

      // WHEN
      const result = await updateUserPermissionsService(user_id, permission_ids);

      // THEN
      expect(result.success).toBe(true);
      expect(result.message).toBe('Permisos actualizados exitosamente');
      expect(deleteUserPermissionsModelMock).toHaveBeenCalledWith(user_id, 'tx-conn');
      expect(insertUserPermissionsModelMock).not.toHaveBeenCalled();
    });

    test('Given null permission_ids When update Then returns success', async () => {
      // GIVEN
      const user_id = 1;
      const permission_ids = null;
      deleteUserPermissionsModelMock.mockResolvedValue([{ affectedRows: 1 }]);

      // WHEN
      const result = await updateUserPermissionsService(user_id, permission_ids);

      // THEN
      expect(result.success).toBe(true);
      expect(deleteUserPermissionsModelMock).toHaveBeenCalledWith(user_id, 'tx-conn');
      expect(insertUserPermissionsModelMock).not.toHaveBeenCalled();
    });
  });
});