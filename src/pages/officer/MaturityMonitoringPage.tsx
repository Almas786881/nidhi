import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { maturityService, type MaturityItem, type MaturityCategory } from '@/services/maturityService';
import { formatINR, formatDate, getDaysRemaining } from '@/utils/formatters';
import { DataTable, type Column } from '@/components/common/DataTable';
import {
  CalendarClock,
  Clock,
  AlertTriangle,
  RotateCw,
  Eye,
  Filter,
  CheckCircle2,
  Calendar,
  Info,
} from 'lucide-react';

export const MaturityMonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  const [monitoredItems, setMonitoredItems] = useState<MaturityItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MaturityCategory | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const items = await maturityService.getMonitoredFdrs(null, selectedCategory);
    setMonitoredItems(items);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    // Run reminder alert check
    maturityService.checkAndTriggerMaturityAlerts();
  }, [selectedCategory]);

  const categoryCounts = {
    expiring7: monitoredItems.filter(i => i.category === 'EXPIRING_7_DAYS').length,
    expiring30: monitoredItems.filter(i => i.category === 'EXPIRING_30_DAYS').length,
    expiring60: monitoredItems.filter(i => i.category === 'EXPIRING_60_DAYS').length,
    expiring90: monitoredItems.filter(i => i.category === 'EXPIRING_90_DAYS').length,
    matured: monitoredItems.filter(i => i.category === 'MATURED').length,
  };

  const columns: Column<MaturityItem>[] = [
    {
      header: 'FDR Number & Ref',
      accessorKey: 'fdr',
      sortable: false,
      cell: row => (
        <div>
          <div className="font-mono font-bold text-navy-900 text-xs">{row.fdr.fdrNumber}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.fdr.applicationReference}</div>
        </div>
      ),
    },
    {
      header: 'Institution & Bank',
      cell: row => (
        <div>
          <div className="font-semibold text-slate-900 text-xs">{row.fdr.institutionName}</div>
          <div className="text-[11px] text-slate-500">{row.fdr.bankName}</div>
        </div>
      ),
    },
    {
      header: 'Principal Amount',
      cell: row => (
        <span className="font-bold text-slate-900 text-xs">{formatINR(row.fdr.principalAmount)}</span>
      ),
    },
    {
      header: 'Maturity Date',
      cell: row => (
        <span className="text-xs text-slate-700 font-mono">{formatDate(row.fdr.maturityDate)}</span>
      ),
    },
    {
      header: 'Time to Maturity',
      cell: row => {
        const days = row.daysRemaining;
        return (
          <span
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${
              days < 0
                ? 'bg-red-100 text-red-800'
                : days <= 7
                ? 'bg-rose-100 text-rose-800 animate-pulse'
                : days <= 30
                ? 'bg-amber-100 text-amber-800'
                : days <= 60
                ? 'bg-yellow-100 text-yellow-800'
                : days <= 90
                ? 'bg-blue-100 text-blue-800'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {days < 0 ? `${Math.abs(days)}d Overdue` : `${days} Days Left`}
          </span>
        );
      },
    },
    {
      header: 'Category Classification',
      cell: row => (
        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-700 uppercase">
          {row.category.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Action',
      cell: row => (
        <button
          onClick={() => navigate(`/officer/applications/${row.fdr.id}`)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
        >
          <Eye className="w-3.5 h-3.5 text-teal-600" />
          <span>Inspect</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-950 tracking-tight">FDR Maturity & Renewal Radar</h1>
        <p className="text-xs text-slate-500 mt-1">
          Automated date-driven classification engine monitoring 90, 60, 30, and 7-day expiration thresholds
        </p>
      </div>

      {/* Scheduler Notice Box */}
      <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl flex items-start gap-3 text-xs text-slate-700">
        <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-slate-900">Browser Scheduler Abstraction:</span> In this offline-capable client prototype, maturity deadlines and in-app notifications are dynamically recalculated whenever the application boots or records change. A production government system additionally hooks into system-level CRON microservices and SMS/Email gateway adapters.
        </div>
      </div>

      {/* Quick Category Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setSelectedCategory('EXPIRING_7_DAYS')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedCategory === 'EXPIRING_7_DAYS'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] font-bold text-rose-700 uppercase">Within 7 Days</p>
          <p className="text-xl font-extrabold text-rose-950 mt-1">{categoryCounts.expiring7}</p>
        </button>

        <button
          onClick={() => setSelectedCategory('EXPIRING_30_DAYS')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedCategory === 'EXPIRING_30_DAYS'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] font-bold text-amber-700 uppercase">Within 30 Days</p>
          <p className="text-xl font-extrabold text-amber-950 mt-1">{categoryCounts.expiring30}</p>
        </button>

        <button
          onClick={() => setSelectedCategory('EXPIRING_60_DAYS')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedCategory === 'EXPIRING_60_DAYS'
              ? 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] font-bold text-yellow-800 uppercase">Within 60 Days</p>
          <p className="text-xl font-extrabold text-yellow-950 mt-1">{categoryCounts.expiring60}</p>
        </button>

        <button
          onClick={() => setSelectedCategory('EXPIRING_90_DAYS')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedCategory === 'EXPIRING_90_DAYS'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] font-bold text-blue-700 uppercase">Within 90 Days</p>
          <p className="text-xl font-extrabold text-blue-950 mt-1">{categoryCounts.expiring90}</p>
        </button>

        <button
          onClick={() => setSelectedCategory('MATURED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            selectedCategory === 'MATURED'
              ? 'bg-red-50 border-red-300 ring-2 ring-red-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[10px] font-bold text-red-700 uppercase">Matured / Overdue</p>
          <p className="text-xl font-extrabold text-red-950 mt-1">{categoryCounts.matured}</p>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
            selectedCategory === 'ALL'
              ? 'bg-navy-900 text-white border-navy-900'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Show All Maturing & Active FDRs ({monitoredItems.length})
        </button>
      </div>

      <DataTable
        data={monitoredItems}
        columns={columns}
        searchPlaceholder="Filter by FDR number, institution or bank..."
      />
    </div>
  );
};
