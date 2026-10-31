import React, { useState, useEffect } from 'react';
import { db } from '@/db/dexie';
import { auditService } from '@/services/auditService';
import { useAuthStore } from '@/store/authStore';
import { Settings, Save, CheckCircle2, Shield, Bell, Cpu, Sliders } from 'lucide-react';
import type { SystemSettings } from '@/types';

export const SystemSettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form fields
  const [organizationName, setOrganizationName] = useState('');
  const [intervalsStr, setIntervalsStr] = useState('90, 60, 30, 7');
  const [ocrThreshold, setOcrThreshold] = useState(75);
  const [autoAssignment, setAutoAssignment] = useState(true);
  const [allowDrafts, setAllowDrafts] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      const data = await db.systemSettings.get('SETTINGS-01');
      if (data) {
        setSettings(data);
        setOrganizationName(data.organizationName);
        setIntervalsStr(data.reminderIntervalsDays.join(', '));
        setOcrThreshold(data.ocrConfidenceThreshold);
        setAutoAssignment(data.autoAssignmentEnabled);
        setAllowDrafts(data.allowInstitutionDrafts);
      }
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !settings) return;

    // Parse reminder intervals
    const parsedIntervals = intervalsStr
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0);

    const now = new Date().toISOString();
    const updated: SystemSettings = {
      ...settings,
      organizationName: organizationName.trim(),
      reminderIntervalsDays: parsedIntervals.length > 0 ? parsedIntervals : [90, 60, 30, 7],
      ocrConfidenceThreshold: ocrThreshold,
      autoAssignmentEnabled: autoAssignment,
      allowInstitutionDrafts: allowDrafts,
      updatedAt: now,
      updatedBy: user.name,
    };

    await db.systemSettings.put(updated);
    setSettings(updated);

    await auditService.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'SYSTEM_SETTINGS_UPDATED',
      category: 'ADMIN',
      relatedRecordId: 'SETTINGS-01',
      description: `Updated portal settings (OCR Threshold: ${ocrThreshold}%, Intervals: [${updated.reminderIntervalsDays.join(', ')}]).`,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  if (isLoading || !settings) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading portal configuration...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Portal Configuration & Governance</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure AI OCR parameters, automated maturity reminder milestones, and administrative rules
        </p>
      </div>

      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>System configuration successfully updated and recorded in cryptographic audit ledger.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Regulatory Organization */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Shield className="w-5 h-5 text-navy-900" />
            <h3 className="text-sm font-bold text-slate-900">Institutional Identity</h3>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Statutory Authority / Organization Name
            </label>
            <input
              type="text"
              required
              value={organizationName}
              onChange={e => setOrganizationName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Appears on all official PDF approval certificates and receipt acknowledgements.
            </p>
          </div>
        </div>

        {/* Card 2: AI OCR Parameters */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Cpu className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">AI-Assisted OCR Engine Parameters</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Minimum Confidence Threshold ({ocrThreshold}%)
                </label>
                <span className="text-xs font-mono font-bold text-teal-700">{ocrThreshold}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={95}
                value={ocrThreshold}
                onChange={e => setOcrThreshold(parseInt(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Documents extracting below this threshold trigger an automatic "Low Confidence - Manual Scrutiny Mandatory" flag.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-800">Automated Intake Assignment</p>
                <p className="text-[11px] text-slate-400">
                  Instantly distribute newly submitted FDRs to available Regulation Bureau officers.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoAssignment}
                onChange={e => setAutoAssignment(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Maturity Intervals */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Bell className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Maturity Monitoring & Alerts</h3>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Configurable Reminder Milestones (Days before maturity)
            </label>
            <input
              type="text"
              required
              value={intervalsStr}
              onChange={e => setIntervalsStr(e.target.value)}
              placeholder="e.g. 90, 60, 30, 7"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Comma-separated integers. The portal scheduler generates in-app notifications as maturity approaches each milestone.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-navy-900 text-white font-semibold text-sm hover:bg-navy-800 shadow-sm transition-colors"
          >
            <Save className="w-4 h-4 text-teal-400" />
            <span>Save Portal Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
