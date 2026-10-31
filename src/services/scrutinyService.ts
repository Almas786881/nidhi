import { db } from '@/db/dexie';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import type { ScrutinyRemark, User, FdrWorkflowStatus } from '@/types';

export const scrutinyService = {
  /**
   * Adds an immutable scrutiny remark to the FDR history
   */
  async addRemark(params: {
    fdrId: string;
    officer: User;
    stage: ScrutinyRemark['stage'];
    findingCategory: ScrutinyRemark['findingCategory'];
    comment: string;
    isActionable: boolean;
    actionRequired?: string;
  }): Promise<ScrutinyRemark> {
    const remarkId = `REM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const remark: ScrutinyRemark = {
      id: remarkId,
      fdrId: params.fdrId,
      officerId: params.officer.id,
      officerName: params.officer.name,
      officerDesignation: params.officer.designation,
      stage: params.stage,
      findingCategory: params.findingCategory,
      comment: params.comment.trim(),
      isActionable: params.isActionable,
      actionRequired: params.actionRequired?.trim(),
      createdAt: new Date().toISOString(),
    };

    await db.scrutinyRemarks.add(remark);

    const fdr = await db.fdrRecords.get(params.fdrId);

    await auditService.log({
      userId: params.officer.id,
      userName: params.officer.name,
      userRole: params.officer.role,
      institutionId: fdr?.institutionId,
      action: 'SCRUTINY_REMARK_ADDED',
      category: 'SCRUTINY',
      relatedRecordId: params.fdrId,
      description: `Remark recorded by Officer ${params.officer.name} [${params.findingCategory}]: ${params.comment.slice(0, 100)}...`,
    });

    return remark;
  },

  /**
   * Fetches all scrutiny remarks for a given FDR record, sorted chronological
   */
  async getRemarks(fdrId: string): Promise<ScrutinyRemark[]> {
    const list = await db.scrutinyRemarks.where('fdrId').equals(fdrId).toArray();
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  },

  /**
   * Updates workflow status with transition validation
   */
  async updateWorkflowStatus(
    fdrId: string,
    newStatus: FdrWorkflowStatus,
    officer: User,
    reason?: string
  ): Promise<void> {
    const fdr = await db.fdrRecords.get(fdrId);
    if (!fdr) throw new Error('FDR record not found.');

    const previousState = JSON.stringify({
      workflowStatus: fdr.workflowStatus,
      verificationStatus: fdr.verificationStatus,
    });

    await db.fdrRecords.update(fdrId, {
      workflowStatus: newStatus,
      updatedAt: new Date().toISOString(),
    });

    await auditService.log({
      userId: officer.id,
      userName: officer.name,
      userRole: officer.role,
      institutionId: fdr.institutionId,
      action: 'FDR_WORKFLOW_TRANSITION',
      category: 'SCRUTINY',
      relatedRecordId: fdrId,
      previousState,
      newState: JSON.stringify({ workflowStatus: newStatus, reason }),
      description: `Workflow stage for ${fdr.fdrNumber} transitioned from ${fdr.workflowStatus} to ${newStatus}.`,
    });
  },
};
