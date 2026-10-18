import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';

export const AccessDeniedPage: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-slate-900/90 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/40 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-5">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Access Restricted
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          This Personal Finance Tracker instance is locked to a single authorized owner.
        </p>

        <div className="my-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-left text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Signed in as:</span>
            <span className="font-medium text-slate-200">{user?.email || 'Authenticated User'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">User UUID:</span>
            <span className="font-mono text-slate-400 text-[11px] truncate max-w-[200px]">{user?.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Authorization:</span>
            <span className="font-semibold text-rose-400">Non-owner (Denied)</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          Under strict financial isolation policies (acceptance test AT13), non-owner sign-ins cannot view, query, or write financial events.
        </p>

        <button
          type="button"
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all duration-150 shadow-lg shadow-rose-600/30 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
