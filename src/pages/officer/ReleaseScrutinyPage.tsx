import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { releaseService } from '@/services/releaseService';
import { fdrService } from '@/services/fdrService';
import { formatINR, formatDate, formatDateTime } from '@/utils/formatters';
import { Modal } from '@/components/common/Modal';
import { DocumentViewer } from '@/components/document/DocumentViewer';
import {
  Unlock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Building,
  ShieldCheck,
  Send,
  Eye,
} from 'lucide-react';
import type { ReleaseRequest, FDRRecord } from '@/types';

export const ReleaseScrutinyPage: React.FC = () => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ReleaseRequest[]>([]);
  const [selectedReq, setSelectedReq] = useState<ReleaseRequest | null>(null);
  const [relatedFdr, setRelatedFdr] = useState<FDRRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Scrutiny form state
  const [recommendation, setRecommendation] = useState<
    'RECOMMENDED_FOR_APPROVAL' | 'RECOMMENDED_FOR_REJECTION' | 'RETURNED_FOR_CLARIFICATION'
  >('RECOMMENDED_FOR_APPROVAL');
  const [scrutinyRemarks, setScrutinyRemarks] = useState('');
  const [duesVerified, setDuesVerified] = useState(true);
  const [auditVerified, setAuditVerified] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = async () => {
    setIsLoading(true);
    const list = await releaseService.listRequests();
    setRequests(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleOpenScrutiny = async (req: ReleaseRequest) => {
    setSelectedReq(req);
    const fdr = await fdrService.getFdrById(req.fdrId);
    setRelatedFdr(fdr);
    setScrutinyRemarks(
      req.officerScrutinyRemarks ||
        'Verified all regulatory dues and student caution money refund records. Mandatory statutory lock-in period completed without grievance.'
    );
    setDuesVerified(req.allDuesCleared);
    setAuditVerified(req.academicAuditCleared);
    setIsModalOpen(true);
  };

  const handleScrutinySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !user) return;

    try {
      setIsSubmitting(true);
      await releaseService.scrutinizeRelease({
        releaseId: selectedReq.id,
        officer: user,
        recommendation,
        scrutinyRemarks,
        duesVerified,
        auditVerified,
      });

      setIsModalOpen(false);
      loadRequests();
      alert('Release scrutiny recorded and forwarded to the Competent Authority for final human decision.');
    } catch (err: any) {
      alert('Error recording scrutiny: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Security Deposit Release Scrutiny Desk</h1>
        <p className="text-xs text-slate-500 mt-1">
          Evaluate college refund applications, verify student clearances, and submit formal recommendations to the Competent Authority
        </p>
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
            <Unlock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 text-sm">No Release Requests in System</p>
          </div>
        ) : (
          requests.map(req => {
            const isPendingOfficer = req.status === 'SUBMITTED';
            const isScrutinized = req.status === 'SCRUTINIZED';
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all ${
                  isPendingOfficer ? 'border-amber-300 bg-amber-50/10' : 'border-slate-200'
                }`}
              >
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
                  <div className="text-xs text-slate-700">
                    Lien Amount: <span className="font-bold text-navy-900">{formatINR(req.principalAmount)}</span>
                  </div>
                </div>

                <div className="py-3 text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-900">{req.institutionName}</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">Reason:</strong> {req.requestReason.replace(/_/g, ' ')}
                  </div>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                    {req.reasonDetails}
                  </p>

                  {/* Scrutiny Remarks if done */}
                  {req.officerScrutinyRemarks && (
                    <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-950">
                      <span className="font-bold block mb-0.5">
                        Officer Recommendation ({req.officerName || user?.name}):
                      </span>
                      <p>{req.officerScrutinyRemarks}</p>
                    </div>
                  )}

                  {/* Authority decision */}
                  {req.authorityDecision && (
                    <div
                      className={`p-3 rounded-lg border font-semibold ${
                        isApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      Competent Authority Decision: {req.authorityDecision} by {req.authorityDecidedBy}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Logged {formatDateTime(req.createdAt)}
                  </span>
                  {isPendingOfficer ? (
                    <button
                      onClick={() => handleOpenScrutiny(req)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Conduct Scrutiny & Forward</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenScrutiny(req)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Details</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Scrutiny Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Release Scrutiny Workspace: ${selectedReq?.id}`}
        description={`Evaluating refund of ₹${selectedReq?.principalAmount.toLocaleString('en-IN')} for ${selectedReq?.institutionName}`}
        maxWidth="3xl"
      >
        <form onSubmit={handleScrutinySubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block">FDR Number:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{selectedReq?.fdrNumber}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 block">Deposit Mandate:</span>
              <span className="font-semibold text-slate-800">{selectedReq?.depositType}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-900 block mb-1">Officer Condition & Clearance Verifications:</span>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={duesVerified}
                onChange={e => setDuesVerified(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 cursor-pointer"
              />
              <span>Verified: Institution has no pending student caution fee claims or staff salary liabilities.</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={auditVerified}
                onChange={e => setAuditVerified(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 cursor-pointer"
              />
              <span>Verified: Final Academic Audit & No Objection Certification confirmed with Regional Directorate.</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Officer Formal Recommendation
            </label>
            <select
              value={recommendation}
              onChange={e => setRecommendation(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white font-semibold"
            >
              <option value="RECOMMENDED_FOR_APPROVAL">Recommend for Full Lien Release Approval</option>
              <option value="RECOMMENDED_FOR_REJECTION">Recommend for Rejection (Conditions Not Met)</option>
              <option value="RETURNED_FOR_CLARIFICATION">Return to Institution for Additional Dues Clearances</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Scrutiny Evaluation Remarks (Forwarded to Competent Authority)
            </label>
            <textarea
              required
              rows={4}
              value={scrutinyRemarks}
              onChange={e => setScrutinyRemarks(e.target.value)}
              placeholder="State regulatory findings, audit compliance, and explicit release recommendation..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
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
              {isSubmitting ? 'Recording...' : 'Forward Recommendation to Authority'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
