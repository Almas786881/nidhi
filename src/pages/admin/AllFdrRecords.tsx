import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fdrService } from '@/services/fdrService';
import { reportService } from '@/services/reportService';
import { DataTable, type Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatINR, formatDate, getDaysRemaining } from '@/utils/formatters';
import { FileText, Download, Filter, Eye, CheckCircle2 } from 'lucide-react';
import type { FDRRecord, FdrWorkflowStatus } from '@/types';

export const AllFdrRecords: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const initialStatus = (searchParams.get('status') as FdrWorkflowStatus) || 'ALL';
  const [selectedStatus, setSelectedStatus] = useState<FdrWorkflowStatus | 'ALL'>(initialStatus);
  const [selectedBank, setSelectedBank] = useState('ALL');

  const loadFdrs = async () => {
    setIsLoading(true);
    const list = await fdrService.listFdrs({
      workflowStatus: selectedStatus,
      bankName: selectedBank,
    });
    setFdrs(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadFdrs();
  }, [selectedStatus, selectedBank]);

  const columns: Column<FDRRecord>[] = [
    {
      header: 'Application Ref',
      accessorKey: 'applicationReference',
      sortable: true,
      className: 'font-mono text-xs font-semibold text-navy-900',
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
          <div className="font-medium text-slate-800">{row.bankName}</div>
          <div className="text-slate-500 font-mono text-[11px]">{row.fdrNumber}</div>
        </div>
      ),
    },
    {
      header: 'Principal Amount',
      accessorKey: 'principalAmount',
      sortable: true,
      cell: row => (
        <div>
          <span className="font-bold text-slate-900 text-xs">{formatINR(row.principalAmount)}</span>
          {row.interestRate && (
            <span className="text-[10px] text-slate-400 block font-mono">@{row.interestRate}% p.a.</span>
          )}
        </div>
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
              className={`text-[10px] font-medium ${
                days < 0
                  ? 'text-rose-600 font-bold'
                  : days <= 30
                  ? 'text-amber-600 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Workflow Status',
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
        <button
          onClick={() => navigate(`/institution/fdrs/${row.id}`)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-teal-600" />
          <span>Inspect</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Institutional FDR Master Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive database of all active, matured, verified, and released fixed deposit receipts
          </p>
        </div>
        <button
          onClick={() => reportService.exportFdrMasterCsv()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-navy-900 text-white hover:bg-navy-800 shadow-sm transition-colors"
        >
          <Download className="w-4 h-4 text-teal-400" />
          <span>Export Master CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filters:</span>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-900"
          >
            <option value="ALL">All Workflow Stages</option>
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

        <div>
          <select
            value={selectedBank}
            onChange={e => setSelectedBank(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-900"
          >
            <option value="ALL">All Scheduled Banks</option>
            <option value="State Bank of India">State Bank of India</option>
            <option value="Punjab National Bank">Punjab National Bank</option>
            <option value="Canara Bank">Canara Bank</option>
            <option value="Bank of Baroda">Bank of Baroda</option>
            <option value="HDFC Bank">HDFC Bank Ltd</option>
            <option value="ICICI Bank">ICICI Bank</option>
            <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
          </select>
        </div>
      </div>

      <DataTable
        data={fdrs}
        columns={columns}
        searchPlaceholder="Search by FDR number, institution, bank or reference..."
      />
    </div>
  );
};
