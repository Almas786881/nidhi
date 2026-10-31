import Dexie, { type Table } from 'dexie';
import type {
  User,
  Institution,
  FDRRecord,
  StoredDocument,
  VerificationRecord,
  ScrutinyRemark,
  ClarificationRequest,
  RenewalRecord,
  ReleaseRequest,
  ApprovalRecord,
  NotificationItem,
  AuditLog,
  OfficerAssignment,
  SystemSettings,
} from '@/types';

export class NidhiDatabase extends Dexie {
  users!: Table<User, string>;
  institutions!: Table<Institution, string>;
  fdrRecords!: Table<FDRRecord, string>;
  documents!: Table<StoredDocument, string>;
  verificationRecords!: Table<VerificationRecord, string>;
  scrutinyRemarks!: Table<ScrutinyRemark, string>;
  clarificationRequests!: Table<ClarificationRequest, string>;
  renewalRecords!: Table<RenewalRecord, string>;
  releaseRequests!: Table<ReleaseRequest, string>;
  approvalRecords!: Table<ApprovalRecord, string>;
  notifications!: Table<NotificationItem, string>;
  auditLogs!: Table<AuditLog, string>;
  officerAssignments!: Table<OfficerAssignment, string>;
  systemSettings!: Table<SystemSettings, string>;

  constructor() {
    super('NidhiPortalDB');

    // Define schema version 1
    this.version(1).stores({
      users: 'id, email, role, institutionId, isActive, createdAt',
      institutions: 'id, code, name, region, state, isActive, createdAt',
      fdrRecords: 'id, applicationReference, institutionId, fdrNumber, bankName, workflowStatus, verificationStatus, maturityDate, assignedOfficerId, createdAt',
      documents: 'id, fdrId, institutionId, documentCategory, fileName, uploadedAt',
      verificationRecords: 'id, fdrId, institutionId, officerId, overallStatus, decision, createdAt',
      scrutinyRemarks: 'id, fdrId, officerId, stage, findingCategory, createdAt',
      clarificationRequests: 'id, fdrId, institutionId, officerId, status, createdAt',
      renewalRecords: 'id, originalFdrId, newFdrId, institutionId, status, createdAt',
      releaseRequests: 'id, fdrId, institutionId, status, createdAt',
      approvalRecords: 'id, releaseRequestId, fdrId, institutionId, authorityId, decision, createdAt',
      notifications: 'id, userId, targetRole, institutionId, isRead, createdAt',
      auditLogs: 'id, eventId, userId, userRole, category, relatedRecordId, timestamp',
      officerAssignments: 'id, fdrId, officerId, status, assignedAt',
      systemSettings: 'id, updatedAt',
    });
  }
}

// Export singleton instance of Dexie database
export const db = new NidhiDatabase();
