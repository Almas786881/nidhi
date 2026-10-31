import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { fdrService } from '@/services/fdrService';
import { DocumentViewer } from '@/components/document/DocumentViewer';
import { formatINR } from '@/utils/formatters';
import confetti from 'canvas-confetti';
import {
  Upload,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  FileText,
  Calendar,
  Building,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { DepositType, FDRRecord } from '@/types';

export const SubmitFdrPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Form Fields
  const [bankName, setBankName] = useState('State Bank of India');
  const [branchName, setBranchName] = useState('');
  const [fdrNumber, setFdrNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(user?.institutionName || '');
  const [jointHolderName, setJointHolderName] = useState('Regional Officer, AICTE');
  const [principalAmount, setPrincipalAmount] = useState<number | ''>('');
  const [interestRate, setInterestRate] = useState<number | ''>(7.1);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [maturityDate, setMaturityDate] = useState(
    new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [depositType, setDepositType] = useState<DepositType>('JOINT_FDR');
  const [remarks, setRemarks] = useState('');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Status & Acknowledgement
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<FDRRecord | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Max 10MB
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Uploaded document exceeds 10MB limit.');
        return;
      }
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Uploaded document exceeds 10MB limit.');
        return;
      }
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMessage(null);

    // Validations
    if (!selectedFile) {
      setErrorMessage('Please upload the scanned FDR certificate (PDF, JPG, or PNG).');
      return;
    }

    if (!principalAmount || Number(principalAmount) <= 0) {
      setErrorMessage('Principal amount must be a positive number.');
      return;
    }

    if (new Date(maturityDate) <= new Date(issueDate)) {
      setErrorMessage('Maturity date must be subsequent to the Issue date.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newFdr = await fdrService.submitFdr(
        {
          bankName,
          branchName,
          fdrNumber,
          accountHolderName,
          jointHolderName,
          principalAmount: Number(principalAmount),
          interestRate: interestRate ? Number(interestRate) : undefined,
          issueDate,
          maturityDate,
          validityDate: maturityDate,
          depositType,
          remarks,
          documentFile: selectedFile,
          documentFileName: selectedFile.name,
          documentMimeType: selectedFile.type || 'application/pdf',
        },
        user
      );

      // Trigger celebratory confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setSubmittedRecord(newFdr);
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed. Please verify details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Institutional FDR Submission</h1>
        <p className="text-xs text-slate-500 mt-1">
          Lodge official security deposits, joint endowment funds, or performance guarantees with AICTE
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Validation Error:</span> {errorMessage}
          </div>
        </div>
      )}

      {/* Success Acknowledgement View */}
      {submittedRecord ? (
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-lg text-center animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
            Application Registered Successfully
          </span>
          <h2 className="text-2xl font-extrabold text-navy-950 mt-3">
            Acknowledgement Reference: {submittedRecord.applicationReference}
          </h2>
          <p className="mt-2 text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
            Your Fixed Deposit Receipt <span className="font-mono font-semibold">{submittedRecord.fdrNumber}</span> for{' '}
            <span className="font-bold text-slate-900">{formatINR(submittedRecord.principalAmount)}</span> has been securely stored in the NIDHI repository.
          </p>

          <div className="my-6 max-w-md mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Institution:</span>
              <span className="font-semibold text-slate-900">{submittedRecord.institutionName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Issuing Bank:</span>
              <span className="font-semibold text-slate-900">{submittedRecord.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Maturity Date:</span>
              <span className="font-semibold text-slate-900">{submittedRecord.maturityDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assigned Officer:</span>
              <span className="font-semibold text-teal-700">{submittedRecord.assignedOfficerName || 'Auto-Queue'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">AI OCR Verification:</span>
              <span className="font-semibold text-emerald-700">Completed (Score: {submittedRecord.aiExtractedData?.confidenceScore}%)</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(`/institution/fdrs/${submittedRecord.id}`)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-navy-900 text-white font-semibold text-xs hover:bg-navy-800 transition-colors shadow-sm"
            >
              View FDR Details & AI Matrix &rarr;
            </button>
            <button
              onClick={() => {
                setSubmittedRecord(null);
                setFdrNumber('');
                setPrincipalAmount('');
                setSelectedFile(null);
                setFilePreviewUrl(null);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Submit Another FDR
            </button>
          </div>
        </div>
      ) : (
        /* Submission Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Institution & Deposit Classification */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Building className="w-5 h-5 text-navy-900" />
              <h3 className="text-sm font-bold text-slate-900">1. Institution & Deposit Classification</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Name</label>
                <input
                  type="text"
                  disabled
                  value={user?.institutionName || 'Demo Accredited College'}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg text-slate-600 cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deposit Type Mandate</label>
                <select
                  value={depositType}
                  onChange={e => setDepositType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
                >
                  <option value="JOINT_FDR">Joint FDR in name of Regional Officer, AICTE & Chairman</option>
                  <option value="SECURITY_DEPOSIT">Security Deposit for New Institution Setup</option>
                  <option value="ENDOWMENT_FUND">Mandatory Institutional Endowment Fund</option>
                  <option value="PERFORMANCE_GUARANTEE">Performance Guarantee for Extended Intake</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name (Depositor)</label>
                <input
                  type="text"
                  required
                  value={accountHolderName}
                  onChange={e => setAccountHolderName(e.target.value)}
                  placeholder="Trust or Institution Registered Society"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Joint Holder (Statutory AICTE Lien)</label>
                <input
                  type="text"
                  required
                  value={jointHolderName}
                  onChange={e => setJointHolderName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bank & Financial Instrument Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <FileCheck2 className="w-5 h-5 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">2. Bank & Financial Instrument Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Issuing Scheduled Bank</label>
                <select
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none bg-white"
                >
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="Punjab National Bank">Punjab National Bank</option>
                  <option value="Canara Bank">Canara Bank</option>
                  <option value="Bank of Baroda">Bank of Baroda</option>
                  <option value="Union Bank of India">Union Bank of India</option>
                  <option value="Indian Bank">Indian Bank</option>
                  <option value="HDFC Bank Ltd">HDFC Bank Ltd</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank Ltd">Axis Bank Ltd</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Branch Name</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  placeholder="e.g. Connaught Place Branch"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">FDR / Certificate Number</label>
                <input
                  type="text"
                  required
                  value={fdrNumber}
                  onChange={e => setFdrNumber(e.target.value)}
                  placeholder="e.g. SBI-FDR-98124501"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Principal Amount (₹ INR)</label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={1000}
                  value={principalAmount}
                  onChange={e => setPrincipalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 1500000"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  min="2"
                  max="15"
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date</label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Maturity Date (Minimum 5 Years)</label>
                <input
                  type="date"
                  required
                  value={maturityDate}
                  onChange={e => setMaturityDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Remarks / Trust Resolution No.</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="e.g. Submitted as per AICTE Approval Process Handbook Clause 4.12"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Document Upload with Instant Preview & OCR Alert */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-navy-900" />
                <h3 className="text-sm font-bold text-slate-900">3. Scanned FDR Document Upload</h3>
              </div>
              <span className="text-[10px] font-mono bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
                AI OCR Auto-Extraction
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer relative"
            >
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.svg"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <Upload className="w-6 h-6 text-teal-600" />
                </div>
                <p className="text-xs font-bold text-slate-900">
                  {selectedFile ? selectedFile.name : 'Click or drag and drop FDR document here'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: PDF, PNG, JPG, JPEG, SVG (Max 10MB)
                </p>
              </div>
            </div>

            {/* Document Preview */}
            {selectedFile && filePreviewUrl && (
              <div className="mt-4 p-4 rounded-xl bg-slate-100 border border-slate-200">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Uploaded Document Preview ({selectedFile.name})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreviewUrl(null);
                    }}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <DocumentViewer blob={selectedFile} fileName={selectedFile.name} />
              </div>
            )}
          </div>

          {/* Submission Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/institution')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>{isSubmitting ? 'Processing OCR & Storing...' : 'Submit FDR for Regulatory Scrutiny'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
