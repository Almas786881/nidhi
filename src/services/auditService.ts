import { db } from '@/db/dexie';
import { computeAuditHash } from '@/db/crypto';
import type { AuditLog, UserRole } from '@/types';

/**
 * Service for append-only, tamper-evident audit logging with SHA-256 hash chaining
 */
export const auditService = {
  /**
   * Logs a new event to the audit trail
   */
  async log(params: {
    userId: string;
    userName: string;
    userRole: UserRole;
    action: string;
    category: AuditLog['category'];
    description: string;
    institutionId?: string;
    relatedRecordId?: string;
    previousState?: string;
    newState?: string;
  }): Promise<AuditLog> {
    const lastLog = await db.auditLogs.orderBy('timestamp').last();
    const prevHash = lastLog ? lastLog.entryHash : '0000000000000000000000000000000000000000000000000000000000000000';
    
    const count = await db.auditLogs.count();
    const eventId = `EVT-${(count + 1001).toString()}`;
    const timestamp = new Date().toISOString();

    const entryHash = await computeAuditHash(
      prevHash,
      eventId,
      params.userId,
      params.action,
      timestamp,
      params.description
    );

    const logEntry: AuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventId,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      institutionId: params.institutionId,
      action: params.action,
      category: params.category,
      relatedRecordId: params.relatedRecordId,
      previousState: params.previousState,
      newState: params.newState,
      previousHash: prevHash,
      entryHash,
      description: params.description,
      timestamp,
    };

    await db.auditLogs.add(logEntry);
    return logEntry;
  },

  /**
   * Retrieves all logs sorted descending by timestamp
   */
  async getLogs(filters?: {
    category?: string;
    action?: string;
    userRole?: string;
    searchTerm?: string;
  }): Promise<AuditLog[]> {
    let logs = await db.auditLogs.toArray();

    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filters?.category) {
      logs = logs.filter(l => l.category === filters.category);
    }
    if (filters?.userRole) {
      logs = logs.filter(l => l.userRole === filters.userRole);
    }
    if (filters?.searchTerm) {
      const q = filters.searchTerm.toLowerCase();
      logs = logs.filter(
        l =>
          l.description.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q) ||
          l.eventId.toLowerCase().includes(q) ||
          (l.relatedRecordId && l.relatedRecordId.toLowerCase().includes(q))
      );
    }

    return logs;
  },

  /**
   * Verifies the cryptographic integrity of the entire audit chain.
   * If any record has been modified or deleted, returns the broken block index.
   */
  async verifyChainIntegrity(): Promise<{
    isValid: boolean;
    totalRecords: number;
    tamperedRecord?: AuditLog;
    tamperedIndex?: number;
    message: string;
  }> {
    const logs = await db.auditLogs.orderBy('timestamp').toArray();
    if (logs.length === 0) {
      return { isValid: true, totalRecords: 0, message: 'Audit log is empty.' };
    }

    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // 1. Check previous hash continuity
      if (log.previousHash !== expectedPrevHash) {
        return {
          isValid: false,
          totalRecords: logs.length,
          tamperedRecord: log,
          tamperedIndex: i,
          message: `Hash link broken at index ${i} (Event: ${log.eventId}). Expected previous hash does not match stored previousHash.`,
        };
      }

      // 2. Recompute entry hash
      const recalculatedHash = await computeAuditHash(
        log.previousHash,
        log.eventId,
        log.userId,
        log.action,
        log.timestamp,
        log.description
      );

      if (recalculatedHash !== log.entryHash) {
        return {
          isValid: false,
          totalRecords: logs.length,
          tamperedRecord: log,
          tamperedIndex: i,
          message: `Payload tamper detected at index ${i} (Event: ${log.eventId}). Recomputed SHA-256 does not match stored signature.`,
        };
      }

      expectedPrevHash = log.entryHash;
    }

    return {
      isValid: true,
      totalRecords: logs.length,
      message: `Audit chain cryptographically verified. All ${logs.length} blocks are authentic and intact.`,
    };
  },
};
