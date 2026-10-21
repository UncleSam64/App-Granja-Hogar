import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/notifications.model.js', () => ({
  notificationsModel: {
    getAllNotifications: jest.fn(),
    getNotificationById: jest.fn(),
    createNotification: jest.fn(),
    deleteNotificationById: jest.fn(),
  },
}));

const { notificationsModel } = await import('../../models/notifications.model.js');
const { notificationService } = await import('../../services/notifications.service.js');

afterEach(() => {
  jest.clearAllMocks();
});

describe('Notifications Service Unit Tests', () => {
  describe('getNotifications', () => {
    test('Given notifications exist, When service called, Then should return list', async () => {
      notificationsModel.getAllNotifications.mockResolvedValue([
        { id: 1, user_id: 2, content: 'Entrada registrada', type_id: 4, user_username: 'ana', product_name: 'arroz' },
      ]);

      const result = await notificationService.getNotifications({ permissions: ['products-entries'] });

      expect(result).toEqual([
        { id: 1, user_id: 2, content: 'Entrada registrada', type_id: 4, user_username: 'ana' },
      ]);
      expect(notificationsModel.getAllNotifications).toHaveBeenCalledWith([2]);
    });

    test('Given an admin user, When service called, Then should query every permission', async () => {
      notificationsModel.getAllNotifications.mockResolvedValue([]);

      await notificationService.getNotifications({ permissions: ['admin'] });

      expect(notificationsModel.getAllNotifications).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6]);
    });

    test('Given DB error, When service called, Then should throw error', async () => {
      notificationsModel.getAllNotifications.mockRejectedValue(new Error('DB error'));

      await expect(notificationService.getNotifications({ permissions: [] })).rejects.toThrow('DB error');
    });
  });

  describe('getNotificationById', () => {
    test('Given valid ID, When found, Then should return notification', async () => {
      notificationsModel.getNotificationById.mockResolvedValue({ id: 5, user_id: 1, content: 'Hola', type_id: 1 });

      const result = await notificationService.getNotificationById(5);

      expect(result).toEqual({ id: 5, user_id: 1, content: 'Hola', type_id: 1, user_username: undefined });
      expect(notificationsModel.getNotificationById).toHaveBeenCalledWith(5);
    });

    test('Given invalid ID, When not found, Then should throw 404', async () => {
      notificationsModel.getNotificationById.mockResolvedValue(undefined);

      await expect(notificationService.getNotificationById(99)).rejects.toMatchObject({ statusCode: 404 });
    });

    test('Given DB error, When called, Then should throw', async () => {
      notificationsModel.getNotificationById.mockRejectedValue(new Error('DB fail'));

      await expect(notificationService.getNotificationById(1)).rejects.toThrow('DB fail');
    });
  });

  describe('addNotification', () => {
    test('Given valid data, When created, Then should return new notification', async () => {
      notificationsModel.createNotification.mockResolvedValue(10);

      const result = await notificationService.addNotification({ user_id: 1, content: 'Nueva alerta', type_id: 1, permission_id: 4 });

      expect(result).toEqual({ id: 10, user_id: 1, content: 'Nueva alerta', type_id: 1, user_username: undefined });
      expect(notificationsModel.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 1, content: 'Nueva alerta', type_id: 1, permission_id: 4 })
      );
    });

    test('Given DB error, When insert fails, Then should throw', async () => {
      notificationsModel.createNotification.mockRejectedValue(new Error('Insert fail'));

      await expect(notificationService.addNotification({ content: 'x', type_id: 1 })).rejects.toThrow('Insert fail');
    });
  });

  describe('removeNotification', () => {
    test('Given valid ID, When deleted, Then should return success message', async () => {
      notificationsModel.deleteNotificationById.mockResolvedValue(1);

      const result = await notificationService.removeNotification(1);

      expect(result).toEqual({ message: 'Notificación eliminada exitosamente.' });
      expect(notificationsModel.deleteNotificationById).toHaveBeenCalledWith(1);
    });

    test('Given unknown ID, When nothing deleted, Then should throw 404', async () => {
      notificationsModel.deleteNotificationById.mockResolvedValue(0);

      await expect(notificationService.removeNotification(1)).rejects.toMatchObject({ statusCode: 404 });
    });

    test('Given DB error, When delete fails, Then should throw', async () => {
      notificationsModel.deleteNotificationById.mockRejectedValue(new Error('Delete fail'));

      await expect(notificationService.removeNotification(1)).rejects.toThrow('Delete fail');
    });
  });
});
