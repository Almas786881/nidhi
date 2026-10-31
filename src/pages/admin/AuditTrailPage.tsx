import React, { useState, useEffect } from 'react';
import { auditService } from '@/services/auditService';
import { DataTable, type Column } from '@/components/common/DataTable';
import { formatDateTime } from '@/utils/formatters';
import {
  ShieldCheck,
  ShieldAlert,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Info,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { AuditLog } from '@/types';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Cryptographic Chain Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    totalRecords: number;
    message: string;
    tamperedRecord?: AuditLog;
  } | null>(null);

  // Detail Modal
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    const data = await auditService.getLogs({
      category: selectedCategory === 'ALL' ? undefined : selectedCategory,
      userRole: selectedRole === 'ALL' ? undefined : selectedRole,
    });
    setLogs(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [selectedCategory, selectedRole]);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const result = await auditService.verifyChainIntegrity();
      setVerificationResult(result);
    } catch (err: any) {
      setVerificationResult({
        isValid: false,
        totalRecords: 0,
        message: 'Chain validation threw an unhandled exception: ' + err.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const columns: Column<AuditLog>[] = [
    {
      header: 'Event ID',
      accessorKey: 'eventId',
      sortable: true,
      className: 'font-mono text-xs font-semibold text-navy-900',
    },
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      sortable: true,
      cell: row => (
        <span className="text-xs font-mono text-slate-600">{formatDateTime(row.timestamp)}</span>
      ),
    },
    {
      header: 'Actor & Role',
      cell: row => (
        <div className="text-xs">
          <div className="font-semibold text-slate-900">{row.userName}</div>
          <div className="text-[10px] text-slate-500 font-mono tracking-tight">{row.userRole}</div>
        </div>
      ),
    },
    {
      header: 'Action & Category',
      cell: row => (
        <div className="text-xs">
          <div className="font-bold text-slate-800">{row.action.replace(/_/g, ' ')}</div>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono uppercase">
            {row.category}
          </span>
        </div>
      ),
    },
    {
      header: 'Audit Description',
      accessorKey: 'description',
      cell: row => (
        <p className="text-xs text-slate-700 max-w-sm truncate" title={row.description}>
          {row.description}
        </p>
      ),
    },
    {
      header: 'SHA-256 Signature',
      cell: row => (
        <div className="font-mono text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 truncate max-w-[120px]" title={row.entryHash}>
          {row.entryHash.slice(0, 14)}...
        </div>
      ),
    },
    {
      header: 'Inspection',
      cell: row => (
        <button
          onClick={() => setActiveLog(row)}
          className="p-1 rounded text-slate-500 hover:text-navy-900 hover:bg-slate-100"
          title="Inspect State Payload"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Cryptographic Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable, append-only security ledger with SHA-256 sequential hash chaining
          </p>
        </div>
        <button
          onClick={handleVerifyChain}
          disabled={isVerifying}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
          <span>{isVerifying ? 'Recalculating Hashes...' : 'Verify Cryptographic Chain'}</span>
        </button>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            verificationResult.isValid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {verificationResult.isValid ? (
            <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <h4 className="font-bold text-sm">
              {verificationResult.isValid ? 'Cryptographic Integrity Confirmed' : 'Audit Chain Tampering Detected!'}
            </h4>
            <p className="mt-1 leading-relaxed">{verificationResult.message}</p>
          </div>
        </div>
      )}

      {/* Production Notice Banner */}
      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-blue-900 text-xs">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Cryptographic Chaining Architecture:</span> Each audit entry incorporates the SHA-256 hash of the immediately preceding entry. Any unauthorized modification to an IndexedDB block immediately breaks the subsequent chain hashes. Note: In production AICTE deployments, this is coupled with remote WORM (Write Once Read Many) cloud HSM vaults.
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filters:</span>
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="AUTH">Authentication</option>
            <option value="FDR">FDR Lifecycle</option>
            <option value="VERIFICATION">Verification</option>
            <option value="SCRUTINY">Officer Scrutiny</option>
            <option value="CLARIFICATION">Clarifications</option>
            <option value="RENEWAL">Renewals</option>
            <option value="RELEASE">Releases</option>
            <option value="ADMIN">Administrative</option>
          </select>
        </div>

        <div>
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none"
          >
            <option value="ALL">All User Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="OFFICER">OFFICER</option>
            <option value="AUTHORITY">AUTHORITY</option>
            <option value="INSTITUTION">INSTITUTION</option>
          </select>
        </div>
      </div>

      <DataTable
        data={logs}
        columns={columns}
        searchPlaceholder="Search audit events by action, user or description..."
      />

      {/* Inspect State Payload Modal */}
      <Modal
        isOpen={!!activeLog}
        onClose={() => setActiveLog(null)}
        title={`Audit Block Payload: ${activeLog?.eventId}`}
        description={`Recorded on ${activeLog ? formatDateTime(activeLog.timestamp) : ''} by ${activeLog?.userName} (${activeLog?.userRole})`}
        maxWidth="2xl"
      >
        {activeLog && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Event Action</label>
              <div className="p-2.5 rounded bg-slate-100 font-mono text-slate-900 font-bold">
                {activeLog.action}
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Detailed Description</label>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-800">
                {activeLog.description}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Previous Hash (H_prev)</label>
                <div className="p-2 rounded bg-slate-100 font-mono text-[10px] break-all text-slate-600">
                  {activeLog.previousHash}
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Entry Signature (H_curr)</label>
                <div className="p-2 rounded bg-teal-50 border border-teal-200 font-mono text-[10px] break-all text-teal-800 font-semibold">
                  {activeLog.entryHash}
                </div>
              </div>
            </div>

            {activeLog.previousState && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Previous State Snapshot</label>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto font-mono text-[11px]">
                  {activeLog.previousState}
                </pre>
              </div>
            )}

            {activeLog.newState && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">New State Snapshot</label>
                <pre className="p-3 bg-slate-900 text-teal-300 rounded-lg overflow-x-auto font-mono text-[11px]">
                  {activeLog.newState}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
