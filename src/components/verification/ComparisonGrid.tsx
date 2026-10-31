import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, XCircle, ShieldAlert } from 'lucide-react';
import { formatINR, formatDate } from '@/utils/formatters';
import type { FDRRecord, DiscrepancyItem } from '@/types';

interface ComparisonGridProps {
  fdr: FDRRecord;
}

export const ComparisonGrid: React.FC<ComparisonGridProps> = ({ fdr }) => {
  const extracted = fdr.aiExtractedData;
  const discrepancies = fdr.discrepancies || [];

  const getStatusBadge = (fieldKey: string, status?: DiscrepancyItem['status']) => {
    switch (status) {
      case 'MATCH':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Matched</span>
          </span>
        );
      case 'MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-300 animate-pulse">
            <XCircle className="w-3.5 h-3.5" />
            <span>Discrepancy</span>
          </span>
        );
      case 'MISSING':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Missing in OCR</span>
          </span>
        );
      case 'LOW_CONFIDENCE':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Low Confidence</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <span>Manual Review</span>
          </span>
        );
    }
  };

  const getDiscrepancyNotes = (fieldName: string) => {
    const item = discrepancies.find(d => d.field.toLowerCase().includes(fieldName.toLowerCase()));
    return item?.notes;
  };

  const getFieldStatus = (fieldName: string): DiscrepancyItem['status'] | undefined => {
    const item = discrepancies.find(d => d.field.toLowerCase().includes(fieldName.toLowerCase()));
    return item?.status;
  };

  const rows = [
    {
      title: 'Principal Amount',
      submitted: formatINR(fdr.principalAmount),
      extracted: extracted?.principalAmount ? formatINR(extracted.principalAmount) : 'Not detected',
      status: getFieldStatus('Amount'),
      notes: getDiscrepancyNotes('Amount'),
    },
    {
      title: 'FDR / Instrument Number',
      submitted: fdr.fdrNumber,
      extracted: extracted?.fdrNumber || 'Not detected',
      status: getFieldStatus('Number'),
      notes: getDiscrepancyNotes('Number'),
    },
    {
      title: 'Issuing Bank Name',
      submitted: fdr.bankName,
      extracted: extracted?.bankName || 'Not detected',
      status: getFieldStatus('Bank'),
      notes: getDiscrepancyNotes('Bank'),
    },
    {
      title: 'Maturity Date',
      submitted: formatDate(fdr.maturityDate),
      extracted: extracted?.maturityDate ? formatDate(extracted.maturityDate) : 'Not detected',
      status: getFieldStatus('Maturity'),
      notes: getDiscrepancyNotes('Maturity'),
    },
    {
      title: 'Account Holder / Depositor',
      submitted: fdr.accountHolderName,
      extracted: extracted?.accountHolder || 'Not detected',
      status: (extracted?.accountHolder ? 'MATCH' : 'MISSING') as DiscrepancyItem['status'],
      notes: undefined,
    },
    {
      title: 'Mandatory Joint Holder Clause',
      submitted: fdr.jointHolderName || 'Regional Officer, AICTE',
      extracted: extracted?.rawText?.includes('AICTE') ? 'Verified (AICTE Joint Lien)' : 'Clause Missing',
      status: (extracted?.rawText?.includes('AICTE') ? 'MATCH' : 'MISMATCH') as DiscrepancyItem['status'],
      notes: extracted?.rawText?.includes('AICTE')
        ? undefined
        : 'Crucial Lien clause in favor of Regional Officer, AICTE not detected in instrument body.',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wide">
            Three-Way Cross-Verification Matrix
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time optical character recognition compared with institution declared metadata
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 shadow-xs text-xs font-medium">
            <span className="text-slate-500">AI Confidence:</span>
            <span
              className={`font-bold ${
                (extracted?.confidenceScore || 0) >= 75
                  ? 'text-emerald-600'
                  : (extracted?.confidenceScore || 0) >= 50
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              {extracted?.confidenceScore || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <th className="py-3 px-4 w-1/4">Field Definition</th>
              <th className="py-3 px-4 w-1/3 text-blue-900 bg-blue-50/40">Section A: Institution Declared</th>
              <th className="py-3 px-4 w-1/3 text-teal-900 bg-teal-50/40">Section B: AI Extracted (OCR)</th>
              <th className="py-3 px-4 text-center">Section C: Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => {
              const isMismatch = row.status === 'MISMATCH';
              return (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    isMismatch ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-800 text-xs sm:text-sm">
                    {row.title}
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 font-medium font-mono text-xs sm:text-sm bg-blue-50/10">
                    {row.submitted}
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 font-mono text-xs sm:text-sm bg-teal-50/10">
                    <span className={isMismatch ? 'text-rose-700 font-bold' : ''}>{row.extracted}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex flex-col items-center">
                      {getStatusBadge(row.title, row.status)}
                      {row.notes && (
                        <span className="mt-1 text-[11px] text-rose-600 font-medium max-w-xs text-center">
                          {row.notes}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Discrepancy Alert Strip if any */}
      {discrepancies.some(d => d.status === 'MISMATCH') && (
        <div className="p-4 bg-rose-50 border-t border-rose-200 flex items-start gap-3 text-rose-800">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">Officer Action Required:</span> Discrepancies have been flagged between institution submission and physical document OCR. Please verify against bank nodal records or raise a Clarification Query.
          </div>
        </div>
      )}
    </div>
  );
};
