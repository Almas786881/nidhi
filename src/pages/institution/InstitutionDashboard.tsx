import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { fdrService } from '@/services/fdrService';
import { notificationService } from '@/services/notificationService';
import { formatINR, formatDateTime, getDaysRemaining, formatDate } from '@/utils/formatters';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  HelpCircle,
  PlusCircle,
  Unlock,
  AlertTriangle,
  RotateCw,
  Bell,
  ExternalLink,
} from 'lucide-react';
import type { FDRRecord, NotificationItem } from '@/types';

export const InstitutionDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [recentFdrs, setRecentFdrs] = useState<FDRRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setIsLoading(true);
        const [liveStats, myFdrs, notifs] = await Promise.all([
          fdrService.getLiveStats(user),
          fdrService.listFdrs({ currentUser: user }),
          notificationService.getNotificationsForUser(user),
        ]);
        setStats(liveStats);
        setRecentFdrs(myFdrs.slice(0, 5));
        setNotifications(notifs.slice(0, 5));
      } catch (err) {
        console.error('Failed to load institution dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (isLoading || !stats) {
    return <LoadingSpinner size="lg" message="Loading institution portfolio data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-800 rounded-2xl p-6 text-white shadow-md border border-navy-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
            Accredited Institution Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-bold mt-2 tracking-tight">
            {user?.institutionName || 'Institutional Dashboard'}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Logged in as {user?.name} ({user?.designation || 'Registrar'})
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/institution/submit"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 shadow-md transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit New FDR</span>
          </Link>
          <Link
            to="/institution/releases"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl bg-navy-800 hover:bg-navy-700 text-white border border-navy-600 transition-colors"
          >
            <Unlock className="w-4 h-4 text-slate-300" />
            <span>Release Request</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Submitted Deposits"
          value={formatINR(stats.totalDepositAmount)}
          subtitle={`${stats.totalFdrs} Fixed Deposit Receipts`}
          icon={FileCheck2}
          color="navy"
          trend="Total lien amount"
          trendType="neutral"
          onClick={() => navigate('/institution/my-fdrs')}
        />
        <StatCard
          title="Verified & Active"
          value={stats.activeFdrs}
          subtitle="Confirmed by Regulation Bureau"
          icon={CheckCircle2}
          color="emerald"
          trend="In compliance"
          trendType="positive"
          onClick={() => navigate('/institution/my-fdrs?status=VERIFIED')}
        />
        <StatCard
          title="Pending Verification"
          value={stats.pendingVerification}
          subtitle="Under scrutiny by officer"
          icon={Clock}
          color="blue"
          trend="Automated OCR processed"
          trendType="neutral"
          onClick={() => navigate('/institution/my-fdrs?status=SUBMITTED')}
        />
        <StatCard
          title="Clarification Needed"
          value={stats.clarificationCases}
          subtitle="Discrepancy / remarks pending"
          icon={HelpCircle}
          color="amber"
          trend={stats.clarificationCases > 0 ? 'Requires institution response' : 'No queries'}
          trendType={stats.clarificationCases > 0 ? 'warning' : 'positive'}
          onClick={() => navigate('/institution/clarifications')}
        />
      </div>

      {/* Maturity Watch Banner if expiring soon */}
      {stats.expiringIn30 > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-sm">Regulatory Renewal Warning:</span> {stats.expiringIn30} of your FDRs are maturing within 30 days! AICTE Regulations require timely renewal with joint mandate.
            </div>
          </div>
          <Link
            to="/institution/renewals"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
          >
            Start Renewal &rarr;
          </Link>
        </div>
      )}

      {/* Two columns: Recent FDRs list & Live Notifications / Remarks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent FDRs table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">My Recent FDR Submissions</h3>
              <p className="text-xs text-slate-500">Fixed deposits submitted under institution mandate</p>
            </div>
            <Link
              to="/institution/my-fdrs"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
            >
              <span>View All ({stats.totalFdrs})</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <th className="py-2.5 px-4">FDR Number</th>
                  <th className="py-2.5 px-4">Issuing Bank</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-center">Maturity Date</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentFdrs.map(fdr => {
                  const days = getDaysRemaining(fdr.maturityDate);
                  return (
                    <tr key={fdr.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-navy-900">{fdr.fdrNumber}</td>
                      <td className="py-3 px-4 text-slate-700">{fdr.bankName}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{formatINR(fdr.principalAmount)}</td>
                      <td className="py-3 px-4 text-center">
                        <div>{formatDate(fdr.maturityDate)}</div>
                        <span className={`text-[10px] ${days < 0 ? 'text-rose-600 font-bold' : days <= 30 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {days < 0 ? 'Matured' : `${days}d left`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={fdr.workflowStatus} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/institution/fdrs/${fdr.id}`}
                          className="text-xs font-semibold text-teal-600 hover:text-teal-700 underline"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications & Officer Remarks Feed (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Official Communications</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                AICTE Desk
              </span>
            </div>
            <div className="space-y-3.5">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No pending notifications</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="text-xs border-l-2 border-teal-500 pl-3 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{n.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                    {n.linkUrl && (
                      <Link
                        to={n.linkUrl}
                        className="mt-1 text-[11px] font-semibold text-teal-600 hover:underline inline-block"
                      >
                        Open Case &rarr;
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <Link
            to="/notifications"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-navy-900 hover:underline text-center block"
          >
            Open All Notifications &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
