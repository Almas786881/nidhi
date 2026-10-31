import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { resetDatabaseToSeed } from '@/db/backup';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  FileCheck2,
  CalendarClock,
  Unlock,
  History,
  BarChart3,
  Settings,
  PlusCircle,
  HelpCircle,
  RotateCw,
  FolderLock,
  Database,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { UserRole } from '@/types';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (!user) return null;

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await resetDatabaseToSeed();
      setIsResetDialogOpen(false);
      window.location.reload();
    } catch (err) {
      alert('Failed to reset demo data: ' + err);
    } finally {
      setIsResetting(false);
    }
  };

  interface NavItem {
    label: string;
    href: string;
    icon: any;
    badge?: string;
  }

  const adminNav: NavItem[] = [
    { label: 'Admin Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Institutions', href: '/admin/institutions', icon: Building2 },
    { label: 'User Directory', href: '/admin/users', icon: Users },
    { label: 'Officer Assignment', href: '/admin/officers', icon: UserCheck },
    { label: 'All FDR Records', href: '/admin/fdrs', icon: FileCheck2 },
    { label: 'Maturity Monitoring', href: '/admin/maturity', icon: CalendarClock },
    { label: 'Release Requests', href: '/admin/releases', icon: Unlock },
    { label: 'Cryptographic Audit', href: '/admin/audit', icon: History, badge: 'SHA-256' },
    { label: 'Reports & Analytics', href: '/admin/reports', icon: BarChart3 },
    { label: 'System Settings', href: '/admin/settings', icon: Settings },
  ];

  const institutionNav: NavItem[] = [
    { label: 'My Dashboard', href: '/institution', icon: LayoutDashboard },
    { label: 'Submit New FDR', href: '/institution/submit', icon: PlusCircle, badge: 'New' },
    { label: 'My FDR Records', href: '/institution/my-fdrs', icon: FileCheck2 },
    { label: 'Clarifications', href: '/institution/clarifications', icon: HelpCircle },
    { label: 'Renewal / Replace', href: '/institution/renewals', icon: RotateCw },
    { label: 'Release / Refund', href: '/institution/releases', icon: Unlock },
    { label: 'Document Vault', href: '/institution/documents', icon: FolderLock },
  ];

  const officerNav: NavItem[] = [
    { label: 'Officer Dashboard', href: '/officer', icon: LayoutDashboard },
    { label: 'Assigned Intake', href: '/officer/applications', icon: FileCheck2 },
    { label: 'AI Verification Studio', href: '/officer/verification', icon: Sparkles, badge: 'OCR' },
    { label: 'Clarification Desk', href: '/officer/clarifications', icon: HelpCircle },
    { label: 'Maturity Watch', href: '/officer/maturity', icon: CalendarClock },
    { label: 'Renewal Scrutiny', href: '/officer/renewals', icon: RotateCw },
    { label: 'Release Scrutiny', href: '/officer/release-scrutiny', icon: Unlock },
    { label: 'Audit Trail', href: '/officer/audit', icon: History },
  ];

  const authorityNav: NavItem[] = [
    { label: 'Authority Dashboard', href: '/authority', icon: LayoutDashboard },
    { label: 'Pending Approvals', href: '/authority/approvals', icon: Unlock, badge: 'Human' },
    { label: 'Decision History', href: '/authority/decision-history', icon: History },
    { label: 'Audit & Analytics', href: '/authority/reports', icon: BarChart3 },
  ];

  const navMap: Record<UserRole, NavItem[]> = {
    ADMIN: adminNav,
    INSTITUTION: institutionNav,
    OFFICER: officerNav,
    AUTHORITY: authorityNav,
  };

  const navItems = navMap[user.role] || institutionNav;

  return (
    <>
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between select-none">
        {/* Navigation list */}
        <div className="p-3.5 space-y-6 overflow-y-auto">
          <div>
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Navigation Menu
            </div>
            <nav className="space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === '/admin' || item.href === '/institution' || item.href === '/officer' || item.href === '/authority'}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-sm font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-navy-950/60 text-teal-300 border border-teal-500/20 font-mono">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* System Data Management Group */}
          <div>
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              System Storage
            </div>
            <nav className="space-y-1">
              <NavLink
                to="/backup-restore"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-teal-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Database className="w-4 h-4 text-slate-400" />
                <span>Backup & IndexedDB</span>
              </NavLink>
            </nav>
          </div>
        </div>

        {/* Bottom Card: Demo Reset Trigger & Local DB Badge */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60">
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px] mb-1">
              <span>Local IndexedDB</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-[10px] text-slate-400 leading-tight mb-2.5">
              Persistent browser storage with full offline capabilities.
            </p>
            <button
              onClick={() => setIsResetDialogOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Demo Data</span>
            </button>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleReset}
        title="Reset Demo Database?"
        message="This will re-initialize the local IndexedDB database with pristine AICTE sample records (8 institutions, 22+ FDRs, officer assignments, and audit trails). All temporary test data will be restored to defaults."
        confirmLabel="Reset Everything"
        variant="danger"
        isLoading={isResetting}
      />
    </>
  );
};
