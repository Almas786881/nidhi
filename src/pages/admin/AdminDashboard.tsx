import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fdrService } from '@/services/fdrService';
import { auditService } from '@/services/auditService';
import { reportService } from '@/services/reportService';
import { formatINR, formatINRAbbreviated, formatDateTime } from '@/utils/formatters';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  Building2,
  FileCheck2,
  AlertTriangle,
  Clock,
  Unlock,
  ShieldAlert,
  Download,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { AuditLog } from '@/types';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [recentAudits, setRecentAudits] = useState<AuditLog[]>([]);
  const [institutionSummary, setInstitutionSummary] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [liveStats, logs, insts] = await Promise.all([
          fdrService.getLiveStats(),
          auditService.getLogs(),
          reportService.getInstitutionWiseSummary(),
        ]);
        setStats(liveStats);
        setRecentAudits(logs.slice(0, 6));
        setInstitutionSummary(insts.slice(0, 5));
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading || !stats) {
    return <LoadingSpinner size="lg" message="Loading real-time institutional dashboard metrics..." />;
  }

  // Monthly submissions chart data
  const monthlyData = [
    { month: 'Jun', count: 2, amount: 45 },
    { month: 'Jul', count: 3, amount: 60 },
    { month: 'Aug', count: 4, amount: 95 },
    { month: 'Sep', count: 5, amount: 120 },
    { month: 'Oct', count: 8, amount: 185 },
  ];

  // Bank distribution
  const bankData = [
    { name: 'State Bank of India', value: 38, color: '#0B2545' },
    { name: 'Punjab National Bank', value: 24, color: '#134074' },
    { name: 'Canara Bank', value: 16, color: '#0D9488' },
    { name: 'Bank of Baroda', value: 12, color: '#D97706' },
    { name: 'Other Banks', value: 10, color: '#64748B' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">AICTE Executive Administration</h1>
          <p className="text-xs text-slate-500 mt-1">
            Institutional Fixed Deposit Receipts (FDR) & Security Deposit Master Governance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => reportService.exportFdrMasterCsv()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Master CSV</span>
          </button>
          <Link
            to="/admin/audit"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-navy-900 text-white hover:bg-navy-800 shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Cryptographic Audit</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Deposits"
          value={formatINRAbbreviated(stats.totalDepositAmount)}
          subtitle={`${stats.totalFdrs} Total Instruments registered`}
          icon={TrendingUp}
          color="navy"
          trend={`${stats.activeFdrs} active & verified`}
          trendType="positive"
          onClick={() => navigate('/admin/fdrs')}
        />
        <StatCard
          title="Affiliated Institutions"
          value={stats.totalInstitutions}
          subtitle="All regions (North, South, East, West)"
          icon={Building2}
          color="blue"
          trend="8 Accredited institutions"
          trendType="neutral"
          onClick={() => navigate('/admin/institutions')}
        />
        <StatCard
          title="Expiring Within 90 Days"
          value={stats.expiringIn90}
          subtitle={`${stats.expiringIn30} within 30 days | ${stats.expiringIn7} urgent`}
          icon={Clock}
          color="amber"
          trend={stats.expiringIn7 > 0 ? `${stats.expiringIn7} requiring immediate renewal` : 'On schedule'}
          trendType={stats.expiringIn7 > 0 ? 'warning' : 'positive'}
          onClick={() => navigate('/admin/maturity')}
        />
        <StatCard
          title="Discrepancies Flagged"
          value={stats.discrepancies}
          subtitle={`${stats.pendingVerification} pending officer review`}
          icon={AlertTriangle}
          color="rose"
          trend="OCR Discrepancy detected"
          trendType="negative"
          onClick={() => navigate('/admin/fdrs?status=DISCREPANCY_DETECTED')}
        />
      </div>

      {/* Secondary KPI bar: Release requests & Matured */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Awaiting Release Approval</p>
            <h4 className="text-xl font-bold text-slate-900 mt-1">{stats.pendingReleaseApproval} Requests</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Value: {formatINR(stats.totalValueAwaitingRelease)}</p>
          </div>
          <button
            onClick={() => navigate('/admin/releases')}
            className="p-2.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
          >
            <Unlock className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Under Officer Scrutiny</p>
            <h4 className="text-xl font-bold text-slate-900 mt-1">{stats.pendingVerification} FDRs</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Intake verification in progress</p>
          </div>
          <button
            onClick={() => navigate('/admin/fdrs')}
            className="p-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <FileCheck2 className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Matured Instruments</p>
            <h4 className="text-xl font-bold text-slate-900 mt-1">{stats.maturedCount} FDRs</h4>
            <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Lien renewal overdue</p>
          </div>
          <button
            onClick={() => navigate('/admin/maturity')}
            className="p-2.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
          >
            <ShieldAlert className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Intake Volume Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly FDR Submission Trend</h3>
              <p className="text-xs text-slate-500">Deposit volume in ₹ Lakhs</p>
            </div>
            <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
              Current Fiscal
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`₹${val} Lakhs`, 'Deposit Value']}
                  contentStyle={{ backgroundColor: '#0B2545', color: '#fff', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="amount" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bank Exposure Distribution Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bank Concentration Exposure</h3>
              <p className="text-xs text-slate-500">Percentage share of total FDR value</p>
            </div>
            <span className="text-xs font-semibold text-navy-700 bg-navy-50 px-2 py-0.5 rounded">
              Scheduled Banks
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bankData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {bankData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Share']}
                  contentStyle={{ backgroundColor: '#0B2545', color: '#fff', borderRadius: 8, fontSize: 12 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two columns: Institution Statistics Table & Real-time Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Institutions by Deposit Value (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Institution-Wise Deposit Portfolio</h3>
              <p className="text-xs text-slate-500">Accredited colleges and active regulatory deposit counts</p>
            </div>
            <Link
              to="/admin/institutions"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Institution Name</th>
                  <th className="py-2.5 px-4">Region</th>
                  <th className="py-2.5 px-4 text-center">FDRs</th>
                  <th className="py-2.5 px-4 text-right">Total Deposited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {institutionSummary.map(inst => (
                  <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">{inst.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">{inst.name}</td>
                    <td className="py-3 px-4 text-slate-600">{inst.region} ({inst.state})</td>
                    <td className="py-3 px-4 text-center font-bold text-navy-900">{inst.totalFdrs}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatINR(inst.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Audit Trail Stream (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Recent Audit Events</h3>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                Tamper-Evident
              </span>
            </div>
            <div className="space-y-3.5">
              {recentAudits.map(log => (
                <div key={log.id} className="text-xs border-l-2 border-teal-500 pl-3 py-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{log.action.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateTime(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{log.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">By {log.userName} ({log.userRole})</p>
                </div>
              ))}
            </div>
          </div>
          <Link
            to="/admin/audit"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-teal-600 hover:text-teal-700 text-center block"
          >
            Verify SHA-256 Chain Integrity &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
