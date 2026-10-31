import React, { useState, useEffect } from 'react';
import { db } from '@/db/dexie';
import { renewalService } from '@/services/renewalService';
import { fdrService } from '@/services/fdrService';
import { formatINR, formatDate, formatDateTime } from '@/utils/formatters';
import { RotateCw, CheckCircle2, FileText, ArrowRight, Eye, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { DocumentViewer } from '@/components/document/DocumentViewer';
import type { RenewalRecord, FDRRecord } from '@/types';

export const RenewalReviewPage: React.FC = () => {
  const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
  const [selectedRen, setSelectedRen] = useState<RenewalRecord | null>(null);
  const [oldFdr, setOldFdr] = useState<FDRRecord | null>(null);
  const [newFdr, setNewFdr] = useState<FDRRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadRenewals = async () => {
    setIsLoading(true);
    const list = await renewalService.listRenewals();
    setRenewals(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRenewals();
  }, []);

  const handleOpenReview = async (ren: RenewalRecord) => {
    setSelectedRen(ren);
    const [oldRec, newRec] = await Promise.all([
      db.fdrRecords.get(ren.originalFdrId),
      ren.newFdrId ? db.fdrRecords.get(ren.newFdrId) : null,
    ]);
    setOldFdr(oldRec || null);
    setNewFdr(newRec || null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Renewal & Replacement Scrutiny</h1>
        <p className="text-xs text-slate-500 mt-1">
          Scrutinize renewed deposit certificates, compare terms with legacy instruments, and maintain audit link chains
        </p>
      </div>

      <div className="space-y-4">
        {renewals.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
            <RotateCw className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 text-sm">No Renewal Submissions in Queue</p>
          </div>
        ) : (
          renewals.map(ren => (
            <div key={ren.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-navy-900 text-sm">New FDR: {ren.newFdrNumber}</span>
                  <span className="text-xs text-slate-400">Replaced:</span>
                  <span className="font-mono text-xs line-through text-slate-500">{ren.originalFdrNumber}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                    {ren.status}
                  </span>
                </div>
                <div className="text-xs text-slate-700">
                  Principal: <span className="font-bold text-slate-900">{formatINR(ren.newPrincipalAmount)}</span>
                </div>
              </div>

              <div className="py-3 text-xs space-y-1.5">
                <div className="font-semibold text-slate-900">{ren.institutionName}</div>
                <div className="text-slate-600">
                  Bank: {ren.newBankName} ({ren.newBranchName}) • Reason: {ren.reasonForRenewal.replace(/_/g, ' ')}
                </div>
                <div className="text-slate-500">
                  New Maturity Date: <strong className="text-slate-900">{formatDate(ren.newMaturityDate)}</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Lodged on {formatDateTime(ren.createdAt)}
                </span>
                <button
                  onClick={() => handleOpenReview(ren)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Side-by-Side</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Side-by-Side Instrument Comparison"
        description="Verify that the renewed deposit maintains identical or higher principal value and statutory lien clauses."
        maxWidth="3xl"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Old Instrument */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Legacy Matured Instrument
              </span>
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 block">FDR Number:</span>
                  <span className="font-mono font-bold text-slate-800">{oldFdr?.fdrNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Bank:</span>
                  <span className="font-semibold text-slate-800">{oldFdr?.bankName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Original Principal:</span>
                  <span className="font-bold text-slate-900">{formatINR(oldFdr?.principalAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Original Maturity:</span>
                  <span className="text-slate-700">{formatDate(oldFdr?.maturityDate)}</span>
                </div>
              </div>
            </div>

            {/* New Replacement Instrument */}
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-950">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block mb-2">
                New Replacement Instrument
              </span>
              <div className="space-y-2">
                <div>
                  <span className="text-teal-700 block">New FDR Number:</span>
                  <span className="font-mono font-bold text-teal-900">{selectedRen?.newFdrNumber}</span>
                </div>
                <div>
                  <span className="text-teal-700 block">Bank & Branch:</span>
                  <span className="font-semibold text-teal-900">{selectedRen?.newBankName} ({selectedRen?.newBranchName})</span>
                </div>
                <div>
                  <span className="text-teal-700 block">New Principal:</span>
                  <span className="font-bold text-teal-900">{formatINR(selectedRen?.newPrincipalAmount)}</span>
                </div>
                <div>
                  <span className="text-teal-700 block">Extended Maturity Date:</span>
                  <span className="font-bold text-teal-900">{formatDate(selectedRen?.newMaturityDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {selectedRen?.newDocumentId && (
            <div className="mt-4">
              <h4 className="font-bold text-slate-800 mb-2">Renewed Document Preview:</h4>
              <DocumentViewer documentId={selectedRen.newDocumentId} />
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Close Comparison
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
