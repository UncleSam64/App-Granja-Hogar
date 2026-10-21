import { jest } from '@jest/globals';
import request from 'supertest';
import { bearer } from '../helpers.js';

jest.unstable_mockModule('../../services/notifications.service.js', () => ({
  notificationService: {
    addNotification: jest.fn(),
    getNotifications: jest.fn(),
    getNotificationById: jest.fn(),
    removeNotification: jest.fn(),
  },
}));

const { notificationService } = await import('../../services/notifications.service.js');
const { AppError } = await import('../../utils/error.util.js');
const { default: app } = await import('../../app.js');

const auth = bearer(['products-entries']);

describe("Notifications Controller Unit Tests", () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /v1/notifications', () => {
    test('Given notifications exist, When fetching all, Then return 200 and list', async () => {
      notificationService.getNotifications.mockResolvedValue([{ id: 1, content: 'Entrada' }]);

      const res = await request(app).get('/v1/notifications').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 1, content: 'Entrada' }]);
      expect(notificationService.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ permissions: ['products-entries'] })
      );
    });

    test('Given DB error, When fetching all, Then return 500 without leaking the error', async () => {
      notificationService.getNotifications.mockRejectedValue(new Error("Access denied for user 'root'"));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).get('/v1/notifications').set('Authorization', auth);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Error interno del servidor');
    });

    test('Given no token, When fetching all, Then return 401', async () => {
      const res = await request(app).get('/v1/notifications');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /v1/notifications/:id', () => {
    test('Given valid ID, When fetching, Then return 200 and object', async () => {
      notificationService.getNotificationById.mockResolvedValue({ id: 5, content: 'Hola' });

      const res = await request(app).get('/v1/notifications/5').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 5, content: 'Hola' });
    });

    test('Given invalid ID, When fetching, Then return 400', async () => {
      const res = await request(app).get('/v1/notifications/abc').set('Authorization', auth);

      expect(res.status).toBe(400);
    });

    test('Given not found, When fetching, Then return 404', async () => {
      notificationService.getNotificationById.mockRejectedValue(new AppError('Notificación no encontrada.', 404));

      const res = await request(app).get('/v1/notifications/99').set('Authorization', auth);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /v1/notifications', () => {
    test('Given valid data, When creating, Then return 201', async () => {
      notificationService.addNotification.mockResolvedValue({ id: 10, content: 'Nueva', type_id: 1 });

      const res = await request(app).post('/v1/notifications').set('Authorization', auth).send({ content: 'Nueva', type_id: 1 });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(10);
    });

    test('Given invalid data, When creating, Then return 400', async () => {
      const res = await request(app).post('/v1/notifications').set('Authorization', auth).send({ content: '' });

      expect(res.status).toBe(400);
      expect(notificationService.addNotification).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /v1/notifications/:id', () => {
    test('Given valid ID, When deleting, Then return 200', async () => {
      notificationService.removeNotification.mockResolvedValue({ message: 'Notificación eliminada exitosamente.' });

      const res = await request(app).delete('/v1/notifications/1').set('Authorization', auth);

      expect(res.status).toBe(200);
      expect(notificationService.removeNotification).toHaveBeenCalledWith('1');
    });

    test('Given invalid ID, When deleting, Then return 400', async () => {
      const res = await request(app).delete('/v1/notifications/abc').set('Authorization', auth);

      expect(res.status).toBe(400);
    });

    test('Given unknown ID, When deleting, Then return 404', async () => {
      notificationService.removeNotification.mockRejectedValue(new AppError('Notificación no encontrada o ya eliminada.', 404));

      const res = await request(app).delete('/v1/notifications/1').set('Authorization', auth);

      expect(res.status).toBe(404);
    });
  });
});
