import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { releaseService } from '@/services/releaseService';
import { db } from '@/db/dexie';
import { DataTable, type Column } from '@/components/common/DataTable';
import { formatINR, formatDate, formatDateTime } from '@/utils/formatters';
import { History, Award, CheckCircle2, XCircle, Eye } from 'lucide-react';
import type { ReleaseRequest } from '@/types';

export const DecisionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState<ReleaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const list = await releaseService.listRequests();
    setDecisions(list.filter(r => ['APPROVED', 'REJECTED'].includes(r.status)));
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: Column<ReleaseRequest>[] = [
    {
      header: 'Docket Reference',
      accessorKey: 'id',
      sortable: true,
      className: 'font-mono text-xs font-bold text-navy-900',
    },
    {
      header: 'Institution & FDR',
      cell: row => (
        <div>
          <div className="font-semibold text-slate-900 text-xs">{row.institutionName}</div>
          <div className="text-[11px] text-slate-500 font-mono">FDR: {row.fdrNumber}</div>
        </div>
      ),
    },
    {
      header: 'Discharged Amount',
      accessorKey: 'principalAmount',
      sortable: true,
      cell: row => (
        <span className="font-bold text-slate-900 text-xs">{formatINR(row.principalAmount)}</span>
      ),
    },
    {
      header: 'Authority Decision',
      cell: row => (
        <span
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
            row.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}
        >
          {row.status === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {row.status}
        </span>
      ),
    },
    {
      header: 'Authority Remarks',
      accessorKey: 'authorityDecisionRemarks',
      cell: row => (
        <p className="text-xs text-slate-700 max-w-xs truncate" title={row.authorityDecisionRemarks}>
          {row.authorityDecisionRemarks}
        </p>
      ),
    },
    {
      header: 'Signed Timestamp',
      cell: row => (
        <div className="text-xs font-mono text-slate-500">
          <div>{formatDate(row.authorityDecidedAt)}</div>
          <div className="text-[10px] text-slate-400">By {row.authorityDecidedBy}</div>
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: row => (
        <button
          onClick={() => navigate(`/authority/approvals/${row.id}`)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
        >
          <Eye className="w-3.5 h-3.5 text-teal-600" />
          <span>Certificate</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Executive Decision Archive</h1>
        <p className="text-xs text-slate-500 mt-1">
          Historical ledger of all approved and rejected security deposit release orders executed by the Competent Authority
        </p>
      </div>

      <DataTable
        data={decisions}
        columns={columns}
        searchPlaceholder="Filter by Release ID, institution or FDR number..."
      />
    </div>
  );
};
