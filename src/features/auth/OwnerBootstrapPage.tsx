import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, CheckCircle2, AlertCircle, Loader2, LogOut, Terminal } from 'lucide-react';

export const OwnerBootstrapPage: React.FC = () => {
  const { user, signOut, bootstrapOwner } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClaimOwnership = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await bootstrapOwner();
      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to claim owner authorization');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mb-4 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Instance Owner Enrollment
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Your Supabase database is connected, but no master owner has been enrolled yet.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Ownership claimed successfully! Transitioning to your ledger...</span>
          </div>
        ) : (
          <>
            <div className="my-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Authenticated Email:</span>
                <span className="font-medium text-slate-200">{user?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Authenticated UUID:</span>
                <span className="font-mono text-slate-400 text-[11px] truncate max-w-[220px]">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Instance Authority:</span>
                <span className="font-semibold text-amber-400">Unconfigured (Awaiting Bootstrap)</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              To lock this instance to your account, click <strong>"Enroll as Instance Owner"</strong> below.
              The server will permanently register your UUID in <code className="bg-slate-800 px-1 py-0.5 rounded text-[11px]">app_owner_config</code> and forbid any other user from claiming ownership.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleClaimOwnership}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm transition-all duration-150 shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enrolling Owner...</span>
                  </>
                ) : (
                  <span>Enroll as Instance Owner</span>
                )}
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

            {/* Alternative Manual SQL bootstrap */}
            <div className="mt-6 pt-5 border-t border-slate-800 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 font-medium text-slate-400 mb-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Manual Dashboard Bootstrap SQL</span>
              </div>
              <p className="mb-2">You can also enroll manually by executing this query in your Supabase SQL Editor:</p>
              <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono text-indigo-300 overflow-x-auto select-all">
                {`INSERT INTO public.app_owner_config (id, owner_user_id, owner_email)\nVALUES (1, '${user?.id}', '${user?.email}');`}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
