import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fdrService } from '@/services/fdrService';
import { scrutinyService } from '@/services/scrutinyService';
import { useAuthStore } from '@/store/authStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ComparisonGrid } from '@/components/verification/ComparisonGrid';
import { DocumentViewer } from '@/components/document/DocumentViewer';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatINR, formatDate, formatDateTime, getDaysRemaining } from '@/utils/formatters';
import {
  FileText,
  Building,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Unlock,
  MessageSquare,
  ArrowLeft,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import type { FDRRecord, ScrutinyRemark } from '@/types';

export const FdrDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [fdr, setFdr] = useState<FDRRecord | null>(null);
  const [remarks, setRemarks] = useState<ScrutinyRemark[]>([]);
  const [activeTab, setActiveTab] = useState<'VERIFICATION' | 'DOCUMENT' | 'REMARKS'>('VERIFICATION');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFdr() {
      if (!id) return;
      try {
        setIsLoading(true);
        const record = await fdrService.getFdrById(id, user);
        setFdr(record);
        const remarkList = await scrutinyService.getRemarks(id);
        setRemarks(remarkList);
      } catch (err: any) {
        setError(err.message || 'Unable to open FDR record.');
      } finally {
        setIsLoading(false);
      }
    }
    loadFdr();
  }, [id, user]);

  if (isLoading) {
    return <LoadingSpinner size="lg" message="Loading FDR record from IndexedDB..." />;
  }

  if (error || !fdr) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center max-w-lg mx-auto">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-rose-800">Record Not Accessible</h3>
        <p className="text-xs text-rose-600 mt-1">{error || 'FDR record does not exist.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-white border border-rose-300 rounded-lg text-rose-700"
        >
          Return to previous page
        </button>
      </div>
    );
  }

  const days = getDaysRemaining(fdr.maturityDate);

  return (
    <div className="space-y-6">
      {/* Top Bar with Status & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-navy-950 font-mono tracking-tight">{fdr.fdrNumber}</h1>
              <StatusBadge status={fdr.workflowStatus} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ref: <span className="font-mono font-medium text-slate-700">{fdr.applicationReference}</span> • {fdr.institutionName}
            </p>
          </div>
        </div>

        {/* Action Buttons depending on status */}
        <div className="flex flex-wrap items-center gap-2">
          {fdr.workflowStatus === 'CLARIFICATION_REQUESTED' && (
            <Link
              to="/institution/clarifications"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Respond to Clarification &rarr;</span>
            </Link>
          )}

          {(fdr.workflowStatus === 'MATURED' || fdr.workflowStatus === 'RENEWAL_PENDING' || days <= 90) && !fdr.isRenewed && (
            <Link
              to={`/institution/renewals?fdrId=${fdr.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Initiate Renewal</span>
            </Link>
          )}

          {fdr.workflowStatus === 'VERIFIED' && !fdr.isReleased && (
            <Link
              to={`/institution/releases?fdrId=${fdr.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-navy-900 text-white hover:bg-navy-800 shadow-sm"
            >
              <Unlock className="w-3.5 h-3.5 text-teal-400" />
              <span>Request Release</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Principal Amount</p>
          <h3 className="text-xl font-extrabold text-navy-900 mt-1">{formatINR(fdr.principalAmount)}</h3>
          {fdr.interestRate && <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Interest: {fdr.interestRate}% p.a.</p>}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Issuing Bank & Branch</p>
          <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">{fdr.bankName}</h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{fdr.branchName || 'Central Branch'}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Maturity Date</p>
          <h3 className="text-sm font-bold text-slate-900 mt-1">{formatDate(fdr.maturityDate)}</h3>
          <p
            className={`text-xs font-semibold mt-0.5 ${
              days < 0 ? 'text-rose-600' : days <= 30 ? 'text-amber-600' : 'text-slate-400'
            }`}
          >
            {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank Verification Status</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                fdr.bankConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {fdr.bankConfirmed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {fdr.bankConfirmed ? 'Confirmed by Bank' : 'Confirmation Pending'}
            </span>
          </div>
          {fdr.bankConfirmationRef && (
            <p className="text-[10px] text-slate-400 font-mono mt-1">Ref: {fdr.bankConfirmationRef}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs">
        <button
          onClick={() => setActiveTab('VERIFICATION')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'VERIFICATION'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>AI-Assisted Cross-Verification Matrix</span>
        </button>
        <button
          onClick={() => setActiveTab('DOCUMENT')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'DOCUMENT'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span>FDR Document Viewer</span>
        </button>
        <button
          onClick={() => setActiveTab('REMARKS')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'REMARKS'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-slate-500" />
          <span>Scrutiny Remarks History ({remarks.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'VERIFICATION' && (
        <div className="space-y-4">
          <ComparisonGrid fdr={fdr} />
        </div>
      )}

      {activeTab === 'DOCUMENT' && (
        <div className="space-y-4">
          {fdr.documentId ? (
            <DocumentViewer documentId={fdr.documentId} />
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              No document attached to this FDR record.
            </div>
          )}
        </div>
      )}

      {activeTab === 'REMARKS' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Official Regulatory Scrutiny Trail</h3>
          {remarks.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No scrutiny remarks recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {remarks.map(rem => (
                <div key={rem.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{rem.officerName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({rem.officerDesignation || 'Officer'})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(rem.createdAt)}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono uppercase font-semibold">
                      {rem.stage} • {rem.findingCategory}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{rem.comment}</p>
                  {rem.actionRequired && (
                    <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                      Action Required: {rem.actionRequired}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
