import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { fdrService } from '@/services/fdrService';
import { releaseService } from '@/services/releaseService';
import { Modal } from '@/components/common/Modal';
import { formatINR, formatDate, formatDateTime } from '@/utils/formatters';
import { Unlock, FileCheck2, CheckCircle2, Clock, Upload, Award, AlertCircle, FileText } from 'lucide-react';
import type { FDRRecord, ReleaseRequest } from '@/types';

export const ReleaseRequestsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();

  const [eligibleFdrs, setEligibleFdrs] = useState<FDRRecord[]>([]);
  const [releaseRequests, setReleaseRequests] = useState<ReleaseRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form Fields
  const [selectedFdrId, setSelectedFdrId] = useState('');
  const [requestReason, setRequestReason] = useState<ReleaseRequest['requestReason']>('TENURE_COMPLETED');
  const [reasonDetails, setReasonDetails] = useState('');
  const [allDuesCleared, setAllDuesCleared] = useState(true);
  const [academicAuditCleared, setAcademicAuditCleared] = useState(true);
  const [noLegalDispute, setNoLegalDispute] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    const [allFdrs, requests] = await Promise.all([
      fdrService.listFdrs({ currentUser: user }),
      releaseService.listRequests(user),
    ]);

    // Eligible: VERIFIED and not already requested/released
    const eligible = allFdrs.filter(f => f.workflowStatus === 'VERIFIED' && !f.isReleased && !f.releaseRequestId);
    setEligibleFdrs(eligible);
    setReleaseRequests(requests);

    const preselectId = searchParams.get('fdrId');
    if (preselectId) {
      setSelectedFdrId(preselectId);
      setIsModalOpen(true);
    } else if (eligible.length > 0) {
      setSelectedFdrId(eligible[0].id);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFdrId) return;

    if (!allDuesCleared || !academicAuditCleared || !noLegalDispute) {
      alert('Mandatory statutory compliance declarations must be confirmed.');
      return;
    }

    try {
      setIsSubmitting(true);
      await releaseService.submitRequest(
        {
          fdrId: selectedFdrId,
          requestReason,
          reasonDetails,
          supportingDocFile: file || undefined,
          supportingDocFileName: file?.name,
          supportingDocFileMime: file?.type,
          allDuesCleared,
          academicAuditCleared,
          noLegalDisputeDeclared: noLegalDispute,
        },
        user
      );

      setIsModalOpen(false);
      loadData();
      alert('Formal release & refund request lodged with AICTE Regulation Bureau.');
    } catch (err: any) {
      alert('Failed to submit release request: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Security Deposit Release & Refund Desk</h1>
          <p className="text-xs text-slate-500 mt-1">
            Apply for statutory lien discharge upon completion of regulatory tenure or course closures
          </p>
        </div>
        <button
          onClick={() => {
            if (eligibleFdrs.length === 0) {
              alert('No eligible verified FDRs found currently available for release.');
              return;
            }
            setIsModalOpen(true);
          }}
          disabled={eligibleFdrs.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-navy-900 text-white hover:bg-navy-800 shadow-sm transition-colors disabled:opacity-50"
        >
          <Unlock className="w-4 h-4 text-teal-400" />
          <span>Lodge Release Request</span>
        </button>
      </div>

      {/* Requests History */}
      <div className="space-y-4">
        {releaseRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
            <Unlock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 text-sm">No Active Release Requests</p>
            <p className="mt-1">Eligible verified FDRs will appear here once formal release has been initiated.</p>
          </div>
        ) : (
          releaseRequests.map(req => {
            const isApproved = req.status === 'APPROVED';
            const isScrutinized = req.status === 'SCRUTINIZED';
            const isRejected = req.status === 'REJECTED';
            return (
              <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-navy-900 text-sm">{req.id}</span>
                    <span className="font-mono text-xs text-slate-500">FDR: {req.fdrNumber}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isRejected
                          ? 'bg-rose-100 text-rose-800'
                          : isScrutinized
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Lien Amount: <span className="font-bold text-slate-900">{formatINR(req.principalAmount)}</span>
                  </div>
                </div>

                <div className="py-3 text-xs space-y-2">
                  <div className="text-slate-700">
                    <strong className="text-slate-900">Release Mandate Reason:</strong> {req.requestReason.replace(/_/g, ' ')}
                  </div>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                    {req.reasonDetails}
                  </p>

                  {/* Scrutiny Remarks */}
                  {req.officerScrutinyRemarks && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-950">
                      <span className="font-bold block mb-0.5">Officer Scrutiny Finding ({req.officerName}):</span>
                      <p>{req.officerScrutinyRemarks}</p>
                    </div>
                  )}

                  {/* Authority Decision Banner */}
                  {isApproved && (
                    <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-2.5">
                      <Award className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-sm">
                          Release Approved by Competent Authority ({req.authorityDecidedBy})
                        </div>
                        <div className="text-[11px] font-mono text-emerald-700 mt-0.5">
                          Statutory Approval Certificate Ref: {req.approvalCertificateRef}
                        </div>
                        <p className="mt-1 text-xs text-emerald-900">{req.authorityDecisionRemarks}</p>
                      </div>
                    </div>
                  )}

                  {isRejected && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900">
                      <span className="font-bold block">Release Disapproved by Competent Authority:</span>
                      <p className="mt-0.5">{req.authorityDecisionRemarks}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Submitted on {formatDateTime(req.createdAt)}</span>
                  {isApproved && (
                    <span className="font-bold text-emerald-700">
                      AICTE Lien Formally Discharged
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Lodge Statutory Release / Refund Application"
        description="Submit application for unconditional discharge of AICTE lien upon technical deposits."
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Eligible FDR</label>
            <select
              required
              value={selectedFdrId}
              onChange={e => setSelectedFdrId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white font-mono"
            >
              {eligibleFdrs.map(fdr => (
                <option key={fdr.id} value={fdr.id}>
                  {fdr.fdrNumber} – {fdr.bankName} (₹{fdr.principalAmount.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Statutory Reason for Lien Release</label>
            <select
              value={requestReason}
              onChange={e => setRequestReason(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
            >
              <option value="TENURE_COMPLETED">Mandatory Regulatory Deposit Tenure Completed (e.g. 5-10 Years)</option>
              <option value="COURSE_CLOSURE">Permanent Closure of Accredited Stream / Programme</option>
              <option value="INSTITUTION_CLOSURE">Voluntary Closure of Institution Approved by State & AICTE</option>
              <option value="SUBSTITUTION_APPROVED">Substitution with New Composite Deposit Instrument</option>
              <option value="REGULATORY_REFUND">Regulatory Refund upon Autonomous Conversion</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Justification & Background</label>
            <textarea
              required
              rows={3}
              value={reasonDetails}
              onChange={e => setReasonDetails(e.target.value)}
              placeholder="State approval order references, graduating batch year, or trust resolution details..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Upload Supporting Regulatory NOC / Closure Order (Optional)
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.svg"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-800">
            <span className="font-bold text-slate-900 block mb-1">Mandatory Compliance Undertakings:</span>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allDuesCleared}
                onChange={e => setAllDuesCleared(e.target.checked)}
                className="w-4 h-4 rounded text-navy-900 cursor-pointer"
              />
              <span>All student fees, caution moneys, and faculty salary dues have been fully discharged.</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={academicAuditCleared}
                onChange={e => setAcademicAuditCleared(e.target.checked)}
                className="w-4 h-4 rounded text-navy-900 cursor-pointer"
              />
              <span>Final academic audit and university affiliation verification completed satisfactorily.</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noLegalDispute}
                onChange={e => setNoLegalDispute(e.target.checked)}
                className="w-4 h-4 rounded text-navy-900 cursor-pointer"
              />
              <span>No pending court injunctions, ombudsman complaints, or AICTE vigilance inquiries.</span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting Application...' : 'Lodge Release Application'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
