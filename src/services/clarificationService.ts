import { db } from '@/db/dexie';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { documentService } from './documentService';
import type { ClarificationRequest, User, DiscrepancyItem } from '@/types';

export const clarificationService = {
  /**
   * Officer issues a clarification query to the institution
   */
  async createRequest(params: {
    fdrId: string;
    officer: User;
    queryTitle: string;
    queryDetails: string;
    discrepancies?: DiscrepancyItem[];
    requestedDocuments?: string[];
  }): Promise<ClarificationRequest> {
    const fdr = await db.fdrRecords.get(params.fdrId);
    if (!fdr) throw new Error('FDR record not found.');

    const clarifId = `CLARIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const request: ClarificationRequest = {
      id: clarifId,
      fdrId: fdr.id,
      fdrNumber: fdr.fdrNumber,
      institutionId: fdr.institutionId,
      institutionName: fdr.institutionName,
      officerId: params.officer.id,
      officerName: params.officer.name,
      queryTitle: params.queryTitle.trim(),
      queryDetails: params.queryDetails.trim(),
      discrepancies: params.discrepancies || fdr.discrepancies || [],
      requestedDocuments: params.requestedDocuments,
      status: 'PENDING_RESPONSE',
      createdAt: now,
      updatedAt: now,
    };

    await db.clarificationRequests.add(request);

    // Update FDR workflow status to CLARIFICATION_REQUESTED
    await db.fdrRecords.update(fdr.id, {
      workflowStatus: 'CLARIFICATION_REQUESTED',
      updatedAt: now,
    });

    // Audit log
    await auditService.log({
      userId: params.officer.id,
      userName: params.officer.name,
      userRole: params.officer.role,
      institutionId: fdr.institutionId,
      action: 'CLARIFICATION_REQUESTED',
      category: 'CLARIFICATION',
      relatedRecordId: clarifId,
      description: `Clarification requested for ${fdr.fdrNumber}: ${params.queryTitle}`,
    });

    // Notify institution
    await notificationService.notify({
      title: `Clarification Requested: ${fdr.fdrNumber}`,
      message: `Regulation Officer requested clarification: "${params.queryTitle}". Please review remarks and submit a response.`,
      type: 'WARNING',
      category: 'CLARIFICATION',
      institutionId: fdr.institutionId,
      targetRole: 'INSTITUTION',
      relatedFdrId: fdr.id,
      relatedRecordId: clarifId,
      linkUrl: `/institution/clarifications`,
    });

    return request;
  },

  /**
   * Institution responds to a clarification query with explanations and optional corrected document
   */
  async submitResponse(params: {
    requestId: string;
    institutionUser: User;
    responseText: string;
    correctedFile?: File | Blob;
    correctedFileName?: string;
    correctedFileMime?: string;
  }): Promise<ClarificationRequest> {
    const req = await db.clarificationRequests.get(params.requestId);
    if (!req) throw new Error('Clarification request not found.');

    if (params.institutionUser.institutionId !== req.institutionId) {
      throw new Error('Unauthorized: You cannot respond to queries intended for another institution.');
    }

    const now = new Date().toISOString();
    let docId: string | undefined;

    // If corrected document is uploaded, store as CLARIFICATION_EVIDENCE
    if (params.correctedFile && params.correctedFileName) {
      const doc = await documentService.uploadDocument({
        file: params.correctedFile,
        fileName: params.correctedFileName,
        mimeType: params.correctedFileMime || 'application/pdf',
        institutionId: req.institutionId,
        institutionName: req.institutionName,
        fdrId: req.fdrId,
        documentCategory: 'CLARIFICATION_EVIDENCE',
        uploadedBy: params.institutionUser,
        notes: `Clarification response document for query: ${req.queryTitle}`,
      });
      docId = doc.id;
    }

    const updatedReq: ClarificationRequest = {
      ...req,
      institutionResponse: params.responseText.trim(),
      institutionResponseDocumentId: docId,
      institutionRespondedAt: now,
      institutionRespondedBy: params.institutionUser.name,
      status: 'SUBMITTED',
      updatedAt: now,
    };

    await db.clarificationRequests.put(updatedReq);

    // Update FDR workflow status to RESUBMITTED
    await db.fdrRecords.update(req.fdrId, {
      workflowStatus: 'RESUBMITTED',
      updatedAt: now,
    });

    // Audit log
    await auditService.log({
      userId: params.institutionUser.id,
      userName: params.institutionUser.name,
      userRole: params.institutionUser.role,
      institutionId: req.institutionId,
      action: 'CLARIFICATION_SUBMITTED',
      category: 'CLARIFICATION',
      relatedRecordId: req.id,
      description: `Institution responded to clarification for ${req.fdrNumber}. Case moved to RESUBMITTED.`,
    });

    // Notify officer
    await notificationService.notify({
      title: `Clarification Resubmitted: ${req.fdrNumber}`,
      message: `${req.institutionName} has provided their clarification response and documents. Ready for review.`,
      type: 'INFO',
      category: 'CLARIFICATION',
      targetRole: 'OFFICER',
      relatedFdrId: req.fdrId,
      relatedRecordId: req.id,
      linkUrl: `/officer/applications/${req.fdrId}`,
    });

    return updatedReq;
  },

  /**
   * Officer accepts or rejects the clarification response
   */
  async reviewResponse(params: {
    requestId: string;
    officer: User;
    decision: 'ACCEPT' | 'REJECT';
    reviewNotes: string;
  }): Promise<ClarificationRequest> {
    const req = await db.clarificationRequests.get(params.requestId);
    if (!req) throw new Error('Clarification request not found.');

    const now = new Date().toISOString();
    const updatedReq: ClarificationRequest = {
      ...req,
      status: params.decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
      officerReviewNotes: params.reviewNotes.trim(),
      officerReviewedAt: now,
      updatedAt: now,
    };

    await db.clarificationRequests.put(updatedReq);

    // Update FDR workflow status
    const newWorkflowStatus = params.decision === 'ACCEPT' ? 'UNDER_VERIFICATION' : 'DISCREPANCY_DETECTED';
    await db.fdrRecords.update(req.fdrId, {
      workflowStatus: newWorkflowStatus,
      updatedAt: now,
    });

    await auditService.log({
      userId: params.officer.id,
      userName: params.officer.name,
      userRole: params.officer.role,
      institutionId: req.institutionId,
      action: `CLARIFICATION_${params.decision}ED`,
      category: 'CLARIFICATION',
      relatedRecordId: req.id,
      description: `Officer ${params.officer.name} marked clarification as ${params.decision}ED for ${req.fdrNumber}.`,
    });

    return updatedReq;
  },

  /**
   * Fetches clarification history for an FDR record
   */
  async getByFdrId(fdrId: string): Promise<ClarificationRequest[]> {
    const list = await db.clarificationRequests.where('fdrId').equals(fdrId).toArray();
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  },

  /**
   * Fetches all clarification requests for an institution
   */
  async getByInstitution(institutionId: string): Promise<ClarificationRequest[]> {
    const list = await db.clarificationRequests.where('institutionId').equals(institutionId).toArray();
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  },
};
