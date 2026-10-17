import React, { useState } from 'react';
import { useLedger } from '../../context/LedgerContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { MilestoneBadge } from '../../components/common/MilestoneBadge';
import { MoneyDisplay } from '../../components/common/MoneyDisplay';
import { parseCsvText, extractStatementRows } from '../../domain/importer';
import { reconcileImportCandidates, applyImportBatch } from '../../domain/reconciliation';
import { ImportRowCandidate } from '../../domain/types';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  PlusCircle,
  History,
} from 'lucide-react';

// Sample synthetic statement CSVs embedded for instant local test loading
const SAMPLE_BANK_CSV = `Date,Narration,Chq_Ref_No,Withdrawal_Debit,Deposit_Credit,Balance
01/10/2026,ACH CR-DEMO CORP-SALARY-OCT26,REF99201,,5000.00,6000.00
03/10/2026,POS 4128 SAMPLE CAFE NEW DELHI,TXN44810,120.00,,5880.00
07/10/2026,AUTOPAY DEBIT TO DEMO CREDIT CARD,AUTO1029,300.00,,5580.00
08/10/2026,ATM CASH WDL-MAIN BRANCH NEW DELHI,ATM8812,100.00,,5480.00
10/10/2026,UPI-DEMO CLIENT-PROJECT ADVANCE,UPI99120,,1000.00,6480.00
15/10/2026,BILLPAY BSES RAJDHANI POWER LTD,BP10294,35.00,,6445.00
16/10/2026,NEFT INWARD-ADVISORY RETAINER,NEFT3091,,250.00,6695.00`;

const SAMPLE_CARD_CSV = `Date,Description,Reference_Number,Amount_Debit,Amount_Credit
05/10/2026,SAMPLE GROCERY STORE NEW DELHI,REF88190,800.00,
07/10/2026,PAYMENT RECEIVED - THANK YOU,PAY99120,,300.00
12/10/2026,REFUND - SAMPLE GROCERY STORE,REF88190R,,100.00
14/10/2026,ANNUAL CARD MEMBERSHIP FEE,FEE10294,20.00,
16/10/2026,ONLINE ELECTRONICS STORE GADGET,TXN99201,150.00,`;

export const ImportsPage: React.FC = () => {
  const { accounts, events, batches, commitImportBatch, undoImportBatch } = useLedger();

  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || 'demo-bank');
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [candidates, setCandidates] = useState<ImportRowCandidate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ newCount: number; mergedCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const handleProcessCsv = (text: string, name: string) => {
    setError(null);
    setImportResult(null);
    try {
      setCsvContent(text);
      setFilename(name);
      const parsedData = parseCsvText(text);
      const rawRows = extractStatementRows(parsedData);
      const reconciled = reconcileImportCandidates(selectedAccount, events, rawRows);
      setCandidates(reconciled);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to parse statement CSV.');
      }
      setCandidates([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      handleProcessCsv(text, file.name);
    };
    reader.readAsText(file);
  };

  const loadSample = (type: 'bank' | 'card') => {
    if (type === 'bank') {
      setSelectedAccountId('demo-bank');
      handleProcessCsv(SAMPLE_BANK_CSV, 'synthetic-bank-statement.csv');
    } else {
      setSelectedAccountId('demo-card');
      handleProcessCsv(SAMPLE_CARD_CSV, 'synthetic-card-statement.csv');
    }
  };

  const handleCommit = async () => {
    if (candidates.length === 0 || !selectedAccount) return;

    setIsProcessing(true);
    try {
      const batchId = `batch-${Date.now()}`;
      const destAccount = accounts.find((a) => a.id !== selectedAccount.id);

      const result = applyImportBatch(
        batchId,
        filename,
        selectedAccount,
        destAccount,
        candidates,
        events
      );

      await commitImportBatch(result.batch, result.newEvents, result.updatedEvents);

      setImportResult({
        newCount: result.newEvents.length,
        mergedCount: result.updatedEvents.length,
      });

      // Clear staged candidates
      setCandidates([]);
      setCsvContent(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to commit import batch.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = async (batchId: string) => {
    if (window.confirm('Are you sure you want to rollback this imported batch? Only transactions solely created by this file will be removed.')) {
      await undoImportBatch(batchId);
    }
  };

  const newCount = candidates.filter((c) => c.match_status === 'NEW_RECORD').length;
  const mergedCount = candidates.filter((c) => c.match_status === 'EXACT_MATCH').length;
  const duplicateCount = candidates.filter((c) => c.match_status === 'DUPLICATE_IMPORT').length;
  const uncertainCount = candidates.filter((c) => c.match_status === 'UNCERTAIN_MATCH').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Statements & Daily Reconciliation</h2>
            <MilestoneBadge milestone="M2" status="live" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingest monthly statements, reconcile with daily entries, and eliminate duplicate expense inflation.
          </p>
        </div>

        {/* Quick Sample Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSample('bank')}
            className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Load Sample Bank CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSample('card')}
            className="text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Load Sample Card CSV
          </Button>
        </div>
      </div>

      {/* Success Receipt Banner */}
      {importResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Statement Batch Imported Successfully!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Created <strong className="font-bold">{importResult.newCount}</strong> new financial events. Reconciled and linked{' '}
                <strong className="font-bold">{importResult.mergedCount}</strong> existing manual entries with zero duplicate inflation.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setImportResult(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-xs text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            <CardTitle>Step 1: Choose Account & File</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Target Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  if (csvContent && filename) {
                    handleProcessCsv(csvContent, filename);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-600"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} ({a.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Upload Statement File (.csv)
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Extraction Preview & Matching Review */}
      {candidates.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <CardTitle>Step 2: Extraction Preview & Reconciliation ({candidates.length} Rows)</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCandidates([])}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCommit} isLoading={isProcessing}>
                  Confirm & Commit Batch
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Reconciliation KPI Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    Merged With Manual
                  </span>
                  <p className="text-lg font-bold text-emerald-800">{mergedCount}</p>
                </div>
                <LinkIcon className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                    New Events
                  </span>
                  <p className="text-lg font-bold text-blue-800">{newCount}</p>
                </div>
                <PlusCircle className="w-4 h-4 text-blue-600" />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Already Imported
                  </span>
                  <p className="text-lg font-bold text-slate-800">{duplicateCount}</p>
                </div>
                <RotateCcw className="w-4 h-4 text-slate-500" />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                    Requires Review
                  </span>
                  <p className="text-lg font-bold text-amber-800">{uncertainCount}</p>
                </div>
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
            </div>

            {/* Candidate Rows Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Ref No</th>
                    <th className="py-2.5 px-3 text-right">Debit / Credit</th>
                    <th className="py-2.5 px-3">Inferred Role</th>
                    <th className="py-2.5 px-3">Reconciliation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{c.date}</td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={c.description}>
                        {c.description}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{c.ref_no || '—'}</td>
                      <td className="py-2.5 px-3 text-right">
                        {c.debit_paise > 0 ? (
                          <MoneyDisplay paise={-c.debit_paise} size="sm" variant="danger" />
                        ) : (
                          <MoneyDisplay paise={c.credit_paise} size="sm" variant="success" showSign />
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="indigo" size="sm">
                            {c.inferred_type}
                          </Badge>
                          {c.inferred_category && (
                            <span className="text-slate-500 text-[11px] font-medium">• {c.inferred_category}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {c.match_status === 'EXACT_MATCH' ? (
                          <div className="flex items-center gap-1 text-emerald-700 font-medium">
                            <LinkIcon className="w-3.5 h-3.5" />
                            <span>Matches Manual Entry</span>
                          </div>
                        ) : c.match_status === 'DUPLICATE_IMPORT' ? (
                          <div className="flex items-center gap-1 text-slate-500 font-medium">
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Already Imported</span>
                          </div>
                        ) : c.match_status === 'UNCERTAIN_MATCH' ? (
                          <div className="flex items-center gap-1 text-amber-700 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Ambiguous Match</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-blue-700 font-medium">
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>New Entry</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Import History & Reversible Batches */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <CardTitle>Import History & Provenance ({batches.length} Batches)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No statement batches imported yet. Upload a CSV or click one of the sample loaders above.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {batches.map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{b.filename}</span>
                      <Badge variant={b.status === 'active' ? 'success' : 'neutral'} size="sm">
                        {b.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-slate-400 mt-0.5">
                      Account: <span className="text-slate-600 font-medium">{b.account_id}</span> •{' '}
                      {b.created_event_ids.length} created • {b.merged_event_ids.length} merged • {new Date(b.imported_at).toLocaleString('en-IN')}
                    </p>
                  </div>

                  {b.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUndo(b.id)}
                      className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Undo Batch
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
