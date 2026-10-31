import { format, parseISO, differenceInDays, isValid } from 'date-fns';

/**
 * Formats a number to Indian Rupee (₹) format (e.g. ₹10,00,000 or ₹1.5 Cr)
 */
export function formatINR(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹0';
  }
  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formats a number to abbreviated Indian Lakh / Crore notation
 */
export function formatINRAbbreviated(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return formatINR(amount);
}

/**
 * Formats ISO date string to DD MMM YYYY or DD/MM/YYYY
 */
export function formatDate(dateStr?: string | Date | null, formatPattern: string = 'dd MMM yyyy'): string {
  if (!dateStr) return 'N/A';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(d)) return 'Invalid Date';
    return format(d, formatPattern);
  } catch {
    return 'N/A';
  }
}

/**
 * Formats ISO datetime string to DD MMM YYYY, hh:mm a
 */
export function formatDateTime(dateStr?: string | Date | null): string {
  return formatDate(dateStr, 'dd MMM yyyy, hh:mm a');
}

/**
 * Calculates days remaining until a maturity date
 */
export function getDaysRemaining(maturityDateStr: string): number {
  try {
    const maturity = parseISO(maturityDateStr);
    const today = new Date();
    // Reset time part for pure day diff
    today.setHours(0, 0, 0, 0);
    maturity.setHours(0, 0, 0, 0);
    return differenceInDays(maturity, today);
  } catch {
    return 0;
  }
}

/**
 * Formats file size in readable KB / MB
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
