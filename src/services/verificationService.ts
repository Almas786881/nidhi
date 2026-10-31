import { db } from '@/db/dexie';
import { ocrAdapter } from './ocrAdapter';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import type { FDRRecord, DiscrepancyItem, User, VerificationRecord, ExtractedFdrData } from '@/types';

export const verificationService = {
  /**
   * Executes AI-Assisted OCR verification on an FDR document and compares fields
   */
  async runAiVerification(fdrId: string, currentUser: User): Promise<{
    fdr: FDRRecord;
    extractedData: ExtractedFdrData;
    discrepancies: DiscrepancyItem[];
    overallStatus: 'MATCHED' | 'DISCREPANCY';
  }> {
    const fdr = await db.fdrRecords.get(fdrId);
    if (!fdr) throw new Error('FDR record not found.');

    if (!fdr.documentId) {
      throw new Error('No uploaded document attached to this FDR record for verification.');
    }

    const doc = await db.documents.get(fdr.documentId);
    if (!doc) {
      throw new Error('FDR document file missing from IndexedDB repository.');
    }

    // 1. Run OCR extraction
    const { text: rawText } = await ocrAdapter.extractTextFromBlob(doc.blobData);
    const extracted = ocrAdapter.parseFdrFields(rawText);

    // 2. Perform field comparison
    const discrepancies: DiscrepancyItem[] = [];

    // Comparison 1: Principal Amount
    if (extracted.principalAmount !== undefined) {
      const diff = Math.abs(extracted.principalAmount - fdr.principalAmount);
      if (diff === 0) {
        discrepancies.push({
          field: 'Principal Amount',
          submittedValue: fdr.principalAmount,
          extractedValue: extracted.principalAmount,
          status: 'MATCH',
        });
      } else {
        discrepancies.push({
          field: 'Principal Amount',
          submittedValue: fdr.principalAmount,
          extractedValue: extracted.principalAmount,
          status: 'MISMATCH',
          notes: `Extracted amount differs from submitted value by ₹${diff.toLocaleString('en-IN')}`,
        });
      }
    } else {
      discrepancies.push({
        field: 'Principal Amount',
        submittedValue: fdr.principalAmount,
        extractedValue: 'Not detected in document',
        status: 'MISSING',
        notes: 'OCR could not clearly locate numeric deposit figure on document.',
      });
    }

    // Comparison 2: FDR Number
    if (extracted.fdrNumber) {
      const cleanSub = fdr.fdrNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const cleanExt = extracted.fdrNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (cleanSub === cleanExt || cleanExt.includes(cleanSub) || cleanSub.includes(cleanExt)) {
        discrepancies.push({
          field: 'FDR Number',
          submittedValue: fdr.fdrNumber,
          extractedValue: extracted.fdrNumber,
          status: 'MATCH',
        });
      } else {
        discrepancies.push({
          field: 'FDR Number',
          submittedValue: fdr.fdrNumber,
          extractedValue: extracted.fdrNumber,
          status: 'MISMATCH',
          notes: 'Instrument certificate number does not match application record.',
        });
      }
    } else {
      discrepancies.push({
        field: 'FDR Number',
        submittedValue: fdr.fdrNumber,
        extractedValue: 'Not detected in document',
        status: 'MISSING',
      });
    }

    // Comparison 3: Bank Name
    if (extracted.bankName) {
      const cleanSubBank = fdr.bankName.toLowerCase().replace(/bank|ltd|limited/g, '').trim();
      const cleanExtBank = extracted.bankName.toLowerCase().replace(/bank|ltd|limited/g, '').trim();
      if (cleanSubBank.includes(cleanExtBank) || cleanExtBank.includes(cleanSubBank)) {
        discrepancies.push({
          field: 'Issuing Bank Name',
          submittedValue: fdr.bankName,
          extractedValue: extracted.bankName,
          status: 'MATCH',
        });
      } else {
        discrepancies.push({
          field: 'Issuing Bank Name',
          submittedValue: fdr.bankName,
          extractedValue: extracted.bankName,
          status: 'MISMATCH',
          notes: 'Bank title identified in header does not correspond to selected bank.',
        });
      }
    } else {
      discrepancies.push({
        field: 'Issuing Bank Name',
        submittedValue: fdr.bankName,
        extractedValue: 'Not detected',
        status: 'MISSING',
      });
    }

    // Comparison 4: Maturity Date
    if (extracted.maturityDate) {
      if (extracted.maturityDate === fdr.maturityDate) {
        discrepancies.push({
          field: 'Maturity Date',
          submittedValue: fdr.maturityDate,
          extractedValue: extracted.maturityDate,
          status: 'MATCH',
        });
      } else {
        discrepancies.push({
          field: 'Maturity Date',
          submittedValue: fdr.maturityDate,
          extractedValue: extracted.maturityDate,
          status: 'MISMATCH',
          notes: `Date on receipt (${extracted.maturityDate}) differs from entered date (${fdr.maturityDate}).`,
        });
      }
    } else {
      discrepancies.push({
        field: 'Maturity Date',
        submittedValue: fdr.maturityDate,
        extractedValue: 'Not detected',
        status: 'MISSING',
      });
    }

    // Determine overall status
    const hasMismatches = discrepancies.some(d => d.status === 'MISMATCH');
    const overallStatus = hasMismatches ? 'DISCREPANCY' : 'MATCHED';
    const newWorkflowStatus = hasMismatches ? 'DISCREPANCY_DETECTED' : 'UNDER_VERIFICATION';

    // Update FDR in database
    const previousState = JSON.stringify({
      workflowStatus: fdr.workflowStatus,
      verificationStatus: fdr.verificationStatus,
    });

    const updatedFdr: FDRRecord = {
      ...fdr,
      aiExtractedData: extracted,
      discrepancies,
      verificationStatus: overallStatus,
      workflowStatus: fdr.workflowStatus === 'SUBMITTED' ? newWorkflowStatus : fdr.workflowStatus,
      updatedAt: new Date().toISOString(),
    };

    await db.fdrRecords.put(updatedFdr);

    // Save verification record
    const verRecord: VerificationRecord = {
      id: `VER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fdrId: fdr.id,
      institutionId: fdr.institutionId,
      officerId: currentUser.id,
      officerName: currentUser.name,
      overallStatus,
      confidenceScore: extracted.confidenceScore,
      fieldComparisons: discrepancies,
      aiNotes: hasMismatches
        ? 'Automated comparison detected discrepancy in key financial fields.'
        : 'All core financial fields match institution submission within confidence threshold.',
      bankVerified: false,
      decision: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.verificationRecords.put(verRecord);

    // Audit log
    await auditService.log({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      institutionId: fdr.institutionId,
      action: 'AI_VERIFICATION_COMPLETED',
      category: 'VERIFICATION',
      relatedRecordId: fdr.id,
      previousState,
      newState: JSON.stringify({
        workflowStatus: updatedFdr.workflowStatus,
        verificationStatus: updatedFdr.verificationStatus,
        confidenceScore: extracted.confidenceScore,
      }),
      description: `AI OCR verification completed for ${fdr.fdrNumber}. Result: ${overallStatus} (Confidence: ${extracted.confidenceScore}%).`,
    });

    // Notify officer if discrepancy detected
    if (hasMismatches) {
      await notificationService.notify({
        title: `Discrepancy Detected: ${fdr.fdrNumber}`,
        message: `OCR verification identified discrepancies in FDR submission from ${fdr.institutionName}.`,
        type: 'WARNING',
        category: 'VERIFICATION',
        targetRole: 'OFFICER',
        relatedFdrId: fdr.id,
        linkUrl: `/officer/verification/${fdr.id}`,
      });
    }

    return {
      fdr: updatedFdr,
      extractedData: extracted,
      discrepancies,
      overallStatus,
    };
  },

  /**
   * Records official bank verification details by an authorized officer
   */
  async recordBankConfirmation(params: {
    fdrId: string;
    officer: User;
    bankConfirmationRef: string;
    verifiedByBankStaff: string;
    verificationDate: string;
    notes?: string;
  }): Promise<FDRRecord> {
    const fdr = await db.fdrRecords.get(params.fdrId);
    if (!fdr) throw new Error('FDR record not found.');

    const previousState = JSON.stringify({
      bankConfirmed: fdr.bankConfirmed,
      verificationStatus: fdr.verificationStatus,
    });

    const updatedFdr: FDRRecord = {
      ...fdr,
      bankConfirmed: true,
      bankConfirmationRef: params.bankConfirmationRef,
      bankConfirmationDate: params.verificationDate,
      bankConfirmationOfficer: params.officer.name,
      verificationStatus: 'CONFIRMED_BY_BANK',
      workflowStatus: 'VERIFIED',
      updatedAt: new Date().toISOString(),
    };

    await db.fdrRecords.put(updatedFdr);

    await auditService.log({
      userId: params.officer.id,
      userName: params.officer.name,
      userRole: params.officer.role,
      institutionId: fdr.institutionId,
      action: 'BANK_VERIFICATION_RECORDED',
      category: 'VERIFICATION',
      relatedRecordId: fdr.id,
      previousState,
      newState: JSON.stringify({
        bankConfirmed: true,
        ref: params.bankConfirmationRef,
        verifiedBy: params.verifiedByBankStaff,
      }),
      description: `Bank verification confirmed by Officer ${params.officer.name} for ${fdr.fdrNumber} (Ref: ${params.bankConfirmationRef}).`,
    });

    await notificationService.notify({
      title: `FDR Verified: ${fdr.fdrNumber}`,
      message: `Your FDR ${fdr.fdrNumber} has been verified and confirmed with bank records by the Regulation Bureau.`,
      type: 'SUCCESS',
      category: 'VERIFICATION',
      institutionId: fdr.institutionId,
      targetRole: 'INSTITUTION',
      relatedFdrId: fdr.id,
      linkUrl: `/institution/fdrs/${fdr.id}`,
    });

    return updatedFdr;
  },
};
