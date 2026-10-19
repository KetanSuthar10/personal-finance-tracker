import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldX, RefreshCw, LogOut, AlertTriangle } from 'lucide-react';

export const AuthErrorPage: React.FC = () => {
  const { ownerStatus, signOut, checkOwnerStatus } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-slate-900/90 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/40 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-5">
          <ShieldX className="w-8 h-8" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Authorization Verification Error
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          The database server could not verify your owner authorization status.
        </p>

        <div className="my-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs text-left space-y-1.5 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-rose-300">Server Response</span>
            <span className="text-[11px] leading-relaxed block break-words">
              {ownerStatus?.errorMessage || 'RPC get_current_user_status failed or timed out.'}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          Under financial data protection invariants, when owner verification cannot be confirmed with the server, access fails closed.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => checkOwnerStatus()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all duration-150 shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Verification</span>
          </button>

          <button
            type="button"
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-all duration-150 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
