import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { DEMO_PASSWORD } from '@/db/seed';
import { Shield, Lock, Mail, ArrowRight, Building2, UserCheck, Award, Info, AlertCircle } from 'lucide-react';
import type { UserRole } from '@/types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, quickSwitchRole, error, clearError, isLoading } = useAuthStore();

  const [email, setEmail] = useState('institution@nidhi.local');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    try {
      const user = await login(email, password);
      redirectByRole(user.role);
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed');
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setLocalError(null);
    clearError();
    try {
      const user = await quickSwitchRole(role);
      redirectByRole(user.role);
    } catch (err: any) {
      setLocalError(err.message || 'Demo switch failed');
    }
  };

  const redirectByRole = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        navigate('/admin');
        break;
      case 'INSTITUTION':
        navigate('/institution');
        break;
      case 'OFFICER':
        navigate('/officer');
        break;
      case 'AUTHORITY':
        navigate('/authority');
        break;
      default:
        navigate('/');
        break;
    }
  };

  const demoAccounts = [
    { role: 'ADMIN' as const, label: 'System Admin', email: 'admin@nidhi.local', icon: Shield, color: 'hover:border-purple-300 hover:bg-purple-50/50' },
    { role: 'INSTITUTION' as const, label: 'Institution', email: 'institution@nidhi.local', icon: Building2, color: 'hover:border-blue-300 hover:bg-blue-50/50' },
    { role: 'OFFICER' as const, label: 'Regulation Officer', email: 'officer@nidhi.local', icon: UserCheck, color: 'hover:border-teal-300 hover:bg-teal-50/50' },
    { role: 'AUTHORITY' as const, label: 'Competent Authority', email: 'authority@nidhi.local', icon: Award, color: 'hover:border-amber-300 hover:bg-amber-50/50' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 selection:bg-teal-500 selection:text-white">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-400 font-extrabold text-3xl shadow-xl shadow-teal-950/40 mb-4">
          नि
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">NIDHI</h1>
        <p className="mt-1 text-xs text-teal-400 font-semibold uppercase tracking-widest">
          AICTE • Smart India Hackathon 2026 (SIH26265)
        </p>
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
          AI-Assisted Security Deposit & FDR Lifecycle Management Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white text-slate-900 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select a role below or enter registered credentials</p>
          </div>

          {(localError || error) && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Quick Demo Role Selector Pills */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Quick Demo Access (1-Click Login)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {demoAccounts.map(demo => {
                const Icon = demo.icon;
                return (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleQuickDemo(demo.role)}
                    className={`flex flex-col text-left p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 transition-all ${demo.color}`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Icon className="w-3.5 h-3.5 text-teal-600" />
                      <span>{demo.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate font-mono mt-0.5">{demo.email}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                Or Sign in with password
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@nidhi.local"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <span className="text-[11px] text-slate-400">Default demo: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">{DEMO_PASSWORD}</code></span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-900 transition-colors disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Security & Prototype Architecture Notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg">
            <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-700">Architecture Notice:</span> This local prototype stores all records and document Blobs securely in IndexedDB with Web Crypto SHA-256 password hashing. Production deployment requires server-enforced JWT and HSM keys.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
