import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { fdrService } from '@/services/fdrService';
import { DataTable, type Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatINR, formatDate, getDaysRemaining } from '@/utils/formatters';
import { Filter, Eye, Sparkles, CheckCircle2 } from 'lucide-react';
import type { FDRRecord, FdrWorkflowStatus } from '@/types';

export const AssignedApplicationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const initialStatus = (searchParams.get('status') as FdrWorkflowStatus) || 'ALL';
  const [selectedStatus, setSelectedStatus] = useState<FdrWorkflowStatus | 'ALL'>(initialStatus);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    const list = await fdrService.listFdrs({
      assignedOfficerId: user.id,
      workflowStatus: selectedStatus,
    });
    setFdrs(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user, selectedStatus]);

  const columns: Column<FDRRecord>[] = [
    {
      header: 'Application Ref',
      accessorKey: 'applicationReference',
      sortable: true,
      className: 'font-mono text-xs font-bold text-navy-900',
    },
    {
      header: 'Institution Name',
      accessorKey: 'institutionName',
      sortable: true,
      cell: row => (
        <div>
          <div className="font-semibold text-slate-900 text-xs">{row.institutionName}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{row.depositType.replace(/_/g, ' ')}</div>
        </div>
      ),
    },
    {
      header: 'Bank & FDR No',
      cell: row => (
        <div className="text-xs">
          <div className="font-semibold text-slate-900">{row.bankName}</div>
          <div className="text-slate-500 font-mono text-[11px]">{row.fdrNumber}</div>
        </div>
      ),
    },
    {
      header: 'Principal Amount',
      accessorKey: 'principalAmount',
      sortable: true,
      cell: row => (
        <div className="font-bold text-slate-900 text-xs">{formatINR(row.principalAmount)}</div>
      ),
    },
    {
      header: 'OCR Confidence',
      cell: row => {
        const score = row.aiExtractedData?.confidenceScore || 0;
        return (
          <span
            className={`font-mono text-xs font-bold ${
              score >= 75 ? 'text-emerald-700' : score >= 50 ? 'text-amber-700' : 'text-rose-700'
            }`}
          >
            {score}%
          </span>
        );
      },
    },
    {
      header: 'Stage Status',
      cell: row => <StatusBadge status={row.workflowStatus} size="sm" />,
    },
    {
      header: 'Bank Confirmed',
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
      header: 'Actions',
      cell: row => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/officer/applications/${row.id}`)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span>Scrutinize</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Assigned Applications Portfolio</h1>
          <p className="text-xs text-slate-500 mt-1">
            Conduct formal regulatory scrutiny, record bank confirmation, and issue clarifications
          </p>
        </div>
      </div>

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
            <option value="ALL">All Assigned Applications</option>
            <option value="SUBMITTED">Submitted (New Intake)</option>
            <option value="UNDER_VERIFICATION">Under Verification</option>
            <option value="DISCREPANCY_DETECTED">Discrepancy Detected</option>
            <option value="CLARIFICATION_REQUESTED">Clarification Requested</option>
            <option value="RESUBMITTED">Resubmitted by College</option>
            <option value="VERIFIED">Verified & Active</option>
          </select>
        </div>
      </div>

      <DataTable
        data={fdrs}
        columns={columns}
        searchPlaceholder="Filter by FDR number, institution or reference..."
      />
    </div>
  );
};
