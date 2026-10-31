import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { db } from '@/db/dexie';
import { formatDateTime } from '@/utils/formatters';
import { Building2, Lock, Shield, CheckCircle2, User, Mail, Phone, MapPin, Key } from 'lucide-react';
import type { Institution } from '@/types';

export const InstitutionProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const [inst, setInst] = useState<Institution | null>(null);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    async function loadInstitution() {
      if (user?.institutionId) {
        const data = await db.institutions.get(user.institutionId);
        if (data) setInst(data);
      }
    }
    loadInstitution();
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPassMessage(null);

    if (newPassword !== confirmPassword) {
      setPassMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    try {
      setIsChangingPass(true);
      await authService.changePassword(user.id, oldPassword, newPassword);
      setPassMessage({ type: 'success', text: 'Password successfully changed and updated in database.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassMessage({ type: 'error', text: err.message || 'Password update failed.' });
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Institutional Profile & Security</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review accredited institution details and manage portal access credentials
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <Building2 className="w-5 h-5 text-navy-900" />
          <h3 className="text-sm font-bold text-slate-900">Institution Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Institution Code:</span>
            <span className="font-mono font-bold text-navy-900 text-sm">{inst?.code || 'AICTE-INST-101'}</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Approval Year:</span>
            <span className="font-semibold text-slate-800">{inst?.approvalYear || 2012}</span>
          </div>

          <div className="sm:col-span-2">
            <span className="text-slate-400 block mb-0.5">Institution Name:</span>
            <span className="font-bold text-slate-900 text-sm">{inst?.name || user?.institutionName}</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Campus Region:</span>
            <span className="font-semibold text-slate-800">{inst?.region} ({inst?.state})</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">City & Address:</span>
            <span className="text-slate-700">{inst?.address || inst?.city}</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Nodal Contact Person:</span>
            <span className="font-semibold text-slate-800">{inst?.contactPerson || user?.name}</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Official Email:</span>
            <span className="font-mono text-slate-700">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Password Change Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <Key className="w-5 h-5 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-900">Update Portal Password</h3>
        </div>

        {passMessage && (
          <div
            className={`p-3 rounded-lg mb-4 text-xs flex items-center gap-2 ${
              passMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {passMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <Shield className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{passMessage.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (Min 6 chars)</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPass}
            className="px-5 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isChangingPass ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
