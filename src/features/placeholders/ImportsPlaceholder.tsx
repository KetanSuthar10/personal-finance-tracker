import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { MilestoneBadge } from '../../components/common/MilestoneBadge';
import { FileSpreadsheet, CheckCircle2, ShieldCheck, FileCheck } from 'lucide-react';

export const ImportsPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Statements & File Imports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated PDF, CSV, and XLSX statement parsing with provenance and deduplication.
          </p>
        </div>
        <MilestoneBadge milestone="M2" status="planned" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <CardTitle>Milestone 2 Roadmap: Import Architecture</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-slate-600">
          <p>
            In accordance with <strong className="text-slate-800">docs/PRD.md</strong>, file parsing will be built one verified layout at a time to guarantee zero duplicate inflation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Deterministic Deduplication</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Re-importing the same statement will never duplicate canonical spending or income events.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Daily & Statement Reconciliation</span>
              </div>
              <p className="text-[11px] text-slate-500">
                A manually entered cafe expense and its later statement row merge into one event with both sources preserved.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                <span>Reversible Batch Imports</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Every imported batch can be reviewed and rolled back cleanly without deleting manual transactions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
