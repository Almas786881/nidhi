import React, { useState, useEffect } from 'react';
import { db } from '@/db/dexie';
import {
  exportDatabaseToJson,
  importDatabaseFromJson,
  downloadDatabaseBackup,
  resetDatabaseToSeed,
} from '@/db/backup';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  FileCheck2,
  Building,
  Users,
} from 'lucide-react';

export const BackupRestorePage: React.FC = () => {
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadCounts = async () => {
    const counts: Record<string, number> = {};
    for (const table of db.tables) {
      counts[table.name] = await table.count();
    }
    setTableCounts(counts);
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadDatabaseBackup();
      setNotification({
        type: 'success',
        message: 'Complete database snapshot (including all document Blobs in base64) successfully exported.',
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Backup export failed: ' + err.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      await importDatabaseFromJson(text);
      await loadCounts();
      setNotification({
        type: 'success',
        message: 'Database backup imported successfully. All 14 tables and document Blobs restored.',
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Backup restoration failed: ' + err.message });
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetToSeed = async () => {
    try {
      setIsResetting(true);
      await resetDatabaseToSeed();
      await loadCounts();
      setIsResetConfirmOpen(false);
      setNotification({
        type: 'success',
        message: 'Database reset to default seed data (8 institutions, 22+ FDRs, audit trail).',
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to reset demo data: ' + err.message });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-950 tracking-tight">IndexedDB Storage & Disaster Recovery</h1>
        <p className="text-xs text-slate-500 mt-1">
          Full persistent database backup, JSON snapshot import/export, and live table record monitors
        </p>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Primary Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Export Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Export Complete JSON Backup</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Downloads a complete JSON snapshot including all 14 Dexie tables, users, metadata, and binary documents serialized as Base64.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>{isExporting ? 'Generating JSON...' : 'Download Backup File'}</span>
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Restore from Backup</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload a previously exported NIDHI JSON file. Reconstructs all tables, relations, and binary Blobs seamlessly in IndexedDB.
            </p>
          </div>
          <label className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-xs transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>{isImporting ? 'Importing Data...' : 'Select Backup JSON File'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Demo Reset Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Reset Demo Database</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Restores the local database to pristine Hackathon sample data (8 institutions, 22+ FDRs, officer assignments, and audit trails).
            </p>
          </div>
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-rose-600" />
            <span>Reset to Pristine State</span>
          </button>
        </div>
      </div>

      {/* IndexedDB Live Tables Monitor */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-navy-900" />
            <h3 className="text-sm font-bold text-slate-900">
              Active IndexedDB Schema & Record Table Counts (NidhiPortalDB v1)
            </h3>
          </div>
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
            14 Tables Persistent
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(tableCounts).map(([tableName, count]) => (
            <div key={tableName} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate font-mono" title={tableName}>
                {tableName}
              </p>
              <h4 className="text-lg font-extrabold text-navy-950 mt-1">{count}</h4>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetToSeed}
        title="Reset Local IndexedDB to Default Demo Data?"
        message="This action will clear all current entries and re-seed the 14 IndexedDB tables with the default AICTE Hackathon demonstration dataset (8 institutions, 22+ FDR records, sample officers, and audit chain). Are you sure you wish to proceed?"
        confirmLabel="Confirm Database Reset"
        variant="danger"
        isLoading={isResetting}
      />
    </div>
  );
};
