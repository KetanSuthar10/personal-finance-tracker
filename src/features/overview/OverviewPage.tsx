import React from 'react';
import { useLedger } from '../../context/LedgerContext';
import { KpiCards } from './KpiCards';
import { CategorySpendChart } from './CategorySpendChart';
import { RecentTransactions } from './RecentTransactions';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MoneyDisplay } from '../../components/common/MoneyDisplay';
import { FinancialEvent } from '../../domain/types';
import { CheckCircle2, WalletCards } from 'lucide-react';

export interface OverviewPageProps {
  onNavigateToTransactions: () => void;
  onNavigateToAccounts?: () => void;
  onSelectEvent: (event: FinancialEvent) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigateToTransactions,
  onNavigateToAccounts,
  onSelectEvent,
}) => {
  const { accounts, summary, events, isLoading, planningConfig, planningSummary } = useLedger();

  if (isLoading || !summary) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Onboarding Welcome Banner if no accounts configured yet (F18) */}
      {accounts.length === 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-800/50">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
              <WalletCards className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Welcome to your connected personal finance tracker
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Your database is empty and ready. Set up your bank, cash, or credit card accounts to start tracking your financial position.
              </p>
            </div>
          </div>
          {onNavigateToAccounts && (
            <Button
              size="sm"
              onClick={onNavigateToAccounts}
              className="bg-white text-indigo-900 hover:bg-slate-100 font-semibold shrink-0 shadow-sm cursor-pointer"
            >
              Configure Accounts
            </Button>
          )}
        </div>
      )}

      {/* 5 KPI Metric Cards */}
      <KpiCards summary={summary} />

      {/* Financial Accounting Equation Banner */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white border-0 shadow-md">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Reconciled Period Accounting
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
              Deterministic balance across {events.length} records.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Planning Safe-to-Spend Callout */}
      {planningSummary && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
              <span className="text-sm font-bold">₹</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                Planning Horizon Available ({planningConfig.horizon_days} Days)
              </p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                Liquid funds after card obligations, upcoming EMIs, and ₹{(planningConfig.emergency_buffer_paise / 100).toLocaleString('en-IN')} emergency buffer.
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
