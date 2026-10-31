import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your current account role ({user?.role || 'Guest'}) does not have permission to view this regulatory section.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
