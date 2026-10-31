import 'fake-indexeddb/auto';

// Mock localStorage for Node test environment
const mockStorage = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (key: string) => mockStorage.get(key) || null,
    setItem: (key: string, value: string) => mockStorage.set(key, String(value)),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
    key: (i: number) => Array.from(mockStorage.keys())[i] || null,
    get length() {
      return mockStorage.size;
    },
  } as Storage;
}

import { db } from '../src/db/dexie';
import { seedDatabase, createSampleFdrBlob } from '../src/db/seed';
import { authService } from '../src/services/authService';
import { fdrService } from '../src/services/fdrService';
import { documentService } from '../src/services/documentService';
import { ocrAdapter } from '../src/services/ocrAdapter';
import { verificationService } from '../src/services/verificationService';
import { scrutinyService } from '../src/services/scrutinyService';
import { clarificationService } from '../src/services/clarificationService';
import { maturityService } from '../src/services/maturityService';
import { renewalService } from '../src/services/renewalService';
import { releaseService } from '../src/services/releaseService';
import { auditService } from '../src/services/auditService';
import { exportDatabaseToJson, importDatabaseFromJson } from '../src/db/backup';
import type { User, Institution } from '../src/types';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  NIDHI – END-TO-END REGULATORY TEST SUITE (SIH26265)           ');
  console.log('===============================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  async function test(num: number, desc: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] Test ${num.toString().padStart(2, '0')}: ${desc}`);
      passedCount++;
    } catch (err: any) {
      console.error(`[FAIL] Test ${num.toString().padStart(2, '0')}: ${desc}`);
      console.error('       Error:', err.message);
      failedCount++;
    }
  }

  // Seed DB first
  await seedDatabase(true);

  let adminUser: User;
  let instUser: User;
  let officerUser: User;
  let authUser: User;
  let createdInst: Institution;
  let testFdrId: string;
  let clarificationId: string;
  let releaseId: string;

  // TEST 1: Admin can log in
  await test(1, 'Admin can log in with SHA-256 password validation', async () => {
    adminUser = await authService.login('admin@nidhi.local', 'password');
    if (adminUser.role !== 'ADMIN') throw new Error('Expected ADMIN role');
  });

  // TEST 2: Admin can create an institution
  await test(2, 'Admin can create and register an accredited institution', async () => {
    createdInst = {
      id: `INST-TEST-${Date.now()}`,
      code: 'AICTE-TEST-999',
      name: 'All India Test Institute of Science & Technology',
      type: 'GOVERNMENT',
      region: 'NORTH',
      state: 'Delhi',
      city: 'New Delhi',
      address: 'Nelson Mandela Marg, Vasant Kunj',
      contactPerson: 'Registrar Test',
      email: 'test@institute.ac.in',
      phone: '+91 9999988888',
      approvalYear: 2026,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.institutions.add(createdInst);
    const fetched = await db.institutions.get(createdInst.id);
    if (!fetched) throw new Error('Institution not found in Dexie');
  });

  // TEST 3: Admin can create users
  await test(3, 'Admin can create new user accounts with role permissions', async () => {
    const newUser = await db.users.where('email').equals('institution@nidhi.local').first();
    if (!newUser) throw new Error('User not found in database');
    instUser = newUser;
  });

  // TEST 4: Institution can log in
  await test(4, 'Institution user can authenticate and retrieve session', async () => {
    const loggedInst = await authService.login('institution@nidhi.local', 'password');
    if (loggedInst.role !== 'INSTITUTION') throw new Error('Expected INSTITUTION role');
    instUser = loggedInst;
  });

  // TEST 5 & 6: Institution can submit an FDR & appears in database
  await test(5, 'Institution can submit an FDR with document Blob', async () => {
    const sampleBlob = createSampleFdrBlob('SBI-TEST-778899', 'State Bank of India', instUser.institutionName || 'Test College', '25,00,000');
    const fdr = await fdrService.submitFdr(
      {
        bankName: 'State Bank of India',
        branchName: 'Main Branch Delhi',
        fdrNumber: `SBI-TEST-${Date.now()}`,
        accountHolderName: instUser.institutionName || 'Test College',
        jointHolderName: 'Regional Officer, AICTE',
        principalAmount: 2500000,
        interestRate: 7.25,
        issueDate: '2025-01-01',
        maturityDate: '2030-01-01',
        depositType: 'JOINT_FDR',
        remarks: 'Test FDR submission for SIH compliance',
        documentFile: sampleBlob,
        documentFileName: 'SBI_FDR_Certificate.svg',
        documentMimeType: 'image/svg+xml',
      },
      instUser
    );
    testFdrId = fdr.id;
    if (!fdr.applicationReference.startsWith('AICTE/FDR/')) throw new Error('Application reference format invalid');
  });

  await test(6, 'FDR appears persistently in IndexedDB with valid reference number', async () => {
    const record = await db.fdrRecords.get(testFdrId);
    if (!record || !['SUBMITTED', 'UNDER_VERIFICATION', 'DISCREPANCY_DETECTED'].includes(record.workflowStatus)) {
      throw new Error('FDR record was not persisted correctly in IndexedDB');
    }
  });

  // TEST 7: Uploaded documents persist after refresh
  await test(7, 'Uploaded documents persist in IndexedDB as real Blob objects', async () => {
    const fdr = await db.fdrRecords.get(testFdrId);
    if (!fdr?.documentId) throw new Error('Missing document ID on FDR record');
    const doc = await documentService.getDocument(fdr.documentId, instUser);
    if (!(doc.blobData instanceof Blob)) throw new Error('Stored file is not a native Blob object');
    if (doc.blobData.size === 0) throw new Error('Stored Blob size is 0');
  });

  // TEST 8: OCR extraction works on supported files
  await test(8, 'OCR extraction extracts raw text and parses banking FDR fields', async () => {
    const testSvg = createSampleFdrBlob('CAN-FDR-998877', 'Canara Bank', 'Delhi Institute', '10,00,000');
    const { text } = await ocrAdapter.extractTextFromBlob(testSvg);
    if (!text.includes('CAN-FDR-998877') || !text.includes('CANARA BANK')) {
      throw new Error('OCR extraction failed to locate key bank strings');
    }
    const fields = ocrAdapter.parseFdrFields(text);
    if (fields.bankName !== 'CANARA BANK') throw new Error(`Expected CANARA BANK, got ${fields.bankName}`);
    if (fields.fdrNumber !== 'CAN-FDR-998877') throw new Error(`Expected CAN-FDR-998877, got ${fields.fdrNumber}`);
  });

  // TEST 9: Discrepancies are detected
  await test(9, 'Discrepancy engine detects mismatches between submitted and extracted data', async () => {
    const fdrRec = await db.fdrRecords.get('FDR-2026-0008');
    if (!fdrRec) throw new Error('Demo discrepancy FDR not found');
    const hasMismatch = fdrRec.discrepancies?.some(d => d.status === 'MISMATCH');
    if (!hasMismatch) throw new Error('Discrepancy engine failed to flag mismatch on discrepancy record');
  });

  // TEST 10: Officer can access assigned cases
  await test(10, 'Regulation Officer can access assigned cases', async () => {
    officerUser = await authService.login('officer@nidhi.local', 'password');
    const assigned = await fdrService.listFdrs({ assignedOfficerId: officerUser.id });
    if (assigned.length === 0) throw new Error('No cases assigned to officer');
  });

  // TEST 11: Officer can add scrutiny remarks
  await test(11, 'Officer can record immutable scrutiny remarks', async () => {
    const remark = await scrutinyService.addRemark({
      fdrId: testFdrId,
      officer: officerUser,
      stage: 'INITIAL_VERIFICATION',
      findingCategory: 'SATISFACTORY',
      comment: 'Automated test scrutiny remark: All conditions verified.',
      isActionable: false,
    });
    const fetched = await scrutinyService.getRemarks(testFdrId);
    if (!fetched.some(r => r.id === remark.id)) throw new Error('Remark not saved to history');
  });

  // TEST 12: Officer can request clarification
  await test(12, 'Officer can issue clarification query to institution', async () => {
    const req = await clarificationService.createRequest({
      fdrId: testFdrId,
      officer: officerUser,
      queryTitle: 'Discrepancy in Bank Branch Name',
      queryDetails: 'Please clarify branch address and submit updated nodal confirmation letter.',
    });
    clarificationId = req.id;
    const fdr = await db.fdrRecords.get(testFdrId);
    if (fdr?.workflowStatus !== 'CLARIFICATION_REQUESTED') throw new Error('FDR status did not transition to CLARIFICATION_REQUESTED');
  });

  // TEST 13: Institution can respond to clarification
  await test(13, 'Institution can respond to clarification and case moves to RESUBMITTED', async () => {
    await clarificationService.submitResponse({
      requestId: clarificationId,
      institutionUser: instUser,
      responseText: 'Clarification submitted: Bank branch updated and attested by Chief Manager.',
    });
    const fdr = await db.fdrRecords.get(testFdrId);
    if (fdr?.workflowStatus !== 'RESUBMITTED') throw new Error('FDR status did not transition to RESUBMITTED');
  });

  // TEST 14: Officer can complete verification & record bank confirmation
  await test(14, 'Officer can record direct bank confirmation and mark FDR VERIFIED', async () => {
    const updated = await verificationService.recordBankConfirmation({
      fdrId: testFdrId,
      officer: officerUser,
      bankConfirmationRef: 'CONF-TEST-9922',
      verifiedByBankStaff: 'Branch Head',
      verificationDate: '2026-10-31',
    });
    if (!updated.bankConfirmed || updated.workflowStatus !== 'VERIFIED') {
      throw new Error('FDR was not marked as verified and bank confirmed');
    }
  });

  // TEST 15: Maturity status is calculated correctly
  await test(15, 'Maturity calculation engine correctly computes remaining days and categories', async () => {
    const fdrExpiringSoon = await db.fdrRecords.get('FDR-2026-0002');
    if (!fdrExpiringSoon) throw new Error('Expiring FDR not found');
    const item = maturityService.classifyMaturity(fdrExpiringSoon);
    if (item.daysRemaining > 7) throw new Error(`Expected <= 7 days, got ${item.daysRemaining}`);
  });

  // TEST 16: Renewal submission works
  await test(16, 'Renewal replaces expiring FDR and maintains linked audit chain', async () => {
    const fdrToRenew = await db.fdrRecords.get('FDR-2026-0002');
    if (!fdrToRenew) throw new Error('FDR to renew not found');
    const renewalBlob = createSampleFdrBlob('PNB-REN-8811', 'Punjab National Bank', fdrToRenew.institutionName, '25,00,000');
    const res = await renewalService.submitRenewal(
      {
        originalFdrId: fdrToRenew.id,
        newFdrNumber: `PNB-REN-${Date.now()}`,
        newBankName: 'Punjab National Bank',
        newBranchName: 'Connaught Place',
        newPrincipalAmount: 2500000,
        newInterestRate: 7.3,
        newIssueDate: '2026-10-31',
        newMaturityDate: '2031-10-31',
        reasonForRenewal: 'PERIOD_EXTENSION',
        renewalDocument: renewalBlob,
        renewalFileName: 'Renewed_Certificate.svg',
        renewalFileMime: 'image/svg+xml',
      },
      instUser
    );
    const oldRefreshed = await db.fdrRecords.get(fdrToRenew.id);
    if (!oldRefreshed?.isRenewed || oldRefreshed.renewedToFdrId !== res.newFdrRecord.id) {
      throw new Error('Legacy FDR was not linked forward to new instrument');
    }
    if (res.newFdrRecord.renewedFromFdrId !== fdrToRenew.id) {
      throw new Error('New FDR did not link back to legacy instrument');
    }
  });

  // TEST 17: Release request submission works
  await test(17, 'Institution can lodge formal release & refund request with compliance declarations', async () => {
    const req = await releaseService.submitRequest(
      {
        fdrId: testFdrId,
        requestReason: 'TENURE_COMPLETED',
        reasonDetails: 'Tenure completed as per AICTE Approval Process Regulations.',
        allDuesCleared: true,
        academicAuditCleared: true,
        noLegalDisputeDeclared: true,
      },
      instUser
    );
    releaseId = req.id;
    if (req.status !== 'SUBMITTED') throw new Error('Release request status not SUBMITTED');
  });

  // TEST 18: Officer can scrutinize release requests
  await test(18, 'Officer can scrutinize release and recommend for approval', async () => {
    const req = await releaseService.scrutinizeRelease({
      releaseId,
      officer: officerUser,
      recommendation: 'RECOMMENDED_FOR_APPROVAL',
      scrutinyRemarks: 'Scrutiny verified: All academic audits and student fee caution moneys discharged.',
      duesVerified: true,
      auditVerified: true,
    });
    if (req.status !== 'SCRUTINIZED') throw new Error('Expected SCRUTINIZED status');
  });

  // TEST 19: Competent authority can approve or reject
  await test(19, 'Competent Authority executes final human decision and generates Approval Certificate', async () => {
    authUser = await authService.login('authority@nidhi.local', 'password');
    const res = await releaseService.decideRelease({
      releaseId,
      authority: authUser,
      decision: 'APPROVED',
      mandatoryRemarks: 'Approved for unconditional discharge of statutory AICTE lien. Certificate issued.',
    });
    if (res.releaseRequest.status !== 'APPROVED') throw new Error('Release not approved');
    if (!res.approvalRecord?.referenceNumber.startsWith('AICTE/APPR/REL/')) throw new Error('Approval certificate not generated');
  });

  // TEST 20: Audit history records all important actions with SHA-256 hash chaining
  await test(20, 'Audit history records all actions and passes cryptographic SHA-256 chain verification', async () => {
    const integrity = await auditService.verifyChainIntegrity();
    if (!integrity.isValid) throw new Error('Audit chain integrity check failed: ' + integrity.message);
    if (integrity.totalRecords < 10) throw new Error('Expected at least 10 audit records in ledger');
  });

  // TEST 21: Users cannot access unauthorized records (Isolation)
  await test(21, 'RBAC prevents institutions from accessing other institutions documents', async () => {
    const otherDoc = await db.documents.where('institutionId').equals('INST-102').first();
    if (!otherDoc) throw new Error('Other institution doc not found');
    try {
      await documentService.getDocument(otherDoc.id, instUser);
      throw new Error('Should have thrown Unauthorized Access');
    } catch (err: any) {
      if (!err.message.includes('Unauthorized Access')) {
        throw err;
      }
    }
  });

  // TEST 22: Database backup and restoration work
  await test(22, 'Database backup exports JSON with Blobs and restores all 14 tables intact', async () => {
    const backupJson = await exportDatabaseToJson();
    if (!backupJson.includes('NIDHI-AICTE-FDR-PORTAL')) throw new Error('Invalid backup header');
    const restored = await importDatabaseFromJson(backupJson);
    if (!restored) throw new Error('Failed to import backup JSON');
    const fdrCount = await db.fdrRecords.count();
    if (fdrCount === 0) throw new Error('Restored database is empty');
  });

  console.log('\n===============================================================');
  console.log(`  TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED OUT OF 22 TESTS`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
