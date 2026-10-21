import NotificationVO from '../valueObjects/notifications/notification.vo.js';
import { notificationsModel } from '../models/notifications.model.js';
import { AppError } from '../utils/error.util.js';
import { convertPermissionsArrayByNameToId, permissionObjectByName } from '../utils/permissions.util.js';

class NotificationService {
    async addNotification({ user_id, product_id, product_entry_id, product_out_id, content, type_id, permission_id }) {
        const id = await notificationsModel.createNotification({ user_id, product_id, product_entry_id, product_out_id, content, type_id, permission_id });

        return new NotificationVO(
            {
                id,
                user_id,
                content,
                type_id
            }
        );
    }
    async getNotifications(user) {
        // Admins implicitly hold every permission (see auth.middleware), so they see every notification.
        const names = user.permissions.includes('admin') ? Object.keys(permissionObjectByName()) : user.permissions;
        const permissions = convertPermissionsArrayByNameToId(names);
        const rows = await notificationsModel.getAllNotifications(permissions);
        return rows.map(n => new NotificationVO(
            {
                id: n.id,
                user_id: n.user_id,
                content: n.content,
                type_id: n.type_id,
                user_username: n.user_username
            }
        ));
    }
    async getNotificationById(id) {
        const row = await notificationsModel.getNotificationById(id);
        if (!row) throw new AppError('Notificación no encontrada.', 404);

        return new NotificationVO(row);
    }
    async removeNotification(id) {
        const affectedRows = await notificationsModel.deleteNotificationById(id);
        if (!affectedRows) throw new AppError('Notificación no encontrada o ya eliminada.', 404);

        return { message: 'Notificación eliminada exitosamente.' };
    }
}

export const notificationService = new NotificationService();