import React, { useState, useEffect } from 'react';
import { reportService } from '@/services/reportService';
import { db } from '@/db/dexie';
import { formatINR, formatDate, getDaysRemaining } from '@/utils/formatters';
import {
  FileText,
  Download,
  Printer,
  BarChart2,
  Users,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INSTITUTIONS' | 'OFFICERS' | 'EXPIRING' | 'DISCREPANCIES'>('INSTITUTIONS');
  const [institutionSummary, setInstitutionSummary] = useState<any[]>([]);
  const [officerSummary, setOfficerSummary] = useState<any[]>([]);
  const [expiringFdrs, setExpiringFdrs] = useState<any[]>([]);
  const [discrepancyFdrs, setDiscrepancyFdrs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      setIsLoading(true);
      const [insts, officers, allFdrs] = await Promise.all([
        reportService.getInstitutionWiseSummary(),
        reportService.getOfficerPerformance(),
        db.fdrRecords.toArray(),
      ]);

      setInstitutionSummary(insts);
      setOfficerSummary(officers);

      // Expiring within 90 days
      const expiring = allFdrs.filter(f => {
        const days = getDaysRemaining(f.maturityDate);
        return days >= 0 && days <= 90;
      });
      expiring.sort((a, b) => getDaysRemaining(a.maturityDate) - getDaysRemaining(b.maturityDate));
      setExpiringFdrs(expiring);

      // Discrepancies
      const disc = allFdrs.filter(f => f.workflowStatus === 'DISCREPANCY_DETECTED' || f.verificationStatus === 'DISCREPANCY');
      setDiscrepancyFdrs(disc);

      setIsLoading(false);
    }
    loadReports();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportTabCsv = () => {
    if (activeTab === 'INSTITUTIONS') {
      const headers = ['Code', 'Institution Name', 'Region', 'State', 'FDR Count', 'Total Deposited (INR)', 'Active', 'Discrepancies'];
      const rows = institutionSummary.map(i => [i.code, i.name, i.region, i.state, i.totalFdrs, i.totalAmount, i.activeCount, i.discrepancyCount]);
      reportService.downloadCsv('Institution_Wise_FDR_Summary', headers, rows);
    } else if (activeTab === 'OFFICERS') {
      const headers = ['Officer Name', 'Department', 'Assigned FDRs', 'Confirmed by Bank', 'Pending Scrutiny', 'Remarks Recorded'];
      const rows = officerSummary.map(o => [o.name, o.department, o.assignedCount, o.verifiedCount, o.pendingCount, o.remarksCount]);
      reportService.downloadCsv('Officer_Workload_Performance', headers, rows);
    } else if (activeTab === 'EXPIRING') {
      const headers = ['Application Ref', 'FDR Number', 'Institution', 'Bank', 'Principal Amount', 'Maturity Date', 'Days Remaining'];
      const rows = expiringFdrs.map(f => [f.applicationReference, f.fdrNumber, f.institutionName, f.bankName, f.principalAmount, f.maturityDate, getDaysRemaining(f.maturityDate)]);
      reportService.downloadCsv('Expiring_FDR_Regulatory_Notice', headers, rows);
    } else {
      reportService.exportFdrMasterCsv();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Regulatory Audit & Reports Hub</h1>
          <p className="text-xs text-slate-500 mt-1">
            Official statutory summaries, compliance exports, and institutional deposit audit sheets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportTabCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-navy-900 text-white hover:bg-navy-800 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export Table CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 text-xs">
        <button
          onClick={() => setActiveTab('INSTITUTIONS')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'INSTITUTIONS'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Institution-Wise Portfolio</span>
        </button>
        <button
          onClick={() => setActiveTab('OFFICERS')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'OFFICERS'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Officer Scrutiny Performance</span>
        </button>
        <button
          onClick={() => setActiveTab('EXPIRING')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'EXPIRING'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Expiring FDRs Notice ({expiringFdrs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('DISCREPANCIES')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'DISCREPANCIES'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Flagged Discrepancies ({discrepancyFdrs.length})</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {activeTab === 'INSTITUTIONS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Institution Name</th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 px-4 text-center">FDR Count</th>
                  <th className="py-3 px-4 text-right">Total Deposited</th>
                  <th className="py-3 px-4 text-center">Active</th>
                  <th className="py-3 px-4 text-center">Discrepancies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {institutionSummary.map(inst => (
                  <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">{inst.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{inst.name}</td>
                    <td className="py-3 px-4 text-slate-600">{inst.region} ({inst.state})</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{inst.totalFdrs}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatINR(inst.totalAmount)}</td>
                    <td className="py-3 px-4 text-center text-teal-700 font-semibold">{inst.activeCount}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={inst.discrepancyCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                        {inst.discrepancyCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'OFFICERS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <th className="py-3 px-4">Officer Name</th>
                  <th className="py-3 px-4">Department Division</th>
                  <th className="py-3 px-4 text-center">Assigned Intake</th>
                  <th className="py-3 px-4 text-center">Confirmed by Bank</th>
                  <th className="py-3 px-4 text-center">Pending Scrutiny</th>
                  <th className="py-3 px-4 text-center">Remarks Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officerSummary.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{o.name}</td>
                    <td className="py-3 px-4 text-slate-600">{o.department}</td>
                    <td className="py-3 px-4 text-center font-semibold text-navy-900">{o.assignedCount}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700">{o.verifiedCount}</td>
                    <td className="py-3 px-4 text-center font-semibold text-amber-700">{o.pendingCount}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{o.remarksCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'EXPIRING' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <th className="py-3 px-4">Application Ref</th>
                  <th className="py-3 px-4">FDR Number</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Bank Name</th>
                  <th className="py-3 px-4 text-right">Principal Amount</th>
                  <th className="py-3 px-4 text-center">Maturity Date</th>
                  <th className="py-3 px-4 text-center">Days Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiringFdrs.map(f => {
                  const days = getDaysRemaining(f.maturityDate);
                  return (
                    <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-navy-900">{f.applicationReference}</td>
                      <td className="py-3 px-4 font-mono text-slate-800">{f.fdrNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{f.institutionName}</td>
                      <td className="py-3 px-4 text-slate-600">{f.bankName}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{formatINR(f.principalAmount)}</td>
                      <td className="py-3 px-4 text-center">{formatDate(f.maturityDate)}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            days <= 7
                              ? 'bg-rose-100 text-rose-800 animate-pulse'
                              : days <= 30
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {days} days
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'DISCREPANCIES' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <th className="py-3 px-4">FDR Number</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Deposit Amount</th>
                  <th className="py-3 px-4">Identified Discrepancies</th>
                  <th className="py-3 px-4 text-center">AI Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discrepancyFdrs.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">{f.fdrNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{f.institutionName}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatINR(f.principalAmount)}</td>
                    <td className="py-3 px-4 text-rose-700">
                      {(f.discrepancies || [])
                        .filter((d: any) => d.status === 'MISMATCH')
                        .map((d: any) => d.notes || `${d.field} mismatch`)
                        .join('; ') || 'OCR Mismatch'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-amber-700">
                      {f.aiExtractedData?.confidenceScore || 65}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
