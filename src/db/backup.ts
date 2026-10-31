import { db } from './dexie';
import { seedDatabase } from './seed';
import type { StoredDocument } from '@/types';

export interface BackupPayload {
  exportDate: string;
  version: string;
  app: string;
  tables: {
    users: any[];
    institutions: any[];
    fdrRecords: any[];
    documents: Array<Omit<StoredDocument, 'blobData'> & { base64Data: string }>;
    verificationRecords: any[];
    scrutinyRemarks: any[];
    clarificationRequests: any[];
    renewalRecords: any[];
    releaseRequests: any[];
    approvalRecords: any[];
    notifications: any[];
    auditLogs: any[];
    officerAssignments: any[];
    systemSettings: any[];
  };
}

/**
 * Converts a Blob to a Base64 string for backup/export (works in both browser and Node)
 */
async function blobToBase64(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  // Node / Buffer fallback
  const buffer = await blob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:${blob.type};base64,${base64}`;
}

/**
 * Converts a Base64 string back to a Blob for restore/import (works in both browser and Node)
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const parts = base64.split(',');
  const rawBase64 = parts.length > 1 ? parts[1] : parts[0];

  if (typeof atob !== 'undefined') {
    const byteString = atob(rawBase64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  }

  // Node fallback
  const buf = Buffer.from(rawBase64, 'base64');
  return new Blob([buf], { type: mimeType });
}

/**
 * Exports complete application database as a JSON string
 */
export async function exportDatabaseToJson(): Promise<string> {
  const users = await db.users.toArray();
  const institutions = await db.institutions.toArray();
  const fdrRecords = await db.fdrRecords.toArray();
  const rawDocs = await db.documents.toArray();
  const verificationRecords = await db.verificationRecords.toArray();
  const scrutinyRemarks = await db.scrutinyRemarks.toArray();
  const clarificationRequests = await db.clarificationRequests.toArray();
  const renewalRecords = await db.renewalRecords.toArray();
  const releaseRequests = await db.releaseRequests.toArray();
  const approvalRecords = await db.approvalRecords.toArray();
  const notifications = await db.notifications.toArray();
  const auditLogs = await db.auditLogs.toArray();
  const officerAssignments = await db.officerAssignments.toArray();
  const systemSettings = await db.systemSettings.toArray();

  // Convert document Blobs to base64
  const serializedDocs = await Promise.all(
    rawDocs.map(async doc => {
      const { blobData, ...rest } = doc;
      const base64Data = blobData ? await blobToBase64(blobData) : '';
      return {
        ...rest,
        base64Data,
      };
    })
  );

  const payload: BackupPayload = {
    exportDate: new Date().toISOString(),
    version: '1.0.0',
    app: 'NIDHI-AICTE-FDR-PORTAL',
    tables: {
      users,
      institutions,
      fdrRecords,
      documents: serializedDocs,
      verificationRecords,
      scrutinyRemarks,
      clarificationRequests,
      renewalRecords,
      releaseRequests,
      approvalRecords,
      notifications,
      auditLogs,
      officerAssignments,
      systemSettings,
    },
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Imports a JSON backup into Dexie, replacing or merging tables
 */
export async function importDatabaseFromJson(jsonString: string): Promise<boolean> {
  try {
    const payload: BackupPayload = JSON.parse(jsonString);
    if (!payload.tables || payload.app !== 'NIDHI-AICTE-FDR-PORTAL') {
      throw new Error('Invalid NIDHI backup file format.');
    }

    // Reconstruct documents with real Blobs
    const documentsWithBlobs: StoredDocument[] = (payload.tables.documents || []).map(doc => {
      const { base64Data, ...rest } = doc;
      const blob = base64Data ? base64ToBlob(base64Data, rest.mimeType) : new Blob([], { type: rest.mimeType });
      return {
        ...rest,
        blobData: blob,
      };
    });

    await db.transaction('rw', db.tables, async () => {
      // Clear all
      for (const table of db.tables) {
        await table.clear();
      }

      if (payload.tables.users?.length) await db.users.bulkPut(payload.tables.users);
      if (payload.tables.institutions?.length) await db.institutions.bulkPut(payload.tables.institutions);
      if (payload.tables.fdrRecords?.length) await db.fdrRecords.bulkPut(payload.tables.fdrRecords);
      if (documentsWithBlobs.length) await db.documents.bulkPut(documentsWithBlobs);
      if (payload.tables.verificationRecords?.length) await db.verificationRecords.bulkPut(payload.tables.verificationRecords);
      if (payload.tables.scrutinyRemarks?.length) await db.scrutinyRemarks.bulkPut(payload.tables.scrutinyRemarks);
      if (payload.tables.clarificationRequests?.length) await db.clarificationRequests.bulkPut(payload.tables.clarificationRequests);
      if (payload.tables.renewalRecords?.length) await db.renewalRecords.bulkPut(payload.tables.renewalRecords);
      if (payload.tables.releaseRequests?.length) await db.releaseRequests.bulkPut(payload.tables.releaseRequests);
      if (payload.tables.approvalRecords?.length) await db.approvalRecords.bulkPut(payload.tables.approvalRecords);
      if (payload.tables.notifications?.length) await db.notifications.bulkPut(payload.tables.notifications);
      if (payload.tables.auditLogs?.length) await db.auditLogs.bulkPut(payload.tables.auditLogs);
      if (payload.tables.officerAssignments?.length) await db.officerAssignments.bulkPut(payload.tables.officerAssignments);
      if (payload.tables.systemSettings?.length) await db.systemSettings.bulkPut(payload.tables.systemSettings);
    });

    return true;
  } catch (err) {
    console.error('Failed to import database:', err);
    throw err;
  }
}

/**
 * Triggers a browser download of the database backup file
 */
export async function downloadDatabaseBackup(): Promise<void> {
  const jsonStr = await exportDatabaseToJson();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NIDHI_AICTE_DB_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Resets the database to pristine seed data
 */
export async function resetDatabaseToSeed(): Promise<void> {
  await seedDatabase(true);
}
