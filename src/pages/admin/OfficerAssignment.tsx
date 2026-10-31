import React, { useState, useEffect } from 'react';
import { db } from '@/db/dexie';
import { auditService } from '@/services/auditService';
import { notificationService } from '@/services/notificationService';
import { useAuthStore } from '@/store/authStore';
import { DataTable, type Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import { formatINR, formatDate } from '@/utils/formatters';
import { UserCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import type { FDRRecord, User } from '@/types';

export const OfficerAssignment: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [selectedFdr, setSelectedFdr] = useState<FDRRecord | null>(null);
  const [assignedOfficerId, setAssignedOfficerId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const [allFdrs, allOfficers] = await Promise.all([
      db.fdrRecords.toArray(),
      db.users.where('role').equals('OFFICER').and(u => u.isActive).toArray(),
    ]);
    allFdrs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setFdrs(allFdrs);
    setOfficers(allOfficers);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAssign = (fdr: FDRRecord) => {
    setSelectedFdr(fdr);
    setAssignedOfficerId(fdr.assignedOfficerId || (officers[0]?.id || ''));
    setAssignmentNotes('');
    setIsModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFdr || !currentUser) return;

    const officer = officers.find(o => o.id === assignedOfficerId);
    if (!officer) return;

    const now = new Date().toISOString();

    // Update FDR record
    await db.fdrRecords.update(selectedFdr.id, {
      assignedOfficerId: officer.id,
      assignedOfficerName: officer.name,
      assignedAt: now,
      updatedAt: now,
    });

    // Add officer assignment entry
    await db.officerAssignments.add({
      id: `ASGN-${Date.now()}`,
      fdrId: selectedFdr.id,
      officerId: officer.id,
      officerName: officer.name,
      assignedById: currentUser.id,
      assignedByName: currentUser.name,
      assignedAt: now,
      status: 'ACTIVE',
      notes: assignmentNotes.trim() || 'Assigned via Administrator Workload Allocator',
    });

    // Audit log
    await auditService.log({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      institutionId: selectedFdr.institutionId,
      action: 'OFFICER_REASSIGNED',
      category: 'ADMIN',
      relatedRecordId: selectedFdr.id,
      description: `Reassigned FDR ${selectedFdr.fdrNumber} to Officer ${officer.name} (${officer.department || 'Regulation'}).`,
    });

    // Notify Officer
    await notificationService.notify({
      title: `Case Assigned: ${selectedFdr.fdrNumber}`,
      message: `Administrator assigned FDR application ${selectedFdr.applicationReference} (${selectedFdr.institutionName}) to you for scrutiny.`,
      type: 'INFO',
      category: 'FDR_SUBMISSION',
      targetRole: 'OFFICER',
      userId: officer.id,
      relatedFdrId: selectedFdr.id,
      linkUrl: `/officer/applications/${selectedFdr.id}`,
    });

    setIsModalOpen(false);
    loadData();
  };

  const columns: Column<FDRRecord>[] = [
    {
      header: 'Application Ref',
      accessorKey: 'applicationReference',
      sortable: true,
      className: 'font-mono text-xs font-semibold text-navy-900',
    },
    {
      header: 'Institution & Bank',
      cell: row => (
        <div>
          <div className="font-semibold text-slate-900 text-xs">{row.institutionName}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{row.bankName} • FDR: <span className="font-mono">{row.fdrNumber}</span></div>
        </div>
      ),
    },
    {
      header: 'Principal Amount',
      accessorKey: 'principalAmount',
      sortable: true,
      cell: row => (
        <span className="font-bold text-slate-900 text-xs">{formatINR(row.principalAmount)}</span>
      ),
    },
    {
      header: 'Workflow Stage',
      cell: row => <StatusBadge status={row.workflowStatus} size="sm" />,
    },
    {
      header: 'Assigned Scrutiny Officer',
      cell: row => (
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center">
            {row.assignedOfficerName ? row.assignedOfficerName.charAt(0) : '?'}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">
              {row.assignedOfficerName || <span className="text-rose-500 font-normal italic">Unassigned</span>}
            </div>
            {row.assignedAt && (
              <div className="text-[10px] text-slate-400">Assigned {formatDate(row.assignedAt)}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Action',
      cell: row => (
        <button
          onClick={() => handleOpenAssign(row)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
        >
          <UserCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>{row.assignedOfficerId ? 'Reassign' : 'Assign'}</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Officer Workload Allocation</h1>
          <p className="text-xs text-slate-500 mt-1">
            Distribute FDR verification cases and scrutiny portfolios across Regulation Bureau officers
          </p>
        </div>
      </div>

      <DataTable
        data={fdrs}
        columns={columns}
        searchPlaceholder="Filter by FDR number, institution or assigned officer..."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Assign Regulation Officer"
        description={`Allocate FDR ${selectedFdr?.fdrNumber} (${selectedFdr?.institutionName}) for regulatory scrutiny.`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Regulation Officer</label>
            <select
              required
              value={assignedOfficerId}
              onChange={e => setAssignedOfficerId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
            >
              {officers.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name} – {o.department || 'Regulation Bureau'} ({o.designation})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Assignment Notes</label>
            <textarea
              rows={3}
              value={assignmentNotes}
              onChange={e => setAssignmentNotes(e.target.value)}
              placeholder="Provide any instructions or priority flags for the officer..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
