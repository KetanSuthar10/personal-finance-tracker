import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { MilestoneBadge } from '../../components/common/MilestoneBadge';
import { CreditCard, CalendarClock, Split, AlertCircle } from 'lucide-react';

export const CommitmentsPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Credit Cards & EMI Plans</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Credit card statement balances, partial repayments, and EMI purchase scheduling.
          </p>
        </div>
        <MilestoneBadge milestone="M4" status="planned" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-600" />
            <CardTitle>Milestone 4 Roadmap: Cards & EMI Lifecycle</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-slate-600">
          <p>
            Scheduled for development in <strong className="text-slate-800">Milestone M4</strong> with complete accounting rigor:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                <CalendarClock className="w-4 h-4 text-indigo-600" />
                <span>Partial Repayments</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Track payments against statement totals, clearly revealing remaining dues and unbilled charges.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                <Split className="w-4 h-4 text-amber-600" />
                <span>EMI Conversion Lifecycle</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Recognise purchases once; link future principal instalments and finance charges without duplicate spending.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Deduplicated Cash Planning</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Instalments billed in a credit card statement are deduplicated to avoid reserving funds twice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
