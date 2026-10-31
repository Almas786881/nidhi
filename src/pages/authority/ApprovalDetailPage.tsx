import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { releaseService } from '@/services/releaseService';
import { fdrService } from '@/services/fdrService';
import { db } from '@/db/dexie';
import { DocumentViewer } from '@/components/document/DocumentViewer';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatINR, formatDate, formatDateTime } from '@/utils/formatters';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Building,
  FileCheck2,
  AlertTriangle,
  ArrowLeft,
  Download,
  Printer,
} from 'lucide-react';
import type { ReleaseRequest, FDRRecord, ApprovalRecord } from '@/types';

export const ApprovalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [request, setRequest] = useState<ReleaseRequest | null>(null);
  const [fdr, setFdr] = useState<FDRRecord | null>(null);
  const [approvalRecord, setApprovalRecord] = useState<ApprovalRecord | null>(null);
  const [mandatoryRemarks, setMandatoryRemarks] = useState('');
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'RETURNED'>('APPROVED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setIsLoading(true);
        const req = await db.releaseRequests.get(id);
        if (req) {
          setRequest(req);
          const fdrRec = await fdrService.getFdrById(req.fdrId);
          setFdr(fdrRec);

          if (req.approvalCertificateRef) {
            const appr = await db.approvalRecords.where('releaseRequestId').equals(req.id).first();
            if (appr) setApprovalRecord(appr);
          }
        }
      } catch (err) {
        console.error('Failed to load release case:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !user) return;

    if (!mandatoryRemarks.trim() || mandatoryRemarks.trim().length < 10) {
      alert('Mandatory statutory remarks (at least 10 characters) are required for regulatory authority decisions.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await releaseService.decideRelease({
        releaseId: request.id,
        authority: user,
        decision,
        mandatoryRemarks,
        conditionsApplied: [
          'Original FDR discharge certificate from issuing bank to be filed within 30 days.',
          'AICTE Regional Office to record permanent closure in national portal register.',
        ],
      });

      setRequest(res.releaseRequest);
      if (res.approvalRecord) {
        setApprovalRecord(res.approvalRecord);
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
        });
      }

      alert(`Release decision "${decision}" recorded successfully with digital authority token.`);
    } catch (err: any) {
      alert('Failed to record decision: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  if (isLoading || !request || !fdr) {
    return <LoadingSpinner size="lg" message="Loading release approval case..." />;
  }

  const isDecided = request.status === 'APPROVED' || request.status === 'REJECTED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
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
              <h1 className="text-2xl font-bold text-navy-950 font-mono tracking-tight">{request.id}</h1>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  request.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : request.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {request.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Institution: <strong className="text-slate-800">{request.institutionName}</strong> • FDR: {request.fdrNumber}
            </p>
          </div>
        </div>

        {approvalRecord && (
          <button
            onClick={handlePrintCertificate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Approval Certificate</span>
          </button>
        )}
      </div>

      {/* Case Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Release Amount Requested</span>
          <h3 className="text-2xl font-extrabold text-navy-900 mt-1">{formatINR(request.principalAmount)}</h3>
          <p className="text-[11px] text-slate-500 mt-1">{request.depositType.replace(/_/g, ' ')}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Statutory Mandate Reason</span>
          <h3 className="text-sm font-bold text-slate-900 mt-1">{request.requestReason.replace(/_/g, ' ')}</h3>
          <p className="text-[11px] text-slate-500 mt-1 truncate">{request.reasonDetails}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Officer Recommendation</span>
          <div className="flex items-center gap-1.5 mt-1">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-bold text-teal-800">{request.officerName || 'Regulation Officer'}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Scrutiny Date: {formatDate(request.scrutinizedAt)}</p>
        </div>
      </div>

      {/* Officer Scrutiny & Clearances Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Regulation Bureau Officer Scrutiny Findings</span>
        </h3>

        <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 text-xs text-teal-950">
          <span className="font-bold block mb-1">Officer Formal Recommendation:</span>
          <p className="leading-relaxed">{request.officerScrutinyRemarks || 'All statutory conditions verified.'}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium text-slate-700">Dues & Caution Fees Cleared</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium text-slate-700">Academic Audit NOC Verified</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium text-slate-700">No Legal Disputes Declared</span>
          </div>
        </div>
      </div>

      {/* Document Preview (Original FDR & NOC) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-navy-900" />
          <span>Custodial Deposit Certificate Inspection</span>
        </h3>
        {fdr.documentId ? (
          <DocumentViewer documentId={fdr.documentId} />
        ) : (
          <p className="text-xs text-slate-400">No certificate attached.</p>
        )}
      </div>

      {/* Official Certificate Box if Approved */}
      {approvalRecord && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-400 p-8 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Award className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-navy-950 uppercase tracking-wider">
            All India Council for Technical Education
          </h2>
          <h3 className="text-base font-semibold text-emerald-900">
            Statutory Certificate of Lien Discharge & Deposit Release
          </h3>
          <p className="font-mono text-sm font-bold text-navy-900">
            Certificate Ref: {approvalRecord.referenceNumber}
          </p>

          <div className="max-w-xl mx-auto p-4 rounded-xl bg-white border border-emerald-200 text-left text-xs space-y-2 text-slate-700">
            <p>
              It is certified that the Fixed Deposit Receipt <strong>{approvalRecord.fdrNumber}</strong> amounting to{' '}
              <strong>{formatINR(approvalRecord.amount)}</strong> submitted by{' '}
              <strong>{approvalRecord.institutionName}</strong> has been scrutinized and formally released by the Competent Authority.
            </p>
            <p className="text-[11px] text-slate-500">
              Remarks: {approvalRecord.remarks}
            </p>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-mono text-[10px] text-slate-400">
              <span>Token: {approvalRecord.signatureVerificationToken}</span>
              <span>Signed: {formatDateTime(approvalRecord.createdAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Human Approval Action Box (Only if not decided yet) */}
      {!isDecided ? (
        <div className="bg-white rounded-xl border-2 border-amber-400 p-6 shadow-md">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-200">
            <Award className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Competent Authority Final Decision (Mandatory Human Action)
            </h3>
          </div>

          <form onSubmit={handleDecisionSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Authority Determination</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label
                  className={`p-3 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                    decision === 'APPROVED'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="APPROVED"
                    checked={decision === 'APPROVED'}
                    onChange={() => setDecision('APPROVED')}
                    className="accent-emerald-600"
                  />
                  <span>Approve Release</span>
                </label>

                <label
                  className={`p-3 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                    decision === 'REJECTED'
                      ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="REJECTED"
                    checked={decision === 'REJECTED'}
                    onChange={() => setDecision('REJECTED')}
                    className="accent-rose-600"
                  />
                  <span>Reject Release</span>
                </label>

                <label
                  className={`p-3 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                    decision === 'RETURNED'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="RETURNED"
                    checked={decision === 'RETURNED'}
                    onChange={() => setDecision('RETURNED')}
                    className="accent-amber-600"
                  />
                  <span>Return for Clarification</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Decision Remarks (Minimum 10 characters) *
              </label>
              <textarea
                required
                rows={4}
                value={mandatoryRemarks}
                onChange={e => setMandatoryRemarks(e.target.value)}
                placeholder="State the statutory reasoning, council resolution number, or legal basis for this approval/rejection..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2.5 rounded-lg text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 ${
                  decision === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : decision === 'REJECTED'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isSubmitting ? 'Signing Decision...' : `Execute Final Decision: ${decision}`}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};
