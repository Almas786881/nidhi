import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { fdrService } from '@/services/fdrService';
import { verificationService } from '@/services/verificationService';
import { scrutinyService } from '@/services/scrutinyService';
import { clarificationService } from '@/services/clarificationService';
import { ComparisonGrid } from '@/components/verification/ComparisonGrid';
import { DocumentViewer } from '@/components/document/DocumentViewer';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatINR, formatDate, formatDateTime } from '@/utils/formatters';
import {
  Sparkles,
  RefreshCw,
  FileCheck2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Building,
  ShieldCheck,
  Send,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import type { FDRRecord, ScrutinyRemark } from '@/types';

export const AiVerificationWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [selectedFdr, setSelectedFdr] = useState<FDRRecord | null>(null);
  const [remarks, setRemarks] = useState<ScrutinyRemark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReRunningOcr, setIsReRunningOcr] = useState(false);

  // Modals
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
  const [isBankConfirmModalOpen, setIsBankConfirmModalOpen] = useState(false);

  // Modal form states
  const [remarkText, setRemarkText] = useState('');
  const [findingCategory, setFindingCategory] = useState<ScrutinyRemark['findingCategory']>('SATISFACTORY');
  const [actionRequired, setActionRequired] = useState('');

  const [queryTitle, setQueryTitle] = useState('');
  const [queryDetails, setQueryDetails] = useState('');

  const [bankStaffName, setBankStaffName] = useState('Chief Manager (Retail Assets)');
  const [bankConfirmRef, setBankConfirmRef] = useState('');
  const [bankConfirmDate, setBankConfirmDate] = useState(new Date().toISOString().slice(0, 10));

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    const list = await fdrService.listFdrs();
    setFdrs(list);

    const targetId = id || (list[0]?.id ?? null);
    if (targetId) {
      const f = list.find(item => item.id === targetId) || list[0];
      setSelectedFdr(f);
      if (f) {
        const rems = await scrutinyService.getRemarks(f.id);
        setRemarks(rems);
        setBankConfirmRef(`CONF-NODAL-${f.fdrNumber}`);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id, user]);

  const handleSelectFdr = async (f: FDRRecord) => {
    setSelectedFdr(f);
    const rems = await scrutinyService.getRemarks(f.id);
    setRemarks(rems);
    setBankConfirmRef(`CONF-NODAL-${f.fdrNumber}`);
  };

  const handleReRunOcr = async () => {
    if (!selectedFdr || !user) return;
    setIsReRunningOcr(true);
    try {
      const res = await verificationService.runAiVerification(selectedFdr.id, user);
      setSelectedFdr(res.fdr);
      alert(`AI OCR re-processing completed. Confidence score: ${res.extractedData.confidenceScore}%. Status: ${res.overallStatus}.`);
    } catch (err: any) {
      alert('OCR re-run failed: ' + err.message);
    } finally {
      setIsReRunningOcr(false);
    }
  };

  const handleSaveRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFdr || !user || !remarkText.trim()) return;

    await scrutinyService.addRemark({
      fdrId: selectedFdr.id,
      officer: user,
      stage: 'INITIAL_VERIFICATION',
      findingCategory,
      comment: remarkText,
      isActionable: !!actionRequired.trim(),
      actionRequired: actionRequired.trim() || undefined,
    });

    const rems = await scrutinyService.getRemarks(selectedFdr.id);
    setRemarks(rems);
    setRemarkText('');
    setActionRequired('');
    setIsRemarkModalOpen(false);
  };

  const handleSendClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFdr || !user) return;

    await clarificationService.createRequest({
      fdrId: selectedFdr.id,
      officer: user,
      queryTitle,
      queryDetails,
      discrepancies: selectedFdr.discrepancies,
    });

    setIsClarificationModalOpen(false);
    loadData();
    alert('Clarification request dispatched to institution.');
  };

  const handleConfirmBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFdr || !user) return;

    const updated = await verificationService.recordBankConfirmation({
      fdrId: selectedFdr.id,
      officer: user,
      bankConfirmationRef: bankConfirmRef,
      verifiedByBankStaff: bankStaffName,
      verificationDate: bankConfirmDate,
    });

    setSelectedFdr(updated);
    setIsBankConfirmModalOpen(false);
    loadData();
    alert('Bank verification confirmed and recorded in immutable regulatory register.');
  };

  if (isLoading || !selectedFdr) {
    return <LoadingSpinner size="lg" message="Loading AI verification workspace..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/officer')}
            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-navy-950 font-mono tracking-tight">{selectedFdr.fdrNumber}</h1>
              <StatusBadge status={selectedFdr.workflowStatus} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ref: <span className="font-mono text-slate-700 font-semibold">{selectedFdr.applicationReference}</span> • {selectedFdr.institutionName}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleReRunOcr}
            disabled={isReRunningOcr}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isReRunningOcr ? 'animate-spin' : ''}`} />
            <span>Re-Run AI OCR</span>
          </button>

          <button
            onClick={() => setIsRemarkModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Add Remark</span>
          </button>

          <button
            onClick={() => {
              setQueryTitle('Discrepancy identified between submitted application and physical instrument');
              setQueryDetails('Kindly examine the attached OCR comparison matrix. Discrepancies were noted in Principal Amount / Maturity Date / Lien Endorsement. Please furnish bank rectification letter.');
              setIsClarificationModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Request Clarification</span>
          </button>

          <button
            onClick={() => setIsBankConfirmModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Record Bank Confirmation</span>
          </button>
        </div>
      </div>

      {/* Case Selector Dropdown if multiple cases */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 text-xs">
        <span className="font-semibold text-slate-600 flex-shrink-0">Switch Case:</span>
        <select
          value={selectedFdr.id}
          onChange={e => {
            const match = fdrs.find(f => f.id === e.target.value);
            if (match) handleSelectFdr(match);
          }}
          className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 font-mono text-xs focus:outline-none"
        >
          {fdrs.map(f => (
            <option key={f.id} value={f.id}>
              {f.fdrNumber} – {f.institutionName} (₹{f.principalAmount.toLocaleString('en-IN')}) [{f.workflowStatus}]
            </option>
          ))}
        </select>
      </div>

      {/* Main Grid: Comparison Matrix (Top) & Document Viewer (Bottom) */}
      <div className="space-y-6">
        <ComparisonGrid fdr={selectedFdr} />

        {/* Document Preview */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-navy-900" />
            <span>Original Uploaded Deposit Instrument</span>
          </h3>
          {selectedFdr.documentId ? (
            <DocumentViewer documentId={selectedFdr.documentId} />
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              No document file attached to this record.
            </div>
          )}
        </div>

        {/* Scrutiny Remarks Trail */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Regulatory Scrutiny Trail ({remarks.length})</h3>
            <button
              onClick={() => setIsRemarkModalOpen(true)}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              + Add New Remark
            </button>
          </div>

          {remarks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No scrutiny remarks recorded for this application yet.</p>
          ) : (
            <div className="space-y-3">
              {remarks.map(rem => (
                <div key={rem.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{rem.officerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(rem.createdAt)}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">
                    {rem.stage} • {rem.findingCategory}
                  </div>
                  <p className="text-slate-700 leading-relaxed">{rem.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Add Remark */}
      <Modal
        isOpen={isRemarkModalOpen}
        onClose={() => setIsRemarkModalOpen(false)}
        title="Add Officer Scrutiny Remark"
        description="Recorded permanently into the regulatory audit log."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveRemark} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Finding Category</label>
            <select
              value={findingCategory}
              onChange={e => setFindingCategory(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
            >
              <option value="SATISFACTORY">Satisfactory - All conditions verified</option>
              <option value="DISCREPANCY">Discrepancy flagged between OCR and entry</option>
              <option value="MISSING_MANDATORY_CLAUSE">Mandatory Joint Lien Clause Missing</option>
              <option value="BANK_CONFIRMATION_PENDING">Direct Bank Nodal Confirmation Pending</option>
              <option value="OTHER">General Regulatory Finding</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Scrutiny Comment / Observation</label>
            <textarea
              required
              rows={4}
              value={remarkText}
              onChange={e => setRemarkText(e.target.value)}
              placeholder="State your technical or financial scrutiny finding in detail..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Action Required from College (Optional)</label>
            <input
              type="text"
              value={actionRequired}
              onChange={e => setActionRequired(e.target.value)}
              placeholder="e.g. Upload bank certificate with explicit joint lien endorsement"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsRemarkModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm"
            >
              Save Scrutiny Remark
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Request Clarification */}
      <Modal
        isOpen={isClarificationModalOpen}
        onClose={() => setIsClarificationModalOpen(false)}
        title="Issue Clarification Query to Institution"
        description="The FDR workflow status will be moved to CLARIFICATION_REQUESTED and the institution notified."
        maxWidth="lg"
      >
        <form onSubmit={handleSendClarification} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Query Subject / Title</label>
            <input
              type="text"
              required
              value={queryTitle}
              onChange={e => setQueryTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clarification Specifics & Required Rectifications</label>
            <textarea
              required
              rows={4}
              value={queryDetails}
              onChange={e => setQueryDetails(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsClarificationModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
            >
              Dispatch Clarification Query
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Record Bank Confirmation */}
      <Modal
        isOpen={isBankConfirmModalOpen}
        onClose={() => setIsBankConfirmModalOpen(false)}
        title="Record Official Bank Confirmation"
        description="Never verify an FDR solely on OCR extraction. Only record when bank nodal confirmation has been established."
        maxWidth="lg"
      >
        <form onSubmit={handleConfirmBank} className="space-y-4">
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900">
            <span className="font-bold block mb-0.5">Statutory Principle:</span> NIDHI strictly distinguishes institution-submitted OCR extractions from authentic bank confirmations. Recording this will mark the FDR as <strong>CONFIRMED_BY_BANK</strong> and <strong>VERIFIED</strong>.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Confirmation Reference Number</label>
            <input
              type="text"
              required
              value={bankConfirmRef}
              onChange={e => setBankConfirmRef(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Bank Signatory / Branch Official</label>
            <input
              type="text"
              required
              value={bankStaffName}
              onChange={e => setBankStaffName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmation Verification Date</label>
            <input
              type="date"
              required
              value={bankConfirmDate}
              onChange={e => setBankConfirmDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsBankConfirmModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
            >
              Confirm & Mark Verified
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
