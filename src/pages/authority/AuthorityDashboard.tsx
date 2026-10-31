import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { releaseService } from '@/services/releaseService';
import { fdrService } from '@/services/fdrService';
import { formatINR, formatDateTime, formatDate } from '@/utils/formatters';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  Award,
  Unlock,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  FileCheck2,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type { ReleaseRequest } from '@/types';

export const AuthorityDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ReleaseRequest[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<ReleaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [liveStats, allRequests] = await Promise.all([
          fdrService.getLiveStats(),
          releaseService.listRequests(),
        ]);
        setStats(liveStats);
        setPendingApprovals(allRequests.filter(r => r.status === 'SCRUTINIZED'));
        setRecentDecisions(allRequests.filter(r => ['APPROVED', 'REJECTED'].includes(r.status)));
      } catch (err) {
        console.error('Failed to load authority dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading || !stats) {
    return <LoadingSpinner size="lg" message="Loading executive authority docket..." />;
  }

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-navy-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
            AICTE Statutory Approval Authority
          </span>
          <h1 className="text-xl sm:text-2xl font-bold mt-2 tracking-tight">
            Competent Authority Executive Docket
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Mandatory explicit human approval jurisdiction for fixed deposit releases and lien discharges
          </p>
        </div>
        <div>
          <Link
            to="/authority/approvals"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 shadow-md transition-all active:scale-[0.98]"
          >
            <Unlock className="w-4 h-4" />
            <span>Review Pending Approvals ({pendingApprovals.length})</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Authority Decision"
          value={pendingApprovals.length}
          subtitle="Scrutinized & recommended by officers"
          icon={Unlock}
          color="amber"
          trend="Awaiting final human decision"
          trendType="warning"
          onClick={() => navigate('/authority/approvals')}
        />
        <StatCard
          title="Value Awaiting Release"
          value={formatINR(stats.totalValueAwaitingRelease)}
          subtitle="Security deposits under review"
          icon={TrendingUp}
          color="navy"
          trend="Total lien amount"
          trendType="neutral"
          onClick={() => navigate('/authority/approvals')}
        />
        <StatCard
          title="Approved Releases"
          value={stats.approvedReleases}
          subtitle="Formally discharged deposits"
          icon={CheckCircle2}
          color="emerald"
          trend="Certificates issued"
          trendType="positive"
          onClick={() => navigate('/authority/decision-history')}
        />
        <StatCard
          title="Total Active Capital"
          value={formatINR(stats.totalDepositAmount)}
          subtitle={`${stats.totalFdrs} Total registered instruments`}
          icon={ShieldCheck}
          color="blue"
          trend="Under AICTE custody"
          trendType="positive"
          onClick={() => navigate('/admin/fdrs')}
        />
      </div>

      {/* Two columns: Priority Cases Awaiting Decision & Recent Decision History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases Awaiting Decision (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Release Cases Awaiting Executive Approval</h3>
              <p className="text-xs text-slate-500">Officer scrutiny completed and verified with all regulatory clearances</p>
            </div>
            <Link
              to="/authority/approvals"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
            >
              <span>View All ({pendingApprovals.length})</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <th className="py-2.5 px-4">Release ID</th>
                  <th className="py-2.5 px-4">Institution Name</th>
                  <th className="py-2.5 px-4 text-right">Lien Amount</th>
                  <th className="py-2.5 px-4">Scrutiny Recommendation</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No release applications currently pending executive decision.
                    </td>
                  </tr>
                ) : (
                  pendingApprovals.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-navy-900">{req.id}</div>
                        <div className="text-[10px] text-slate-400 font-mono">FDR: {req.fdrNumber}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-[200px] truncate">
                        {req.institutionName}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatINR(req.principalAmount)}
                      </td>
                      <td className="py-3 px-4 text-teal-800">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-teal-50 border border-teal-200 font-semibold block truncate max-w-[180px]">
                          {req.officerScrutinyRemarks || 'Recommended for Approval'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/authority/approvals/${req.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-navy-950 transition-colors"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Decide</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Decisions Feed (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Recent Decisions</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Signed Orders
              </span>
            </div>

            {recentDecisions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent decisions</p>
            ) : (
              <div className="space-y-3">
                {recentDecisions.slice(0, 4).map(dec => (
                  <div key={dec.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-navy-900">{dec.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          dec.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {dec.status}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 truncate">{dec.institutionName}</p>
                    <p className="font-bold text-slate-900 mt-0.5">{formatINR(dec.principalAmount)}</p>
                    {dec.approvalCertificateRef && (
                      <p className="text-[10px] text-teal-700 font-mono mt-1 truncate">
                        Cert: {dec.approvalCertificateRef}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/authority/decision-history"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-navy-900 hover:underline text-center block"
          >
            Full Release Decision Archive &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
