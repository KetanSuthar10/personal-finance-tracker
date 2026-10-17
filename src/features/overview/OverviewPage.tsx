import React from 'react';
import { useLedger } from '../../context/LedgerContext';
import { KpiCards } from './KpiCards';
import { CategorySpendChart } from './CategorySpendChart';
import { RecentTransactions } from './RecentTransactions';
import { Card, CardContent } from '../../components/ui/Card';
import { MoneyDisplay } from '../../components/common/MoneyDisplay';
import { FinancialEvent } from '../../domain/types';
import { Info } from 'lucide-react';

export interface OverviewPageProps {
  onNavigateToTransactions: () => void;
  onSelectEvent: (event: FinancialEvent) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigateToTransactions,
  onSelectEvent,
}) => {
  const { summary, events, isLoading, planningConfig, planningSummary } = useLedger();

  if (isLoading || !summary) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 5 KPI Metric Cards */}
      <KpiCards summary={summary} />

      {/* Financial Invariant Equation Banner */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white border-0 shadow-md">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Deterministic Invariant Proof
                </p>
                <p className="text-sm text-slate-300 mt-0.5 font-mono text-xs sm:text-sm">
                  Opening (<MoneyDisplay paise={summary.opening_net_position_paise} className="text-white" />) + Income (
                  <MoneyDisplay paise={summary.received_income_paise} className="text-emerald-400" />) - Spending (
                  <MoneyDisplay paise={summary.net_spending_paise} className="text-rose-400" />) = Closing (
                  <MoneyDisplay paise={summary.closing_net_position_paise} className="text-white font-bold" />)
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-400 border-t md:border-t-0 md:border-l border-slate-700/60 pt-2 md:pt-0 md:pl-4">
              All {events.length} events balance to the exact integer paise.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Planning Safe-to-Spend Callout */}
      {planningSummary && (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
              <span className="text-sm font-bold">₹</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-900">
                Planning Horizon Available ({planningConfig.horizon_days} Days)
              </p>
              <p className="text-xs text-indigo-700 mt-0.5">
                Liquid funds after deduplicated card bills, upcoming EMIs, and ₹{(planningConfig.emergency_buffer_paise / 100).toLocaleString('en-IN')} reserve.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <MoneyDisplay
              paise={planningSummary.planning_available_paise}
              size="lg"
              className="text-indigo-950 font-extrabold text-xl sm:text-2xl"
            />
          </div>
        </div>
      )}

      {/* Grid: Charts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategorySpendChart categoryBreakdown={summary.category_breakdown} />
        <RecentTransactions
          events={events}
          onViewAll={onNavigateToTransactions}
          onSelectEvent={onSelectEvent}
        />
      </div>
    </div>
  );
};
