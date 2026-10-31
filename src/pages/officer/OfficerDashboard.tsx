import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { fdrService } from '@/services/fdrService';
import { releaseService } from '@/services/releaseService';
import { formatINR, formatDateTime, getDaysRemaining, formatDate } from '@/utils/formatters';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  FileCheck2,
  Clock,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Unlock,
  CheckCircle2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import type { FDRRecord, ReleaseRequest } from '@/types';

export const OfficerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [assignedFdrs, setAssignedFdrs] = useState<FDRRecord[]>([]);
  const [releasePending, setReleasePending] = useState<ReleaseRequest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setIsLoading(true);
        const [allFdrs, releases, liveStats] = await Promise.all([
          fdrService.listFdrs({ assignedOfficerId: user.id }),
          releaseService.listRequests(),
          fdrService.getLiveStats(),
        ]);
        setAssignedFdrs(allFdrs);
        setReleasePending(releases.filter(r => r.status === 'SUBMITTED'));
        setStats(liveStats);
      } catch (err) {
        console.error('Failed to load officer dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  if (isLoading || !stats) {
    return <LoadingSpinner size="lg" message="Loading officer scrutiny queue..." />;
  }

  const pendingVerification = assignedFdrs.filter(f => ['SUBMITTED', 'UNDER_VERIFICATION', 'RESUBMITTED'].includes(f.workflowStatus));
  const discrepancies = assignedFdrs.filter(f => f.workflowStatus === 'DISCREPANCY_DETECTED');
  const clarificationCases = assignedFdrs.filter(f => f.workflowStatus === 'CLARIFICATION_REQUESTED');

  return (
    <div className="space-y-6">
      {/* Officer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Regulation Bureau Officer Workspace</h1>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800">{user?.name}</strong> • {user?.department || 'Financial Scrutiny Cell'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/officer/verification"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Verification Studio</span>
          </Link>
          <Link
            to="/officer/release-scrutiny"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-navy-900 hover:bg-navy-800 text-white shadow-sm transition-colors"
          >
            <Unlock className="w-3.5 h-3.5 text-teal-400" />
            <span>Release Scrutiny Desk ({releasePending.length})</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Intake Cases"
          value={assignedFdrs.length}
          subtitle="Total portfolio allocation"
          icon={FileCheck2}
          color="navy"
          trend={`${pendingVerification.length} awaiting review`}
          trendType="neutral"
          onClick={() => navigate('/officer/applications')}
        />
        <StatCard
          title="Pending Scrutiny"
          value={pendingVerification.length}
          subtitle="New & resubmitted FDRs"
          icon={Clock}
          color="blue"
          trend="Action required"
          trendType="warning"
          onClick={() => navigate('/officer/applications?status=SUBMITTED')}
        />
        <StatCard
          title="Discrepancies Flagged"
          value={discrepancies.length}
          subtitle="OCR field mismatches"
          icon={AlertTriangle}
          color="rose"
          trend="Requires scrutiny remark"
          trendType="negative"
          onClick={() => navigate('/officer/applications?status=DISCREPANCY_DETECTED')}
        />
        <StatCard
          title="Clarification Pending"
          value={clarificationCases.length}
          subtitle="Awaiting college response"
          icon={HelpCircle}
          color="amber"
          trend="Query dispatched"
          trendType="neutral"
          onClick={() => navigate('/officer/clarifications')}
        />
      </div>

      {/* Two columns: Assigned Priority Cases & Pending Release Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scrutiny Queue (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Applications Awaiting Scrutiny</h3>
              <p className="text-xs text-slate-500">Prioritized by intake date and discrepancy flags</p>
            </div>
            <Link
              to="/officer/applications"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
            >
              <span>View All ({assignedFdrs.length})</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <th className="py-2.5 px-4">Ref / FDR No</th>
                  <th className="py-2.5 px-4">Institution Name</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-center">AI Confidence</th>
                  <th className="py-2.5 px-4 text-center">Stage</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignedFdrs.slice(0, 6).map(fdr => (
                  <tr key={fdr.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-navy-900">{fdr.fdrNumber}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{fdr.applicationReference}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-[200px] truncate">
                      {fdr.institutionName}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatINR(fdr.principalAmount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-mono text-xs font-bold ${
                          (fdr.aiExtractedData?.confidenceScore || 0) >= 75
                            ? 'text-emerald-700'
                            : 'text-rose-600'
                        }`}
                      >
                        {fdr.aiExtractedData?.confidenceScore || 70}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={fdr.workflowStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/officer/applications/${fdr.id}`}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-teal-50 hover:bg-teal-100 text-teal-800 transition-colors"
                      >
                        Scrutinize
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Release Scrutiny Queue (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Release Scrutiny Queue</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {releasePending.length} Pending
              </span>
            </div>

            {releasePending.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No pending release requests.</p>
            ) : (
              <div className="space-y-3">
                {releasePending.map(rel => (
                  <div key={rel.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-navy-900">{rel.id}</span>
                      <span className="font-bold text-slate-900">{formatINR(rel.principalAmount)}</span>
                    </div>
                    <p className="font-semibold text-slate-800 truncate">{rel.institutionName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Reason: {rel.requestReason.replace(/_/g, ' ')}</p>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex justify-end">
                      <Link
                        to="/officer/release-scrutiny"
                        className="text-[11px] font-bold text-teal-600 hover:text-teal-700"
                      >
                        Evaluate Dues & Forward &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/officer/release-scrutiny"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-navy-900 hover:underline text-center block"
          >
            View all release requests &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
