import { db } from '@/db/dexie';
import { documentService } from './documentService';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { generateSecureId } from '@/db/crypto';
import type { ReleaseRequest, ApprovalRecord, User } from '@/types';

export interface SubmitReleaseInput {
  fdrId: string;
  requestReason: ReleaseRequest['requestReason'];
  reasonDetails: string;
  supportingDocFile?: File | Blob;
  supportingDocFileName?: string;
  supportingDocFileMime?: string;
  allDuesCleared: boolean;
  academicAuditCleared: boolean;
  noLegalDisputeDeclared: boolean;
}

export const releaseService = {
  /**
   * Institution submits a formal FDR release/refund request
   */
  async submitRequest(input: SubmitReleaseInput, user: User): Promise<ReleaseRequest> {
    const fdr = await db.fdrRecords.get(input.fdrId);
    if (!fdr) throw new Error('FDR record not found.');

    if (user.institutionId && user.institutionId !== fdr.institutionId) {
      throw new Error('Unauthorized: You cannot request release for another institution’s deposits.');
    }

    if (fdr.workflowStatus === 'RELEASE_REQUESTED' || fdr.workflowStatus === 'RELEASE_SCRUTINIZED') {
      throw new Error('A release request is already active and in process for this FDR.');
    }

    let supportingDocId: string | undefined;
    if (input.supportingDocFile && input.supportingDocFileName) {
      const doc = await documentService.uploadDocument({
        file: input.supportingDocFile,
        fileName: input.supportingDocFileName,
        mimeType: input.supportingDocFileMime || 'application/pdf',
        institutionId: fdr.institutionId,
        institutionName: fdr.institutionName,
        fdrId: fdr.id,
        documentCategory: 'RELEASE_NOC',
        uploadedBy: user,
        notes: `Supporting NOC/Justification for deposit release: ${input.requestReason}`,
      });
      supportingDocId = doc.id;
    }

    const relCount = await db.releaseRequests.count();
    const releaseId = `REL-${new Date().getFullYear()}-${(relCount + 101).toString().padStart(4, '0')}`;
    const now = new Date().toISOString();

    const request: ReleaseRequest = {
      id: releaseId,
      fdrId: fdr.id,
      fdrNumber: fdr.fdrNumber,
      institutionId: fdr.institutionId,
      institutionName: fdr.institutionName,
      principalAmount: fdr.principalAmount,
      depositType: fdr.depositType,
      requestReason: input.requestReason,
      reasonDetails: input.reasonDetails.trim(),
      supportingDocumentId: supportingDocId,
      status: 'SUBMITTED',
      allDuesCleared: input.allDuesCleared,
      academicAuditCleared: input.academicAuditCleared,
      noLegalDisputeDeclared: input.noLegalDisputeDeclared,
      createdAt: now,
      updatedAt: now,
    };

    await db.releaseRequests.add(request);

    // Update FDR record
    await db.fdrRecords.update(fdr.id, {
      workflowStatus: 'RELEASE_REQUESTED',
      releaseRequestId: releaseId,
      updatedAt: now,
    });

    // Audit log
    await auditService.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      institutionId: fdr.institutionId,
      action: 'RELEASE_REQUEST_SUBMITTED',
      category: 'RELEASE',
      relatedRecordId: releaseId,
      description: `Release request ${releaseId} submitted for FDR ${fdr.fdrNumber} (₹${fdr.principalAmount.toLocaleString('en-IN')}).`,
    });

    // Notify Officer
    await notificationService.notify({
      title: `Release Request: ${fdr.fdrNumber}`,
      message: `${fdr.institutionName} requested release of ₹${fdr.principalAmount.toLocaleString('en-IN')}. Scrutiny required.`,
      type: 'INFO',
      category: 'RELEASE_DECISION',
      targetRole: 'OFFICER',
      relatedFdrId: fdr.id,
      relatedRecordId: releaseId,
      linkUrl: `/officer/release-scrutiny`,
    });

    return request;
  },

  /**
   * Officer scrutinizes release request and forwards recommendation to Competent Authority
   */
  async scrutinizeRelease(params: {
    releaseId: string;
    officer: User;
    recommendation: 'RECOMMENDED_FOR_APPROVAL' | 'RECOMMENDED_FOR_REJECTION' | 'RETURNED_FOR_CLARIFICATION';
    scrutinyRemarks: string;
    duesVerified: boolean;
    auditVerified: boolean;
  }): Promise<ReleaseRequest> {
    const req = await db.releaseRequests.get(params.releaseId);
    if (!req) throw new Error('Release request not found.');

    const now = new Date().toISOString();
    const updatedReq: ReleaseRequest = {
      ...req,
      status: params.recommendation === 'RECOMMENDED_FOR_APPROVAL' ? 'SCRUTINIZED' : params.recommendation === 'RETURNED_FOR_CLARIFICATION' ? 'RETURNED_FOR_CLARIFICATION' : 'RECOMMENDED_FOR_REJECTION',
      officerId: params.officer.id,
      officerName: params.officer.name,
      officerScrutinyRemarks: params.scrutinyRemarks.trim(),
      allDuesCleared: params.duesVerified,
      academicAuditCleared: params.auditVerified,
      scrutinizedAt: now,
      updatedAt: now,
    };

    await db.releaseRequests.put(updatedReq);

    // Update FDR
    await db.fdrRecords.update(req.fdrId, {
      workflowStatus: 'RELEASE_SCRUTINIZED',
      updatedAt: now,
    });

    // Audit log
    await auditService.log({
      userId: params.officer.id,
      userName: params.officer.name,
      userRole: params.officer.role,
      institutionId: req.institutionId,
      action: 'RELEASE_SCRUTINIZED_BY_OFFICER',
      category: 'RELEASE',
      relatedRecordId: req.id,
      description: `Officer ${params.officer.name} completed scrutiny for ${req.id} [${params.recommendation}]. Forwarded to Competent Authority.`,
    });

    // Notify Competent Authority
    if (params.recommendation === 'RECOMMENDED_FOR_APPROVAL') {
      await notificationService.notify({
        title: `Decision Required: Release Case ${req.id}`,
        message: `Officer ${params.officer.name} recommended release of ₹${req.principalAmount.toLocaleString('en-IN')} for ${req.institutionName}.`,
        type: 'ALERT',
        category: 'RELEASE_DECISION',
        targetRole: 'AUTHORITY',
        relatedRecordId: req.id,
        linkUrl: `/authority/approvals/${req.id}`,
      });
    }

    return updatedReq;
  },

  /**
   * Competent Authority makes final explicit human decision (Approve / Reject / Return)
   */
  async decideRelease(params: {
    releaseId: string;
    authority: User;
    decision: 'APPROVED' | 'REJECTED' | 'RETURNED';
    mandatoryRemarks: string;
    conditionsApplied?: string[];
  }): Promise<{ releaseRequest: ReleaseRequest; approvalRecord?: ApprovalRecord }> {
    if (!params.mandatoryRemarks || params.mandatoryRemarks.trim().length < 10) {
      throw new Error('Mandatory decision remarks (minimum 10 characters) are required for regulatory authority decisions.');
    }

    const req = await db.releaseRequests.get(params.releaseId);
    if (!req) throw new Error('Release request not found.');

    const now = new Date().toISOString();
    let approvalRecord: ApprovalRecord | undefined;
    let certRef: string | undefined;

    if (params.decision === 'APPROVED') {
      const apprCount = await db.approvalRecords.count();
      certRef = `AICTE/APPR/REL/${new Date().getFullYear()}/${(apprCount + 101).toString().padStart(4, '0')}`;
      const sigToken = generateSecureId('SIG-AUTH');

      approvalRecord = {
        id: `APPR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        referenceNumber: certRef,
        releaseRequestId: req.id,
        fdrId: req.fdrId,
        fdrNumber: req.fdrNumber,
        institutionId: req.institutionId,
        institutionName: req.institutionName,
        amount: req.principalAmount,
        decision: 'APPROVED',
        authorityId: params.authority.id,
        authorityName: params.authority.name,
        authorityDesignation: params.authority.designation || 'Competent Authority, AICTE',
        remarks: params.mandatoryRemarks.trim(),
        conditionsApplied: params.conditionsApplied,
        signatureVerificationToken: sigToken,
        createdAt: now,
      };

      await db.approvalRecords.add(approvalRecord);
    }

    const newStatus = params.decision === 'APPROVED' ? 'APPROVED' : params.decision === 'REJECTED' ? 'REJECTED' : 'RETURNED_FOR_CLARIFICATION';

    const updatedReq: ReleaseRequest = {
      ...req,
      status: newStatus,
      authorityDecision: params.decision,
      authorityDecisionRemarks: params.mandatoryRemarks.trim(),
      authorityDecidedBy: params.authority.name,
      authorityDecidedAt: now,
      approvalCertificateRef: certRef,
      updatedAt: now,
    };

    await db.releaseRequests.put(updatedReq);

    // Update FDR record status
    const fdrWorkflowStatus = params.decision === 'APPROVED' ? 'RELEASE_APPROVED' : 'RELEASE_REJECTED';
    await db.fdrRecords.update(req.fdrId, {
      workflowStatus: fdrWorkflowStatus,
      isReleased: params.decision === 'APPROVED',
      updatedAt: now,
    });

    // Audit log
    await auditService.log({
      userId: params.authority.id,
      userName: params.authority.name,
      userRole: params.authority.role,
      institutionId: req.institutionId,
      action: `RELEASE_${params.decision}`,
      category: 'RELEASE',
      relatedRecordId: req.id,
      newState: JSON.stringify({
        decision: params.decision,
        remarks: params.mandatoryRemarks,
        certificate: certRef,
      }),
      description: `Competent Authority ${params.authority.name} decided ${params.decision} for Release Request ${req.id} (FDR: ${req.fdrNumber}, Amount: ₹${req.principalAmount.toLocaleString('en-IN')}).`,
    });

    // Notify Institution
    await notificationService.notify({
      title: `Release Request ${params.decision}: ${req.fdrNumber}`,
      message: `The Competent Authority has marked your release request as ${params.decision}. ${certRef ? 'Approval Ref: ' + certRef : ''}`,
      type: params.decision === 'APPROVED' ? 'SUCCESS' : 'ALERT',
      category: 'RELEASE_DECISION',
      institutionId: req.institutionId,
      targetRole: 'INSTITUTION',
      relatedFdrId: req.fdrId,
      relatedRecordId: req.id,
      linkUrl: `/institution/release-requests`,
    });

    return { releaseRequest: updatedReq, approvalRecord };
  },

  /**
   * Final closure of released FDR after bank lien discharge has been recorded
   */
  async closeFdrLifecycle(fdrId: string, officer: User, closureNotes: string): Promise<void> {
    const fdr = await db.fdrRecords.get(fdrId);
    if (!fdr) throw new Error('FDR record not found.');

    const now = new Date().toISOString();
    await db.fdrRecords.update(fdrId, {
      workflowStatus: 'CLOSED',
      remarks: `${fdr.remarks ? fdr.remarks + ' | ' : ''}Final Closure: ${closureNotes}`,
      updatedAt: now,
    });

    if (fdr.releaseRequestId) {
      await db.releaseRequests.update(fdr.releaseRequestId, {
        status: 'CLOSED',
        updatedAt: now,
      });
    }

    await auditService.log({
      userId: officer.id,
      userName: officer.name,
      userRole: officer.role,
      institutionId: fdr.institutionId,
      action: 'FDR_LIFECYCLE_CLOSED',
      category: 'RELEASE',
      relatedRecordId: fdrId,
      description: `FDR ${fdr.fdrNumber} marked as CLOSED after lien discharge confirmation.`,
    });
  },

  /**
   * Lists release requests with optional role/institution filter
   */
  async listRequests(currentUser?: User | null, statusFilter?: ReleaseRequest['status'] | 'ALL'): Promise<ReleaseRequest[]> {
    let list = await db.releaseRequests.toArray();

    if (currentUser?.role === 'INSTITUTION') {
      list = list.filter(r => r.institutionId === currentUser.institutionId);
    }

    if (statusFilter && statusFilter !== 'ALL') {
      list = list.filter(r => r.status === statusFilter);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  },
};
