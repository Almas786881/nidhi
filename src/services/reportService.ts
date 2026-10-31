import { db } from '@/db/dexie';
import { formatDate, formatINR, getDaysRemaining } from '@/utils/formatters';

export const reportService = {
  /**
   * Generates institution-wise summary
   */
  async getInstitutionWiseSummary() {
    const insts = await db.institutions.toArray();
    const fdrs = await db.fdrRecords.toArray();

    return insts.map(inst => {
      const instFdrs = fdrs.filter(f => f.institutionId === inst.id);
      const totalAmount = instFdrs.reduce((acc, f) => acc + (f.principalAmount || 0), 0);
      const activeCount = instFdrs.filter(f => ['VERIFIED', 'UNDER_VERIFICATION'].includes(f.workflowStatus)).length;
      const discrepancyCount = instFdrs.filter(f => f.workflowStatus === 'DISCREPANCY_DETECTED').length;
      const releaseCount = instFdrs.filter(f => f.isReleased || f.workflowStatus === 'RELEASE_APPROVED').length;

      return {
        id: inst.id,
        code: inst.code,
        name: inst.name,
        region: inst.region,
        state: inst.state,
        totalFdrs: instFdrs.length,
        totalAmount,
        activeCount,
        discrepancyCount,
        releaseCount,
      };
    });
  },

  /**
   * Generates Officer Workload & Scrutiny Performance report
   */
  async getOfficerPerformance() {
    const officers = await db.users.where('role').equals('OFFICER').toArray();
    const fdrs = await db.fdrRecords.toArray();
    const verifications = await db.verificationRecords.toArray();
    const remarks = await db.scrutinyRemarks.toArray();

    return officers.map(officer => {
      const assigned = fdrs.filter(f => f.assignedOfficerId === officer.id);
      const verified = verifications.filter(v => v.officerId === officer.id && v.overallStatus === 'CONFIRMED_BY_BANK');
      const remarksCount = remarks.filter(r => r.officerId === officer.id).length;
      const pending = assigned.filter(f => ['SUBMITTED', 'UNDER_VERIFICATION', 'RESUBMITTED'].includes(f.workflowStatus)).length;

      return {
        id: officer.id,
        name: officer.name,
        department: officer.department || 'Regulation Bureau',
        assignedCount: assigned.length,
        verifiedCount: verified.length,
        pendingCount: pending,
        remarksCount,
      };
    });
  },

  /**
   * Converts an array of objects to CSV format and downloads it
   */
  downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row
          .map(cell => {
            const str = String(cell ?? '').replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',')
      ),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  /**
   * Generates and downloads FDR Master Ledger CSV
   */
  async exportFdrMasterCsv() {
    const fdrs = await db.fdrRecords.toArray();
    const headers = [
      'Application Reference',
      'FDR Number',
      'Institution Name',
      'Bank Name',
      'Branch',
      'Principal Amount (INR)',
      'Interest Rate (%)',
      'Issue Date',
      'Maturity Date',
      'Days Remaining',
      'Workflow Status',
      'Verification Status',
      'Bank Confirmed',
      'Assigned Officer',
    ];

    const rows = fdrs.map(f => [
      f.applicationReference,
      f.fdrNumber,
      f.institutionName,
      f.bankName,
      f.branchName,
      f.principalAmount,
      f.interestRate || 'N/A',
      formatDate(f.issueDate, 'yyyy-MM-dd'),
      formatDate(f.maturityDate, 'yyyy-MM-dd'),
      getDaysRemaining(f.maturityDate),
      f.workflowStatus,
      f.verificationStatus,
      f.bankConfirmed ? 'YES' : 'NO',
      f.assignedOfficerName || 'Unassigned',
    ]);

    this.downloadCsv('NIDHI_FDR_Master_Ledger', headers, rows);
  },
};
