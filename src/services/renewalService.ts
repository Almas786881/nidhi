import { db } from '@/db/dexie';
import { documentService } from './documentService';
import { verificationService } from './verificationService';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import type { FDRRecord, RenewalRecord, User } from '@/types';

export interface SubmitRenewalInput {
  originalFdrId: string;
  newFdrNumber: string;
  newBankName: string;
  newBranchName: string;
  newPrincipalAmount: number;
  newInterestRate?: number;
  newIssueDate: string;
  newMaturityDate: string;
  reasonForRenewal: RenewalRecord['reasonForRenewal'];
  renewalDocument: File | Blob;
  renewalFileName: string;
  renewalFileMime: string;
}

export const renewalService = {
  /**
   * Institution submits a renewed or replacement instrument for an expiring FDR
   */
  async submitRenewal(input: SubmitRenewalInput, user: User): Promise<{
    renewalRecord: RenewalRecord;
    newFdrRecord: FDRRecord;
  }> {
    const oldFdr = await db.fdrRecords.get(input.originalFdrId);
    if (!oldFdr) throw new Error('Original FDR record not found.');

    if (user.institutionId && user.institutionId !== oldFdr.institutionId) {
      throw new Error('Unauthorized: You cannot renew FDRs belonging to another institution.');
    }

    // 1. Upload renewal document
    const doc = await documentService.uploadDocument({
      file: input.renewalDocument,
      fileName: input.renewalFileName,
      mimeType: input.renewalFileMime,
      institutionId: oldFdr.institutionId,
      institutionName: oldFdr.institutionName,
      documentCategory: 'RENEWAL_FDR',
      uploadedBy: user,
      notes: `Renewal instrument for legacy FDR ${oldFdr.fdrNumber}`,
    });

    const now = new Date().toISOString();
    const count = await db.fdrRecords.count();
    const newFdrId = `FDR-${new Date().getFullYear()}-${(count + 101).toString().padStart(4, '0')}`;
    const newAppRef = `AICTE/FDR/${new Date().getFullYear()}/${(count + 101).toString().padStart(5, '0')}`;

    // 2. Create new linked FDR record (preserves original instrument and links to new)
    const newFdr: FDRRecord = {
      id: newFdrId,
      applicationReference: newAppRef,
      institutionId: oldFdr.institutionId,
      institutionName: oldFdr.institutionName,
      bankName: input.newBankName.trim(),
      branchName: input.newBranchName.trim(),
      fdrNumber: input.newFdrNumber.trim(),
      accountHolderName: oldFdr.accountHolderName,
      jointHolderName: oldFdr.jointHolderName || 'Regional Officer, AICTE',
      principalAmount: Number(input.newPrincipalAmount),
      interestRate: input.newInterestRate ? Number(input.newInterestRate) : undefined,
      issueDate: input.newIssueDate,
      maturityDate: input.newMaturityDate,
      validityDate: input.newMaturityDate,
      depositType: oldFdr.depositType,
      documentId: doc.id,
      documentName: doc.fileName,
      workflowStatus: 'SUBMITTED',
      verificationStatus: 'PENDING',
      assignedOfficerId: oldFdr.assignedOfficerId,
      assignedOfficerName: oldFdr.assignedOfficerName,
      renewedFromFdrId: oldFdr.id, // Linking back to old instrument!
      createdById: user.id,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
    };

    await db.fdrRecords.add(newFdr);

    // Update document with new fdrId
    await db.documents.update(doc.id, { fdrId: newFdrId });

    // 3. Mark old FDR as RENEWED and link forward
    await db.fdrRecords.update(oldFdr.id, {
      workflowStatus: 'RENEWED',
      isRenewed: true,
      renewedToFdrId: newFdrId,
      updatedAt: now,
    });

    // 4. Create RenewalRecord
    const renewalRecord: RenewalRecord = {
      id: `REN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      originalFdrId: oldFdr.id,
      originalFdrNumber: oldFdr.fdrNumber,
      newFdrId,
      newFdrNumber: input.newFdrNumber.trim(),
      institutionId: oldFdr.institutionId,
      institutionName: oldFdr.institutionName,
      newBankName: input.newBankName.trim(),
      newBranchName: input.newBranchName.trim(),
      newPrincipalAmount: Number(input.newPrincipalAmount),
      newInterestRate: input.newInterestRate ? Number(input.newInterestRate) : undefined,
      newIssueDate: input.newIssueDate,
      newMaturityDate: input.newMaturityDate,
      newDocumentId: doc.id,
      reasonForRenewal: input.reasonForRenewal,
      status: 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
    };

    await db.renewalRecords.add(renewalRecord);

    // Trigger AI OCR on new instrument
    try {
      await verificationService.runAiVerification(newFdrId, user);
    } catch (err) {
      console.warn('Renewal AI verification warning:', err);
    }

    // Audit log
    await auditService.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      institutionId: oldFdr.institutionId,
      action: 'FDR_RENEWAL_SUBMITTED',
      category: 'RENEWAL',
      relatedRecordId: newFdrId,
      description: `Renewal submitted for ${oldFdr.fdrNumber} -> New instrument ${input.newFdrNumber} (Ref: ${newAppRef}).`,
    });

    // Notification
    await notificationService.notify({
      title: `FDR Renewal Submitted: ${input.newFdrNumber}`,
      message: `${oldFdr.institutionName} submitted renewal for expiring FDR ${oldFdr.fdrNumber}.`,
      type: 'INFO',
      category: 'RENEWAL',
      targetRole: 'OFFICER',
      relatedFdrId: newFdrId,
      linkUrl: `/officer/applications/${newFdrId}`,
    });

    return { renewalRecord, newFdrRecord: newFdr };
  },

  /**
   * Fetches all renewal records
   */
  async listRenewals(institutionId?: string): Promise<RenewalRecord[]> {
    let list = await db.renewalRecords.toArray();
    if (institutionId) {
      list = list.filter(r => r.institutionId === institutionId);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  },
};
