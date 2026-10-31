import { db } from '@/db/dexie';
import { documentService } from './documentService';
import { verificationService } from './verificationService';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { getDaysRemaining } from '@/utils/formatters';
import type { FDRRecord, User, DepositType, FdrWorkflowStatus } from '@/types';

export interface SubmitFdrInput {
  bankName: string;
  branchName: string;
  fdrNumber: string;
  accountHolderName: string;
  jointHolderName?: string;
  principalAmount: number;
  interestRate?: number;
  issueDate: string;
  maturityDate: string;
  validityDate?: string;
  depositType: DepositType;
  remarks?: string;
  documentFile: File | Blob;
  documentFileName: string;
  documentMimeType: string;
}

export const fdrService = {
  /**
   * Submits a new FDR record from an institution, uploads file, triggers AI OCR and assigns officer
   */
  async submitFdr(input: SubmitFdrInput, user: User): Promise<FDRRecord> {
    if (!user.institutionId) {
      throw new Error('User is not associated with an accredited institution.');
    }

    // 1. Duplicate check on FDR Number
    const existing = await db.fdrRecords
      .where('fdrNumber')
      .equalsIgnoreCase(input.fdrNumber.trim())
      .first();
    if (existing) {
      throw new Error(`An FDR with number "${input.fdrNumber}" is already registered in the NIDHI portal.`);
    }

    // 2. Fetch institution details
    const inst = await db.institutions.get(user.institutionId);
    if (!inst) throw new Error('Institution record not found.');

    const fdrCount = await db.fdrRecords.count();
    const fdrId = `FDR-${new Date().getFullYear()}-${(fdrCount + 101).toString().padStart(4, '0')}`;
    const applicationReference = `AICTE/FDR/${new Date().getFullYear()}/${(fdrCount + 101).toString().padStart(5, '0')}`;

    // 3. Store uploaded document
    const doc = await documentService.uploadDocument({
      file: input.documentFile,
      fileName: input.documentFileName,
      mimeType: input.documentMimeType,
      institutionId: inst.id,
      institutionName: inst.name,
      fdrId,
      documentCategory: 'ORIGINAL_FDR',
      uploadedBy: user,
      notes: `Original deposit certificate for ${input.depositType}`,
    });

    // 4. Auto-assign officer (pick first active officer or default)
    const officers = await db.users.where('role').equals('OFFICER').and(u => u.isActive).toArray();
    const assignedOfficer = officers.length > 0 ? officers[fdrCount % officers.length] : undefined;

    const now = new Date().toISOString();
    const newRecord: FDRRecord = {
      id: fdrId,
      applicationReference,
      institutionId: inst.id,
      institutionName: inst.name,
      bankName: input.bankName.trim(),
      branchName: input.branchName.trim(),
      fdrNumber: input.fdrNumber.trim(),
      accountHolderName: input.accountHolderName.trim(),
      jointHolderName: input.jointHolderName?.trim() || 'Regional Officer, AICTE',
      principalAmount: Number(input.principalAmount),
      interestRate: input.interestRate ? Number(input.interestRate) : undefined,
      issueDate: input.issueDate,
      maturityDate: input.maturityDate,
      validityDate: input.validityDate || input.maturityDate,
      depositType: input.depositType,
      documentId: doc.id,
      documentName: doc.fileName,
      workflowStatus: 'SUBMITTED',
      verificationStatus: 'PENDING',
      assignedOfficerId: assignedOfficer?.id,
      assignedOfficerName: assignedOfficer?.name,
      assignedAt: assignedOfficer ? now : undefined,
      remarks: input.remarks,
      createdById: user.id,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
    };

    await db.fdrRecords.add(newRecord);

    // If officer assigned, record assignment
    if (assignedOfficer) {
      await db.officerAssignments.add({
        id: `ASGN-${fdrId}`,
        fdrId,
        officerId: assignedOfficer.id,
        officerName: assignedOfficer.name,
        assignedById: user.id,
        assignedByName: user.name,
        assignedAt: now,
        status: 'ACTIVE',
        notes: 'Automated initial intake assignment.',
      });
    }

    // 5. Trigger automated AI OCR verification
    try {
      await verificationService.runAiVerification(fdrId, user);
    } catch (ocrErr) {
      console.warn('Initial automated OCR trigger warning:', ocrErr);
    }

    // Refresh fdr record post verification
    const refreshedFdr = (await db.fdrRecords.get(fdrId)) || newRecord;

    // 6. Audit Log
    await auditService.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      institutionId: inst.id,
      action: 'FDR_SUBMITTED',
      category: 'FDR',
      relatedRecordId: fdrId,
      newState: JSON.stringify({
        id: fdrId,
        ref: applicationReference,
        amount: input.principalAmount,
        bank: input.bankName,
      }),
      description: `Submitted new FDR ${input.fdrNumber} (Ref: ${applicationReference}) for ₹${input.principalAmount.toLocaleString('en-IN')}.`,
    });

    // 7. Dispatch notifications
    await notificationService.notify({
      title: 'New FDR Application Registered',
      message: `${inst.name} submitted application ${applicationReference} for ₹${input.principalAmount.toLocaleString('en-IN')}.`,
      type: 'INFO',
      category: 'FDR_SUBMISSION',
      targetRole: 'OFFICER',
      relatedFdrId: fdrId,
      linkUrl: `/officer/applications/${fdrId}`,
    });

    return refreshedFdr;
  },

  /**
   * Retrieves an FDR record by ID with strict RBAC permission validation
   */
  async getFdrById(fdrId: string, currentUser?: User | null): Promise<FDRRecord> {
    const fdr = await db.fdrRecords.get(fdrId);
    if (!fdr) throw new Error('FDR record not found.');

    if (currentUser?.role === 'INSTITUTION' && currentUser.institutionId !== fdr.institutionId) {
      throw new Error('Access Denied: You are not authorized to view records belonging to another institution.');
    }

    return fdr;
  },

  /**
   * Lists FDRs filtered by search query, status, bank, amount, and user permissions
   */
  async listFdrs(params?: {
    currentUser?: User | null;
    searchTerm?: string;
    workflowStatus?: FdrWorkflowStatus | 'ALL';
    bankName?: string;
    institutionId?: string;
    assignedOfficerId?: string;
    expiringWithinDays?: number;
  }): Promise<FDRRecord[]> {
    let records = await db.fdrRecords.toArray();

    // 1. Institution isolation rule: Institution can ONLY see its own records
    if (params?.currentUser?.role === 'INSTITUTION') {
      records = records.filter(r => r.institutionId === params.currentUser?.institutionId);
    } else if (params?.institutionId) {
      records = records.filter(r => r.institutionId === params.institutionId);
    }

    // 2. Officer filter if specified
    if (params?.assignedOfficerId) {
      records = records.filter(r => r.assignedOfficerId === params.assignedOfficerId);
    }

    // 3. Workflow status filter
    if (params?.workflowStatus && params.workflowStatus !== 'ALL') {
      records = records.filter(r => r.workflowStatus === params.workflowStatus);
    }

    // 4. Bank filter
    if (params?.bankName && params.bankName !== 'ALL') {
      records = records.filter(r => r.bankName.toLowerCase().includes(params.bankName!.toLowerCase()));
    }

    // 5. Expiring within days filter
    if (params?.expiringWithinDays !== undefined) {
      records = records.filter(r => {
        const days = getDaysRemaining(r.maturityDate);
        return days >= 0 && days <= params.expiringWithinDays!;
      });
    }

    // 6. Search term filter
    if (params?.searchTerm) {
      const q = params.searchTerm.toLowerCase();
      records = records.filter(
        r =>
          r.fdrNumber.toLowerCase().includes(q) ||
          r.bankName.toLowerCase().includes(q) ||
          r.institutionName.toLowerCase().includes(q) ||
          r.applicationReference.toLowerCase().includes(q)
      );
    }

    // Sort descending by updated timestamp
    records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return records;
  },

  /**
   * Live statistics calculation directly from IndexedDB (no hardcoded numbers)
   */
  async getLiveStats(currentUser?: User | null) {
    let records = await db.fdrRecords.toArray();
    let releaseReqs = await db.releaseRequests.toArray();

    if (currentUser?.role === 'INSTITUTION') {
      records = records.filter(r => r.institutionId === currentUser.institutionId);
      releaseReqs = releaseReqs.filter(r => r.institutionId === currentUser.institutionId);
    }

    const totalInstitutions = await db.institutions.count();
    const totalFdrs = records.length;
    const totalDepositAmount = records.reduce((acc, r) => acc + (r.principalAmount || 0), 0);

    const activeFdrs = records.filter(r => ['VERIFIED', 'RESUBMITTED', 'UNDER_VERIFICATION'].includes(r.workflowStatus)).length;
    const pendingVerification = records.filter(r => ['SUBMITTED', 'UNDER_VERIFICATION'].includes(r.workflowStatus)).length;
    const discrepancies = records.filter(r => r.workflowStatus === 'DISCREPANCY_DETECTED' || r.verificationStatus === 'DISCREPANCY').length;
    const clarificationCases = records.filter(r => r.workflowStatus === 'CLARIFICATION_REQUESTED').length;

    // Maturity buckets
    let expiringIn90 = 0;
    let expiringIn60 = 0;
    let expiringIn30 = 0;
    let expiringIn7 = 0;
    let maturedCount = 0;

    for (const r of records) {
      const days = getDaysRemaining(r.maturityDate);
      if (days < 0 || r.workflowStatus === 'MATURED') {
        maturedCount++;
      } else {
        if (days <= 90) expiringIn90++;
        if (days <= 60) expiringIn60++;
        if (days <= 30) expiringIn30++;
        if (days <= 7) expiringIn7++;
      }
    }

    // Release requests
    const pendingReleaseScrutiny = releaseReqs.filter(r => r.status === 'SUBMITTED').length;
    const pendingReleaseApproval = releaseReqs.filter(r => r.status === 'SCRUTINIZED').length;
    const approvedReleases = releaseReqs.filter(r => r.status === 'APPROVED').length;
    const totalValueAwaitingRelease = releaseReqs
      .filter(r => ['SUBMITTED', 'SCRUTINIZED'].includes(r.status))
      .reduce((acc, r) => acc + (r.principalAmount || 0), 0);

    return {
      totalInstitutions,
      totalFdrs,
      totalDepositAmount,
      activeFdrs,
      pendingVerification,
      discrepancies,
      clarificationCases,
      expiringIn90,
      expiringIn60,
      expiringIn30,
      expiringIn7,
      maturedCount,
      pendingReleaseScrutiny,
      pendingReleaseApproval,
      approvedReleases,
      totalValueAwaitingRelease,
    };
  },
};
