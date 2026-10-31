import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { releaseService } from '@/services/releaseService';
import { DataTable, type Column } from '@/components/common/DataTable';
import { formatINR, formatDate, formatDateTime } from '@/utils/formatters';
import { Unlock, Building, FileCheck2, ArrowRight } from 'lucide-react';
import type { ReleaseRequest } from '@/types';

export const PendingApprovalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ReleaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRequests = async () => {
    setIsLoading(true);
    const list = await releaseService.listRequests();
    // Only show SCRUTINIZED cases awaiting authority decision
    setRequests(list.filter(r => r.status === 'SCRUTINIZED'));
    setIsLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const columns: Column<ReleaseRequest>[] = [
    {
      header: 'Docket Reference',
      accessorKey: 'id',
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
          <div className="text-[11px] text-slate-500 font-mono">FDR No: {row.fdrNumber}</div>
        </div>
      ),
    },
    {
      header: 'Lien Amount',
      accessorKey: 'principalAmount',
      sortable: true,
      cell: row => (
        <span className="font-bold text-slate-900 text-xs">{formatINR(row.principalAmount)}</span>
      ),
    },
    {
      header: 'Release Mandate',
      cell: row => (
        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
          {row.requestReason.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Officer Scrutiny Finding',
      cell: row => (
        <div className="text-xs max-w-xs">
          <div className="font-semibold text-teal-800">{row.officerName}</div>
          <div className="text-slate-500 text-[11px] truncate">{row.officerScrutinyRemarks}</div>
        </div>
      ),
    },
    {
      header: 'Scrutiny Date',
      cell: row => (
        <span className="text-xs font-mono text-slate-500">{formatDate(row.scrutinizedAt)}</span>
      ),
    },
    {
      header: 'Action',
      cell: row => (
        <button
          onClick={() => navigate(`/authority/approvals/${row.id}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-navy-950 transition-colors shadow-xs"
        >
          <Unlock className="w-3.5 h-3.5" />
          <span>Review & Decide</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Cases Awaiting Statutory Approval</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review regulation officer scrutiny findings and exercise executive approval / rejection authority
        </p>
      </div>

      <DataTable
        data={requests}
        columns={columns}
        searchPlaceholder="Search by Release ID, institution or FDR number..."
        emptyTitle="No Cases Awaiting Final Approval"
        emptyDescription="All release applications have been processed or are still under officer scrutiny."
      />
    </div>
  );
};
