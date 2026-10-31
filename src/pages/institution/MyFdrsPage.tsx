import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { fdrService } from '@/services/fdrService';
import { DataTable, type Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatINR, formatDate, getDaysRemaining } from '@/utils/formatters';
import { PlusCircle, Eye, Filter, CheckCircle2 } from 'lucide-react';
import type { FDRRecord, FdrWorkflowStatus } from '@/types';

export const MyFdrsPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const initialStatus = (searchParams.get('status') as FdrWorkflowStatus) || 'ALL';
  const [selectedStatus, setSelectedStatus] = useState<FdrWorkflowStatus | 'ALL'>(initialStatus);

  const loadFdrs = async () => {
    if (!user) return;
    setIsLoading(true);
    const list = await fdrService.listFdrs({
      currentUser: user,
      workflowStatus: selectedStatus,
    });
    setFdrs(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadFdrs();
  }, [user, selectedStatus]);

  const columns: Column<FDRRecord>[] = [
    {
      header: 'Application Ref',
      accessorKey: 'applicationReference',
      sortable: true,
      className: 'font-mono text-xs font-bold text-navy-900',
    },
    {
      header: 'FDR Number & Bank',
      cell: row => (
        <div>
          <div className="font-mono font-bold text-slate-900 text-xs">{row.fdrNumber}</div>
          <div className="text-[11px] text-slate-500">{row.bankName} ({row.branchName})</div>
        </div>
      ),
    },
    {
      header: 'Principal Amount',
      accessorKey: 'principalAmount',
      sortable: true,
      cell: row => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{formatINR(row.principalAmount)}</div>
          {row.interestRate && (
            <div className="text-[10px] text-slate-400 font-mono">@{row.interestRate}% p.a.</div>
          )}
        </div>
      ),
    },
    {
      header: 'Deposit Mandate',
      cell: row => (
        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
          {row.depositType.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Maturity Date',
      accessorKey: 'maturityDate',
      sortable: true,
      cell: row => {
        const days = getDaysRemaining(row.maturityDate);
        return (
          <div className="text-xs">
            <div>{formatDate(row.maturityDate)}</div>
            <div
              className={`text-[10px] font-semibold ${
                days < 0
                  ? 'text-rose-600'
                  : days <= 30
                  ? 'text-amber-600 font-bold animate-pulse'
                  : 'text-slate-400'
              }`}
            >
              {days < 0 ? 'Matured / Overdue' : `${days} days left`}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Lifecycle Status',
      cell: row => <StatusBadge status={row.workflowStatus} size="sm" />,
    },
    {
      header: 'Bank Verified',
      cell: row => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
            row.bankConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {row.bankConfirmed && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          {row.bankConfirmed ? 'Confirmed' : 'Pending'}
        </span>
      ),
    },
    {
      header: 'Action',
      cell: row => (
        <button
          onClick={() => navigate(`/institution/fdrs/${row.id}`)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-teal-600" />
          <span>Details</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Institutional FDR Portfolio</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track verification statuses, maturity schedules, and regulatory scrutiny remarks
          </p>
        </div>
        <Link
          to="/institution/submit"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-navy-900 text-white hover:bg-navy-800 shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-teal-400" />
          <span>Submit New FDR</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Stage Filter:</span>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Stages</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_VERIFICATION">Under Verification</option>
            <option value="DISCREPANCY_DETECTED">Discrepancy Detected</option>
            <option value="CLARIFICATION_REQUESTED">Clarification Requested</option>
            <option value="VERIFIED">Verified & Active</option>
            <option value="MATURED">Matured</option>
            <option value="RENEWAL_PENDING">Renewal Pending</option>
            <option value="RELEASE_REQUESTED">Release Requested</option>
            <option value="RELEASE_APPROVED">Release Approved</option>
          </select>
        </div>
      </div>

      <DataTable
        data={fdrs}
        columns={columns}
        searchPlaceholder="Search by FDR number, bank name, or reference..."
      />
    </div>
  );
};
