import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { clarificationService } from '@/services/clarificationService';
import { Modal } from '@/components/common/Modal';
import { formatDateTime } from '@/utils/formatters';
import { HelpCircle, CheckCircle2, Clock, Upload, FileText, AlertTriangle, Send } from 'lucide-react';
import type { ClarificationRequest } from '@/types';

export const ClarificationResponsesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ClarificationRequest[]>([]);
  const [selectedReq, setSelectedReq] = useState<ClarificationRequest | null>(null);
  const [responseText, setResponseText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadRequests = async () => {
    if (!user?.institutionId) return;
    setIsLoading(true);
    const list = await clarificationService.getByInstitution(user.institutionId);
    setRequests(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [user]);

  const handleOpenRespond = (req: ClarificationRequest) => {
    setSelectedReq(req);
    setResponseText(req.institutionResponse || '');
    setFile(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !user) return;

    try {
      setIsSubmitting(true);
      await clarificationService.submitResponse({
        requestId: selectedReq.id,
        institutionUser: user,
        responseText,
        correctedFile: file || undefined,
        correctedFileName: file?.name,
        correctedFileMime: file?.type,
      });

      setSelectedReq(null);
      loadRequests();
    } catch (err: any) {
      alert('Error submitting clarification response: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Clarification Desk</h1>
        <p className="text-xs text-slate-500 mt-1">
          Respond to scrutiny queries, upload corrected bank certificates, and resolve discrepancies flagged by AICTE officers
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Pending Clarification Queries</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            All submitted FDR records for your institution are currently verified or under regular officer review without discrepancy flags.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map(req => {
            const isPending = req.status === 'PENDING_RESPONSE';
            return (
              <div
                key={req.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all ${
                  isPending ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-navy-950 text-sm">FDR: {req.fdrNumber}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                        req.status === 'PENDING_RESPONSE'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : req.status === 'SUBMITTED'
                          ? 'bg-purple-100 text-purple-800'
                          : req.status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {req.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Raised by {req.officerName} on {formatDateTime(req.createdAt)}
                  </div>
                </div>

                <div className="py-3">
                  <h4 className="text-sm font-bold text-slate-900">{req.queryTitle}</h4>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {req.queryDetails}
                  </p>

                  {/* Discrepancies listing */}
                  {req.discrepancies && req.discrepancies.length > 0 && (
                    <div className="mt-3">
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Flagged Financial Discrepancies:
                      </span>
                      <div className="space-y-1">
                        {req.discrepancies.map((d, idx) => (
                          <div
                            key={idx}
                            className="text-xs p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between"
                          >
                            <span>
                              <strong className="capitalize">{d.field}:</strong> Submitted: {d.submittedValue} vs Extracted: {d.extractedValue}
                            </span>
                            <span className="text-[10px] font-bold text-rose-700 uppercase">MISMATCH</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previous Response if submitted */}
                  {req.institutionResponse && (
                    <div className="mt-3 p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900">
                      <span className="font-bold block mb-1">Your Submitted Response ({formatDateTime(req.institutionRespondedAt)}):</span>
                      <p className="leading-relaxed">{req.institutionResponse}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {isPending ? 'Action Required: Submit response to resume verification' : 'Under officer review'}
                  </span>
                  {isPending && (
                    <button
                      onClick={() => handleOpenRespond(req)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Respond to Query</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Response Modal */}
      <Modal
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title="Submit Clarification Response"
        description={`Provide clarification for query regarding FDR ${selectedReq?.fdrNumber}`}
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <span className="font-bold block mb-0.5">{selectedReq?.queryTitle}</span>
            <p className="text-[11px] leading-relaxed">{selectedReq?.queryDetails}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institution Written Justification / Response
            </label>
            <textarea
              required
              rows={4}
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              placeholder="State the institutional clarification, bank endorsement corrections, or explanation..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Upload Corrected / Supporting Document (Optional)
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.svg"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Upload revised FDR receipt, bank lien endorsement letter, or rectification certificate.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setSelectedReq(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting Response...' : 'Submit Response to Officer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
