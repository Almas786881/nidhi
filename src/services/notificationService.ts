import { db } from '@/db/dexie';
import type { NotificationItem, UserRole } from '@/types';

export const notificationService = {
  /**
   * Dispatches a new notification to a specific role, user, or institution
   */
  async notify(params: {
    title: string;
    message: string;
    type?: NotificationItem['type'];
    category: NotificationItem['category'];
    targetRole?: UserRole;
    userId?: string;
    institutionId?: string;
    relatedFdrId?: string;
    relatedRecordId?: string;
    linkUrl?: string;
  }): Promise<NotificationItem> {
    const item: NotificationItem = {
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: params.title,
      message: params.message,
      type: params.type || 'INFO',
      category: params.category,
      targetRole: params.targetRole,
      userId: params.userId,
      institutionId: params.institutionId,
      relatedFdrId: params.relatedFdrId,
      relatedRecordId: params.relatedRecordId,
      linkUrl: params.linkUrl,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    await db.notifications.add(item);
    return item;
  },

  /**
   * Fetches notifications for a given user context (role + institutionId + userId)
   */
  async getNotificationsForUser(user: {
    id: string;
    role: UserRole;
    institutionId?: string;
  }): Promise<NotificationItem[]> {
    const all = await db.notifications.toArray();

    // Filter by role, institution, or specific user ID
    const relevant = all.filter(n => {
      // 1. Explicit user match
      if (n.userId && n.userId === user.id) return true;

      // 2. Institution user: matches institutionId or targetRole === 'INSTITUTION'
      if (user.role === 'INSTITUTION') {
        if (n.institutionId && n.institutionId === user.institutionId) return true;
        if (n.targetRole === 'INSTITUTION' && (!n.institutionId || n.institutionId === user.institutionId)) return true;
        return false;
      }

      // 3. Admin sees all notifications or targeted admin notifications
      if (user.role === 'ADMIN') return true;

      // 4. Officer sees officer-targeted notifications
      if (user.role === 'OFFICER' && (n.targetRole === 'OFFICER' || !n.targetRole)) return true;

      // 5. Authority sees authority-targeted notifications
      if (user.role === 'AUTHORITY' && (n.targetRole === 'AUTHORITY' || !n.targetRole)) return true;

      return false;
    });

    // Sort descending by date
    relevant.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return relevant;
  },

  /**
   * Marks a notification as read
   */
  async markAsRead(id: string): Promise<void> {
    await db.notifications.update(id, { isRead: true });
  },

  /**
   * Marks all notifications as read for a given user
   */
  async markAllAsReadForUser(user: { id: string; role: UserRole; institutionId?: string }): Promise<void> {
    const userNotifs = await this.getNotificationsForUser(user);
    const unreadIds = userNotifs.filter(n => !n.isRead).map(n => n.id);
    await db.transaction('rw', db.notifications, async () => {
      for (const id of unreadIds) {
        await db.notifications.update(id, { isRead: true });
      }
    });
  },

  /**
   * Counts unread notifications
   */
  async getUnreadCount(user: { id: string; role: UserRole; institutionId?: string }): Promise<number> {
    const userNotifs = await this.getNotificationsForUser(user);
    return userNotifs.filter(n => !n.isRead).length;
  },
};
