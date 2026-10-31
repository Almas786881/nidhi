import React from 'react';
import { cn } from '@/utils/cn';
import type { FdrWorkflowStatus, VerificationStatus } from '@/types';

interface StatusBadgeProps {
  status: FdrWorkflowStatus | VerificationStatus | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className }) => {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status.replace(/_/g, ' ');

  switch (status) {
    case 'SUBMITTED':
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
      label = 'Submitted';
      break;
    case 'UNDER_VERIFICATION':
    case 'IN_PROGRESS':
      badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      label = 'Under Verification';
      break;
    case 'DISCREPANCY_DETECTED':
    case 'DISCREPANCY':
      badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300';
      label = 'Discrepancy Detected';
      break;
    case 'CLARIFICATION_REQUESTED':
      badgeStyle = 'bg-orange-50 text-orange-800 border-orange-300';
      label = 'Clarification Requested';
      break;
    case 'RESUBMITTED':
      badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
      label = 'Resubmitted';
      break;
    case 'VERIFIED':
    case 'CONFIRMED_BY_BANK':
    case 'MATCHED':
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = status === 'CONFIRMED_BY_BANK' ? 'Bank Confirmed' : status === 'MATCHED' ? 'AI Matched' : 'Verified';
      break;
    case 'REJECTED':
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
      label = 'Rejected';
      break;
    case 'MATURED':
      badgeStyle = 'bg-red-50 text-red-700 border-red-300 font-semibold';
      label = 'Matured';
      break;
    case 'RENEWAL_PENDING':
      badgeStyle = 'bg-yellow-50 text-yellow-800 border-yellow-300';
      label = 'Renewal Pending';
      break;
    case 'RENEWED':
      badgeStyle = 'bg-teal-50 text-teal-700 border-teal-200';
      label = 'Renewed';
      break;
    case 'RELEASE_REQUESTED':
      badgeStyle = 'bg-cyan-50 text-cyan-800 border-cyan-200';
      label = 'Release Requested';
      break;
    case 'RELEASE_SCRUTINIZED':
      badgeStyle = 'bg-sky-50 text-sky-800 border-sky-300';
      label = 'Release Scrutinized';
      break;
    case 'RELEASE_APPROVED':
    case 'APPROVED':
      badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
      label = 'Release Approved';
      break;
    case 'RELEASE_REJECTED':
      badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300';
      label = 'Release Rejected';
      break;
    case 'CLOSED':
      badgeStyle = 'bg-slate-200 text-slate-800 border-slate-300';
      label = 'Closed / Discharged';
      break;
    default:
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
      break;
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border tracking-wide uppercase font-medium transition-colors',
        sizeClasses[size],
        badgeStyle,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {label}
    </span>
  );
};
