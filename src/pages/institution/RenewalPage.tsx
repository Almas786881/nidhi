import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { fdrService } from '@/services/fdrService';
import { renewalService } from '@/services/renewalService';
import { formatINR, formatDate, getDaysRemaining } from '@/utils/formatters';
import { Modal } from '@/components/common/Modal';
import { RotateCw, Clock, AlertTriangle, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import type { FDRRecord, RenewalRecord } from '@/types';

export const RenewalPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [expiringFdrs, setExpiringFdrs] = useState<FDRRecord[]>([]);
  const [renewalHistory, setRenewalHistory] = useState<RenewalRecord[]>([]);
  const [selectedFdr, setSelectedFdr] = useState<FDRRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form Fields
  const [newFdrNumber, setNewFdrNumber] = useState('');
  const [newBankName, setNewBankName] = useState('State Bank of India');
  const [newBranchName, setNewBranchName] = useState('');
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newInterestRate, setNewInterestRate] = useState<number | ''>(7.2);
  const [newIssueDate, setNewIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [newMaturityDate, setNewMaturityDate] = useState(
    new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [reason, setReason] = useState<RenewalRecord['reasonForRenewal']>('PERIOD_EXTENSION');
  const [file, setFile] = useState<File | null>(null);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    const [allFdrs, history] = await Promise.all([
      fdrService.listFdrs({ currentUser: user }),
      renewalService.listRenewals(user.institutionId),
    ]);

    // Expiring or matured
    const expiring = allFdrs.filter(f => {
      const days = getDaysRemaining(f.maturityDate);
      return (days <= 90 || f.workflowStatus === 'MATURED' || f.workflowStatus === 'RENEWAL_PENDING') && !f.isRenewed;
    });
    setExpiringFdrs(expiring);
    setRenewalHistory(history);

    // Preselect if query param passed
    const preselectId = searchParams.get('fdrId');
    if (preselectId) {
      const target = allFdrs.find(f => f.id === preselectId);
      if (target) {
        handleOpenRenewal(target);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user, searchParams]);

  const handleOpenRenewal = (fdr: FDRRecord) => {
    setSelectedFdr(fdr);
    setNewFdrNumber(`${fdr.bankName.slice(0, 3).toUpperCase()}-REN-${Math.floor(100000 + Math.random() * 900000)}`);
    setNewBankName(fdr.bankName);
    setNewBranchName(fdr.branchName);
    setNewAmount(fdr.principalAmount);
    setNewInterestRate(fdr.interestRate || 7.2);
    setFile(null);
    setIsModalOpen(true);
  };

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFdr || !user || !file) {
      alert('Please upload the new renewed FDR certificate document.');
      return;
    }

    try {
      setIsSubmitting(true);
      await renewalService.submitRenewal(
        {
          originalFdrId: selectedFdr.id,
          newFdrNumber,
          newBankName,
          newBranchName,
          newPrincipalAmount: Number(newAmount),
          newInterestRate: newInterestRate ? Number(newInterestRate) : undefined,
          newIssueDate,
          newMaturityDate,
          reasonForRenewal: reason,
          renewalDocument: file,
          renewalFileName: file.name,
          renewalFileMime: file.type || 'application/pdf',
        },
        user
      );

      setIsModalOpen(false);
      loadData();
      alert('Renewal instrument lodged successfully! Linked to old FDR instrument in regulatory ledger.');
    } catch (err: any) {
      alert('Failed to submit renewal: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-950 tracking-tight">FDR Renewal & Replacement Desk</h1>
        <p className="text-xs text-slate-500 mt-1">
          Lodge extended maturity instruments for expiring security deposits while preserving legacy audit links
        </p>
      </div>

      {/* Expiring FDRs section */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>FDRs Maturing or Requiring Regulatory Renewal ({expiringFdrs.length})</span>
        </h3>

        {expiringFdrs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No active FDRs are approaching maturity within 90 days.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expiringFdrs.map(fdr => {
              const days = getDaysRemaining(fdr.maturityDate);
              return (
                <div key={fdr.id} className="bg-white rounded-xl border border-amber-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{fdr.fdrNumber}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        days < 0
                          ? 'bg-rose-100 text-rose-800'
                          : days <= 7
                          ? 'bg-rose-100 text-rose-800 animate-pulse'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {days < 0 ? 'Matured' : `${days} Days Left`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">{fdr.bankName} ({fdr.branchName})</p>
                  <p className="text-sm font-extrabold text-navy-900 mt-1">{formatINR(fdr.principalAmount)}</p>
                  <p className="text-xs text-slate-500 mt-1">Maturity Date: {formatDate(fdr.maturityDate)}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">Ref: {fdr.applicationReference}</span>
                    <button
                      onClick={() => handleOpenRenewal(fdr)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Start Renewal</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Renewal History */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Replacement & Renewal History</h3>
        {renewalHistory.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-400">
            No previous renewals on record.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <th className="py-2.5 px-4">Original FDR No</th>
                  <th className="py-2.5 px-4">New Replacement Instrument</th>
                  <th className="py-2.5 px-4">Bank</th>
                  <th className="py-2.5 px-4 text-right">Principal</th>
                  <th className="py-2.5 px-4">New Maturity</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {renewalHistory.map(ren => (
                  <tr key={ren.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-medium text-slate-600 line-through">
                      {ren.originalFdrNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">{ren.newFdrNumber}</td>
                    <td className="py-3 px-4 text-slate-700">{ren.newBankName}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatINR(ren.newPrincipalAmount)}</td>
                    <td className="py-3 px-4 text-slate-700">{formatDate(ren.newMaturityDate)}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-semibold uppercase">
                        {ren.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Renewal Submission Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Lodge Renewed / Replacement FDR"
        description={`Renewing expiring deposit ${selectedFdr?.fdrNumber} (Ref: ${selectedFdr?.applicationReference})`}
        maxWidth="2xl"
      >
        <form onSubmit={handleRenewalSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900">
            <span className="font-bold block">Audit Trail Preservation:</span> The original FDR record ({selectedFdr?.fdrNumber}) will remain permanently archived in the AICTE ledger and linked forward to this new replacement instrument.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New FDR Number</label>
              <input
                type="text"
                required
                value={newFdrNumber}
                onChange={e => setNewFdrNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Renewal Reason</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
              >
                <option value="PERIOD_EXTENSION">Period Extension (Same Bank)</option>
                <option value="BANK_CHANGE">Transfer to Another Scheduled Bank</option>
                <option value="AMOUNT_REVISION">Deposit Amount Revision</option>
                <option value="MANDATORY_REGULATORY_RENEWAL">Mandatory Regulatory Renewal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                required
                value={newBankName}
                onChange={e => setNewBankName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name</label>
              <input
                type="text"
                required
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Renewed Principal Amount (₹)</label>
              <input
                type="number"
                required
                value={newAmount}
                onChange={e => setNewAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Maturity Date</label>
              <input
                type="date"
                required
                value={newMaturityDate}
                onChange={e => setNewMaturityDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Upload Scanned Renewed FDR Certificate *
              </label>
              <input
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg,.svg"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Mandatory: Ensure the joint mandate endorsement in favor of Regional Officer, AICTE is stamped by the bank.
              </p>
            </div>
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
              {isSubmitting ? 'Lodging Renewal Instrument...' : 'Submit Renewal for Scrutiny'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
