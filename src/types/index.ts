export type UserRole = 'ADMIN' | 'INSTITUTION' | 'OFFICER' | 'AUTHORITY';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  institutionId?: string; // If role === 'INSTITUTION'
  institutionName?: string;
  department?: string; // E.g. "Bureau of Approval", "Finance Regulation"
  designation?: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Institution {
  id: string;
  code: string; // e.g. "AICTE-INST-1001"
  name: string;
  type: 'GOVERNMENT' | 'AIDED' | 'SELF_FINANCING' | 'DEEMED_UNIVERSITY' | 'CENTRAL_INSTITUTION';
  region: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'CENTRAL' | 'NORTH_EAST';
  state: string;
  city: string;
  address: string;
  contactPerson: string;
  email: string;
  phone: string;
  approvalYear: number;
  isActive: boolean;
  totalFdrsCount?: number;
  totalDepositAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export type DepositType =
  | 'JOINT_FDR' // Joint account in name of Regional Officer AICTE & Chairman/President of Institution
  | 'SECURITY_DEPOSIT'
  | 'ENDOWMENT_FUND'
  | 'PERFORMANCE_GUARANTEE';

export type FdrWorkflowStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_VERIFICATION'
  | 'DISCREPANCY_DETECTED'
  | 'CLARIFICATION_REQUESTED'
  | 'RESUBMITTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'MATURED'
  | 'RENEWAL_PENDING'
  | 'RENEWED'
  | 'REPLACEMENT_SUBMITTED'
  | 'RELEASE_REQUESTED'
  | 'RELEASE_SCRUTINIZED'
  | 'RELEASE_APPROVED'
  | 'RELEASE_REJECTED'
  | 'CLOSED';

export type VerificationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'MATCHED'
  | 'DISCREPANCY'
  | 'CONFIRMED_BY_BANK'
  | 'REJECTED';

export interface ExtractedFdrData {
  bankName?: string;
  branch?: string;
  fdrNumber?: string;
  accountHolder?: string;
  principalAmount?: number;
  interestRate?: number;
  issueDate?: string;
  maturityDate?: string;
  validityDate?: string;
  ifscCode?: string;
  rawText?: string;
  confidenceScore: number; // 0 to 100
  extractedAt: string;
}

export interface DiscrepancyItem {
  field: string;
  submittedValue: string | number;
  extractedValue: string | number;
  status: 'MATCH' | 'MISMATCH' | 'MISSING' | 'LOW_CONFIDENCE' | 'MANUAL_OVERRIDE';
  notes?: string;
}

export interface FDRRecord {
  id: string; // e.g. "FDR-2026-0001"
  applicationReference: string; // e.g. "AICTE/FDR/2026/00142"
  institutionId: string;
  institutionName: string;
  bankName: string;
  branchName: string;
  fdrNumber: string;
  accountHolderName: string;
  jointHolderName?: string; // Often "Regional Officer, AICTE"
  principalAmount: number;
  interestRate?: number;
  issueDate: string; // YYYY-MM-DD
  maturityDate: string; // YYYY-MM-DD
  validityDate?: string; // YYYY-MM-DD
  depositType: DepositType;
  bankReferenceNumber?: string;
  documentId?: string;
  documentName?: string;
  workflowStatus: FdrWorkflowStatus;
  verificationStatus: VerificationStatus;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  assignedAt?: string;
  aiExtractedData?: ExtractedFdrData;
  discrepancies?: DiscrepancyItem[];
  bankConfirmed?: boolean;
  bankConfirmationRef?: string;
  bankConfirmationDate?: string;
  bankConfirmationOfficer?: string;
  isRenewed?: boolean;
  renewedFromFdrId?: string; // Link to previous FDR instrument
  renewedToFdrId?: string;   // Link to subsequent instrument
  isReleased?: boolean;
  releaseRequestId?: string;
  remarks?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDocument {
  id: string;
  fdrId?: string;
  institutionId: string;
  institutionName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  blobData: Blob;
  version: number;
  documentCategory: 'ORIGINAL_FDR' | 'BANK_VERIFICATION_LETTER' | 'RENEWAL_FDR' | 'RELEASE_NOC' | 'CLARIFICATION_EVIDENCE' | 'COMPLIANCE_CERTIFICATE';
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
  notes?: string;
}

export interface VerificationRecord {
  id: string;
  fdrId: string;
  institutionId: string;
  officerId: string;
  officerName: string;
  overallStatus: VerificationStatus;
  confidenceScore: number;
  fieldComparisons: DiscrepancyItem[];
  aiNotes?: string;
  officerNotes?: string;
  bankVerified: boolean;
  bankVerificationDetails?: {
    verifiedByBankStaff?: string;
    branchConfirmed?: boolean;
    verificationDate?: string;
    bankOfficialContact?: string;
    writtenConfirmationUploaded?: boolean;
  };
  decision: 'ACCEPT' | 'REJECT' | 'REQUEST_CLARIFICATION' | 'PENDING';
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScrutinyRemark {
  id: string;
  fdrId: string;
  officerId: string;
  officerName: string;
  officerDesignation?: string;
  stage: 'INITIAL_VERIFICATION' | 'BANK_SCRUTINY' | 'CLARIFICATION_REVIEW' | 'RENEWAL_ASSESSMENT' | 'RELEASE_EVALUATION';
  findingCategory: 'SATISFACTORY' | 'DISCREPANCY' | 'MISSING_MANDATORY_CLAUSE' | 'BANK_CONFIRMATION_PENDING' | 'OTHER';
  comment: string;
  isActionable: boolean;
  actionRequired?: string;
  createdAt: string;
}

export interface ClarificationRequest {
  id: string;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  officerId: string;
  officerName: string;
  queryTitle: string;
  queryDetails: string;
  discrepancies: DiscrepancyItem[];
  requestedDocuments?: string[];
  status: 'PENDING_RESPONSE' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  institutionResponse?: string;
  institutionResponseDocumentId?: string;
  institutionRespondedAt?: string;
  institutionRespondedBy?: string;
  officerReviewNotes?: string;
  officerReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RenewalRecord {
  id: string;
  originalFdrId: string;
  originalFdrNumber: string;
  newFdrId?: string;
  newFdrNumber: string;
  institutionId: string;
  institutionName: string;
  newBankName: string;
  newBranchName: string;
  newPrincipalAmount: number;
  newInterestRate?: number;
  newIssueDate: string;
  newMaturityDate: string;
  newDocumentId: string;
  reasonForRenewal: 'PERIOD_EXTENSION' | 'BANK_CHANGE' | 'AMOUNT_REVISION' | 'MANDATORY_REGULATORY_RENEWAL';
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  scrutinizedByOfficerId?: string;
  officerRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseRequest {
  id: string; // e.g. "REL-2026-0001"
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  principalAmount: number;
  depositType: DepositType;
  requestReason: 'COURSE_CLOSURE' | 'INSTITUTION_CLOSURE' | 'TENURE_COMPLETED' | 'SUBSTITUTION_APPROVED' | 'REGULATORY_REFUND';
  reasonDetails: string;
  nocDocumentId?: string;
  supportingDocumentId?: string;
  status: 'SUBMITTED' | 'SCRUTINIZED' | 'RETURNED_FOR_CLARIFICATION' | 'RECOMMENDED_FOR_APPROVAL' | 'RECOMMENDED_FOR_REJECTION' | 'APPROVED' | 'REJECTED' | 'CLOSED';
  officerId?: string;
  officerName?: string;
  officerScrutinyRemarks?: string;
  allDuesCleared: boolean;
  academicAuditCleared: boolean;
  noLegalDisputeDeclared: boolean;
  scrutinizedAt?: string;
  authorityDecision?: 'APPROVED' | 'REJECTED' | 'RETURNED';
  authorityDecisionRemarks?: string;
  authorityDecidedBy?: string;
  authorityDecidedAt?: string;
  approvalCertificateRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRecord {
  id: string;
  referenceNumber: string; // e.g. "AICTE/APPR/REL/2026/0042"
  releaseRequestId: string;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  amount: number;
  decision: 'APPROVED' | 'REJECTED' | 'RETURNED';
  authorityId: string;
  authorityName: string;
  authorityDesignation: string;
  remarks: string;
  conditionsApplied?: string[];
  signatureVerificationToken: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId?: string; // Specific user or undefined if role-based
  targetRole?: UserRole; // Or specific role
  institutionId?: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' | 'DISCREPANCY';
  category: 'FDR_SUBMISSION' | 'VERIFICATION' | 'CLARIFICATION' | 'MATURITY_REMINDER' | 'RENEWAL' | 'RELEASE_DECISION' | 'SYSTEM';
  relatedFdrId?: string;
  relatedRecordId?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  institutionId?: string;
  action: string;
  category: 'AUTH' | 'FDR' | 'DOCUMENT' | 'VERIFICATION' | 'SCRUTINY' | 'CLARIFICATION' | 'RENEWAL' | 'RELEASE' | 'ADMIN' | 'SYSTEM';
  relatedRecordId?: string;
  previousState?: string; // JSON or text summary
  newState?: string;      // JSON or text summary
  ipAddress?: string;
  userAgent?: string;
  previousHash: string;   // Cryptographic hash chaining
  entryHash: string;      // SHA-256 of this entry + previousHash
  description: string;
  timestamp: string;
}

export interface OfficerAssignment {
  id: string;
  fdrId: string;
  officerId: string;
  officerName: string;
  assignedById: string;
  assignedByName: string;
  assignedAt: string;
  status: 'ACTIVE' | 'REASSIGNED' | 'COMPLETED';
  notes?: string;
}

export interface SystemSettings {
  id: string;
  reminderIntervalsDays: number[]; // e.g. [90, 60, 30, 7]
  autoAssignmentEnabled: boolean;
  ocrConfidenceThreshold: number; // e.g. 70%
  allowInstitutionDrafts: boolean;
  portalMaintenanceMode: boolean;
  organizationName: string;
  portalVersion: string;
  updatedAt: string;
  updatedBy: string;
}
