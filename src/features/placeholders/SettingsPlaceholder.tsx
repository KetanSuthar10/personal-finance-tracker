import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { MilestoneBadge } from '../../components/common/MilestoneBadge';
import { Settings, Database, KeyRound, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useLedger } from '../../context/LedgerContext';

export const SettingsPlaceholder: React.FC = () => {
  const { resetToDemo, isLoading } = useLedger();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Settings & Persistence</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Local prototype state management and future Supabase connected storage.
          </p>
        </div>
        <MilestoneBadge milestone="M3" status="planned" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600" />
            <CardTitle>Current Prototype Storage</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">Browser Local Storage</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Financial records and newly added entries are saved locally in browser state.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={resetToDemo} isLoading={isLoading}>
              Reset Demo Fixture
            </Button>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
              Milestone 3 Roadmap: Supabase PostgreSQL & Auth
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <Database className="w-4 h-4 text-indigo-600 mb-1" />
                <p className="font-medium text-slate-800">Row-Level Security</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Database policies strictly enforce individual user-ownership on all financial records.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <KeyRound className="w-4 h-4 text-emerald-600 mb-1" />
                <p className="font-medium text-slate-800">Google OAuth</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Secure sign-in with server-side allowlisting for the owner account.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <Download className="w-4 h-4 text-amber-600 mb-1" />
                <p className="font-medium text-slate-800">Export & Restore</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Versioned JSON export and validated restore for disaster recovery.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
