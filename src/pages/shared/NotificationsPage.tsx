import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { notificationService } from '@/services/notificationService';
import { formatDateTime } from '@/utils/formatters';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Filter,
  Check,
} from 'lucide-react';
import type { NotificationItem } from '@/types';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    const list = await notificationService.getNotificationsForUser(user);
    setNotifications(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationService.markAllAsReadForUser(user);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const filtered = selectedCategory === 'ALL'
    ? notifications
    : notifications.filter(n => n.category === selectedCategory);

  const iconMap: Record<NotificationItem['type'], any> = {
    INFO: <Info className="w-4 h-4 text-blue-600" />,
    SUCCESS: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    WARNING: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    ALERT: <AlertTriangle className="w-4 h-4 text-rose-600" />,
    DISCREPANCY: <AlertTriangle className="w-4 h-4 text-orange-600" />,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Notification Center</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time regulatory workflow alerts, officer scrutiny updates, and maturity reminders
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
        >
          <Check className="w-3.5 h-3.5 text-teal-600" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {['ALL', 'FDR_SUBMISSION', 'VERIFICATION', 'CLARIFICATION', 'MATURITY_REMINDER', 'RENEWAL', 'RELEASE_DECISION'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedCategory === cat
                ? 'bg-navy-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-400">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No notifications in this category.
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-4 shadow-xs transition-all flex items-start justify-between gap-4 ${
                !item.isRead ? 'border-teal-300 bg-teal-50/10' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-100 flex-shrink-0 mt-0.5">
                  {iconMap[item.type] || <Info className="w-4 h-4 text-slate-500" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="font-mono">{formatDateTime(item.createdAt)}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 font-mono uppercase text-[10px] text-slate-600">
                      {item.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {item.linkUrl && (
                  <Link
                    to={item.linkUrl}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded transition-colors"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
                {!item.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(item.id)}
                    className="text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
