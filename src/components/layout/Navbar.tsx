import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { notificationService } from '@/services/notificationService';
import {
  Bell,
  LogOut,
  User as UserIcon,
  Shield,
  ChevronDown,
  Building,
  UserCheck,
  Award,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { NotificationItem, UserRole } from '@/types';

export const Navbar: React.FC = () => {
  const { user, logout, quickSwitchRole } = useAuthStore();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Poll notifications on mount and periodically
  useEffect(() => {
    let isMounted = true;
    async function loadNotifs() {
      if (!user) return;
      try {
        const list = await notificationService.getNotificationsForUser(user);
        if (isMounted) {
          setNotifications(list.slice(0, 8));
          setUnreadCount(list.filter(n => !n.isRead).length);
        }
      } catch {
        // ignore
      }
    }
    loadNotifs();
    const interval = setInterval(loadNotifs, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationService.markAllAsReadForUser(user);
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleRoleSwitch = async (role: UserRole) => {
    setIsRoleDropdownOpen(false);
    await quickSwitchRole(role);
    // Redirect to respective dashboard
    const routes: Record<UserRole, string> = {
      ADMIN: '/admin',
      INSTITUTION: '/institution',
      OFFICER: '/officer',
      AUTHORITY: '/authority',
    };
    navigate(routes[role]);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleMeta: Record<UserRole, { label: string; bg: string; icon: any }> = {
    ADMIN: { label: 'System Admin', bg: 'bg-purple-100 text-purple-800 border-purple-200', icon: Shield },
    INSTITUTION: { label: 'Institution User', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: Building },
    OFFICER: { label: 'Regulation Officer', bg: 'bg-teal-100 text-teal-800 border-teal-200', icon: UserCheck },
    AUTHORITY: { label: 'Competent Authority', bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: Award },
  };

  const currentRole = user ? roleMeta[user.role] : roleMeta.INSTITUTION;
  const RoleIcon = currentRole.icon;

  return (
    <header className="sticky top-0 z-40 bg-navy-950 text-white shadow-md border-b border-navy-800">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Portal Title */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center font-bold text-teal-400 text-xl tracking-wider group-hover:bg-teal-500/30 transition-all">
              नि
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-wider text-white">NIDHI</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  AICTE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block tracking-tight">
                AI-Assisted Security Deposit & FDR Lifecycle Portal
              </p>
            </div>
          </Link>
        </div>

        {/* Center/Right Actions: Demo Role Switcher, Notifications & User Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Live Demo Quick Role Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-navy-800/80 hover:bg-navy-800 border border-navy-700 text-xs font-medium text-slate-200 transition-colors"
              title="Switch role for demonstration"
            >
              <RoleIcon className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden md:inline">{currentRole.label}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Hackathon Role Switcher
                </div>
                {(['ADMIN', 'INSTITUTION', 'OFFICER', 'AUTHORITY'] as UserRole[]).map(r => {
                  const item = roleMeta[r];
                  const Icon = item.icon;
                  const isActive = user?.role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => handleRoleSwitch(r)}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        isActive ? 'bg-slate-100/80 font-bold text-navy-900' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-500" />
                        <div>
                          <div>{item.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {r.toLowerCase()}@nidhi.local
                          </div>
                        </div>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-teal-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* In-App Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-slate-800 animate-in fade-in">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3.5 hover:bg-slate-50 transition-colors ${
                          !n.isRead ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{n.message}</p>
                        {n.linkUrl && (
                          <Link
                            to={n.linkUrl}
                            onClick={() => setIsNotifOpen(false)}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-teal-600 hover:text-teal-700"
                          >
                            <span>View Case</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs font-medium text-navy-900 hover:underline"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-navy-800 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="hidden lg:block text-xs leading-tight">
                <div className="font-semibold text-slate-200 truncate max-w-[140px]">{user?.name}</div>
                <div className="text-[10px] text-slate-400">{user?.department || currentRole.label}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{user?.email}</p>
                  {user?.institutionName && (
                    <p className="mt-1 text-[10px] text-teal-700 font-semibold truncate">
                      {user.institutionName}
                    </p>
                  )}
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    to="/backup-restore"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span>Database Backup & Restore</span>
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
