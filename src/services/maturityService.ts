import { db } from '@/db/dexie';
import { getDaysRemaining } from '@/utils/formatters';
import { notificationService } from './notificationService';
import type { FDRRecord, User } from '@/types';

export type MaturityCategory =
  | 'ACTIVE'
  | 'EXPIRING_90_DAYS'
  | 'EXPIRING_60_DAYS'
  | 'EXPIRING_30_DAYS'
  | 'EXPIRING_7_DAYS'
  | 'MATURED'
  | 'RENEWAL_PENDING'
  | 'REPLACED';

export interface MaturityItem {
  fdr: FDRRecord;
  daysRemaining: number;
  category: MaturityCategory;
  urgency: 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'OVERDUE';
}

export const maturityService = {
  /**
   * Categorizes an FDR record based on live date calculation
   */
  classifyMaturity(fdr: FDRRecord): MaturityItem {
    if (fdr.workflowStatus === 'RENEWED' || fdr.renewedToFdrId) {
      return { fdr, daysRemaining: 0, category: 'REPLACED', urgency: 'NORMAL' };
    }

    if (fdr.workflowStatus === 'RENEWAL_PENDING') {
      const days = getDaysRemaining(fdr.maturityDate);
      return { fdr, daysRemaining: days, category: 'RENEWAL_PENDING', urgency: 'HIGH' };
    }

    const days = getDaysRemaining(fdr.maturityDate);

    if (days < 0 || fdr.workflowStatus === 'MATURED') {
      return { fdr, daysRemaining: days, category: 'MATURED', urgency: 'OVERDUE' };
    }
    if (days <= 7) {
      return { fdr, daysRemaining: days, category: 'EXPIRING_7_DAYS', urgency: 'CRITICAL' };
    }
    if (days <= 30) {
      return { fdr, daysRemaining: days, category: 'EXPIRING_30_DAYS', urgency: 'HIGH' };
    }
    if (days <= 60) {
      return { fdr, daysRemaining: days, category: 'EXPIRING_60_DAYS', urgency: 'MEDIUM' };
    }
    if (days <= 90) {
      return { fdr, daysRemaining: days, category: 'EXPIRING_90_DAYS', urgency: 'MEDIUM' };
    }

    return { fdr, daysRemaining: days, category: 'ACTIVE', urgency: 'NORMAL' };
  },

  /**
   * Fetches and classifies all FDR records with optional filters
   */
  async getMonitoredFdrs(currentUser?: User | null, categoryFilter?: MaturityCategory | 'ALL'): Promise<MaturityItem[]> {
    let records = await db.fdrRecords.toArray();

    if (currentUser?.role === 'INSTITUTION') {
      records = records.filter(r => r.institutionId === currentUser.institutionId);
    }

    const items: MaturityItem[] = records.map(r => this.classifyMaturity(r));

    if (categoryFilter && categoryFilter !== 'ALL') {
      return items.filter(item => item.category === categoryFilter);
    }

    // Sort ascending by days remaining (most urgent first)
    items.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return items;
  },

  /**
   * Recalculates maturity alerts when the application loads or settings change.
   * Dispatches notifications for approaching deadlines.
   */
  async checkAndTriggerMaturityAlerts(): Promise<void> {
    const settings = await db.systemSettings.get('SETTINGS-01');
    const intervals = settings?.reminderIntervalsDays || [90, 60, 30, 7];

    const records = await db.fdrRecords
      .where('workflowStatus')
      .anyOf(['VERIFIED', 'UNDER_VERIFICATION', 'RENEWAL_PENDING'])
      .toArray();

    for (const fdr of records) {
      const days = getDaysRemaining(fdr.maturityDate);

      // Check if days matches one of configured intervals (e.g. <= 7 or <= 30)
      if (days <= 7 && days >= 0) {
        // Ensure we haven't already notified today
        const existing = await db.notifications
          .where('relatedFdrId')
          .equals(fdr.id)
          .and(n => n.category === 'MATURITY_REMINDER' && n.title.includes('7 Days'))
          .first();

        if (!existing) {
          await notificationService.notify({
            title: `CRITICAL: FDR ${fdr.fdrNumber} Matures in ${days} Days!`,
            message: `Deposit of ₹${fdr.principalAmount.toLocaleString('en-IN')} with ${fdr.bankName} requires immediate regulatory renewal.`,
            type: 'ALERT',
            category: 'MATURITY_REMINDER',
            institutionId: fdr.institutionId,
            targetRole: 'INSTITUTION',
            relatedFdrId: fdr.id,
            linkUrl: `/institution/renewals`,
          });
        }
      }
    }
  },
};
