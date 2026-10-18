import React, { useState } from 'react';
import { useLedger } from '../../context/LedgerContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { MilestoneBadge } from '../../components/common/MilestoneBadge';
import { Modal } from '../../components/ui/Modal';
import { validateAndParseBackup } from '../../domain/backup';
import {
  Download,
  Upload,
  Database,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileCode,
  KeyRound,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const {
    accounts,
    events,
    batches,
    emiPlans,
    exportBackup,
    restoreBackup,
    resetToDemo,
    isLoading,
  } = useLedger();

  const { user, ownerStatus, signOut, isConfigured } = useAuth();

  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [restoreValidation, setRestoreValidation] = useState<{
    isValid: boolean;
    error?: string;
    accountCount?: number;
    eventCount?: number;
    checksum?: string;
  } | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreErrorMsg, setRestoreErrorMsg] = useState<string | null>(null);

  // Handle Export Backup
  const handleExport = async () => {
    try {
      const jsonStr = await exportBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `personal-finance-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to generate export backup.');
    }
  };

  // Handle File Input for Restore
  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFileName(file.name);
    setRestoreErrorMsg(null);
    setRestoreSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setRestoreFileContent(content);

      const validation = validateAndParseBackup(content);
      if (validation.isValid && validation.payload) {
        setRestoreValidation({
          isValid: true,
          accountCount: validation.payload.data.accounts.length,
          eventCount: validation.payload.data.events.length,
          checksum: validation.payload.checksum,
        });
      } else {
        setRestoreValidation({
          isValid: false,
          error: validation.error,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!restoreFileContent || !restoreValidation?.isValid) return;

    try {
      const result = await restoreBackup(restoreFileContent);
      setRestoreSuccessMsg(
        `Successfully restored ${result.accountCount} accounts and ${result.eventCount} financial transactions!`
      );
      setRestoreModalOpen(false);
      setRestoreFileContent(null);
      setRestoreValidation(null);
    } catch (err: unknown) {
      setRestoreErrorMsg(err instanceof Error ? err.message : 'Restore failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Settings & Data Management</h2>
            <MilestoneBadge milestone="M3" status="live" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Local prototype state, versioned data export/restore, and production Supabase PostgreSQL architecture.
          </p>
        </div>
      </div>

      {/* Success / Error Notification */}
      {restoreSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{restoreSuccessMsg}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setRestoreSuccessMsg(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {restoreErrorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{restoreErrorMsg}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setRestoreErrorMsg(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Section 1: Backup & Restore (JSON) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-600" />
            <CardTitle>Data Backup & Disaster Recovery</CardTitle>
          </div>
          <Badge variant="success" size="sm">Schema v1.0 Compliant</Badge>
        </CardHeader>

        <CardContent className="space-y-4 text-xs text-slate-600">
          <p>
            Create versioned, checksum-validated JSON backups of your complete personal ledger. Exports preserve all accounts, transactions, double-entry postings, statement batches, and EMI plans.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Export Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
              <div>
                <span className="font-semibold text-slate-800 block text-sm">Export Ledger Backup</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Current state: {accounts.length} accounts, {events.length} transactions, {batches.length} statement batches, and {emiPlans.length} EMI plans.
                </p>
              </div>
              <Button size="sm" onClick={handleExport} className="w-full sm:w-auto self-start">
                <Download className="w-4 h-4 mr-1.5" />
                Download Backup (JSON)
              </Button>
            </div>

            {/* Restore Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
              <div>
                <span className="font-semibold text-slate-800 block text-sm">Restore from Backup</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Restores verified backup files with automatic checksum and referential integrity validation.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRestoreModalOpen(true)}
                className="w-full sm:w-auto self-start"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Upload & Restore
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Storage Architecture & Supabase Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <CardTitle>Storage Mode & PostgreSQL Cloud Sync</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 text-xs text-slate-600">
          {/* Active Supabase Connection Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">Supabase Cloud Database & Auth</span>
                  <Badge variant={isConfigured ? 'indigo' : 'neutral'} size="sm">
                    {isConfigured ? 'Connected' : 'Unconfigured'}
                  </Badge>
                  {user && (
                    <Badge variant="indigo" size="sm" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <UserCheck className="w-3 h-3 text-emerald-600 mr-1" />
                      Session Active
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Database URL:{' '}
                  <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">
                    {import.meta.env.VITE_SUPABASE_URL || 'Not configured'}
                  </code>
                </p>
              </div>

              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-rose-600 hover:bg-rose-50 border-rose-200 self-start sm:self-auto"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Sign Out
                </Button>
              )}
            </div>

            {user && (
              <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                  <span className="text-slate-400 block font-medium">Authenticated Account</span>
                  <span className="font-semibold text-slate-800">{user.email}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                  <span className="text-slate-400 block font-medium">User UUID (Auth Authority)</span>
                  <span className="font-mono text-slate-700 truncate block" title={user.id}>{user.id}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/70 sm:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block font-medium">Owner Authorization State</span>
                    <span className="font-medium text-slate-800">
                      {ownerStatus?.ownerConfigured
                        ? ownerStatus.isOwner
                          ? 'Server-Verified Owner (Active)'
                          : 'Unauthorized Sign-in'
                        : 'Initial Setup Pending in Supabase'}
                    </span>
                  </div>
                  <Badge variant={ownerStatus?.isOwner ? 'indigo' : 'neutral'} size="sm">
                    {ownerStatus?.isOwner ? 'Authorized' : 'Pending'}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Local Ledger Reset Action */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">Local State & Fixture Reset</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Financial records use strict integer paise arithmetic. Resetting reinstates the bundled demo fixture.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDemo}
              isLoading={isLoading}
              className="text-slate-600 self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Demo State
            </Button>
          </div>

          {/* Production Migration Roadmap */}
          <div className="pt-2 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
              Supabase Production Architecture (Milestone M3 Ready)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <FileCode className="w-4 h-4 text-indigo-600" />
                  <span>Migration Script</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Ready in <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">supabase/migrations/</code> with complete tables and constraints.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Row-Level Security</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Enforces strict database policies: only the authenticated user (<code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">auth.uid() = user_id</code>) can access financial rows.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Google OAuth</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Designed for single-owner allowlisting without exposing service-role keys in browser bundles.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Modal */}
      <Modal
        isOpen={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        title="Restore Ledger from Backup File"
        description="Select a valid JSON backup file to reinstate your financial state"
        maxWidth="md"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Choose Backup File (.json)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFileSelected}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>

          {/* Validation Result */}
          {restoreValidation && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                restoreValidation.isValid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {restoreValidation.isValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Backup File Validated Successfully</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Backup Validation Error</span>
                  </>
                )}
              </div>

              {restoreValidation.isValid ? (
                <div className="text-[11px] space-y-1">
                  <p>• File: <span className="font-mono font-medium">{restoreFileName}</span></p>
                  <p>• Accounts: <strong className="font-bold">{restoreValidation.accountCount}</strong></p>
                  <p>• Transactions: <strong className="font-bold">{restoreValidation.eventCount}</strong></p>
                  <p>• Checksum: <span className="font-mono">{restoreValidation.checksum}</span> (Verified)</p>
                </div>
              ) : (
                <p className="text-[11px]">{restoreValidation.error}</p>
              )}
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRestoreModalOpen(false);
                setRestoreValidation(null);
                setRestoreFileContent(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!restoreValidation?.isValid}
              onClick={handleConfirmRestore}
            >
              Confirm Restore
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
