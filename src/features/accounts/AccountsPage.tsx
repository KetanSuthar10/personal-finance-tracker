import React from 'react';
import { useLedger } from '../../context/LedgerContext';
import { AccountCard } from './AccountCard';
import { MoneyDisplay } from '../../components/common/MoneyDisplay';
import { Landmark, ShieldAlert } from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const { accounts, summary, isLoading } = useLedger();

  if (isLoading || !summary) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const assetAccounts = accounts.filter((a) => a.type === 'bank' || a.type === 'cash');
  const cardAccounts = accounts.filter((a) => a.type === 'card');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Configured Accounts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real balances derived from verified opening positions and accepted transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block uppercase">Liquid Assets</span>
            <MoneyDisplay paise={summary.liquid_funds_paise} size="md" variant="success" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block uppercase">Card Liabilities</span>
            <MoneyDisplay paise={summary.card_outstanding_paise} size="md" variant="danger" />
          </div>
        </div>
      </div>

      {/* Asset Accounts Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-800">Liquid Accounts (Bank & Cash)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assetAccounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              closingPositionPaise={summary.closing_positions_paise[acc.id] ?? 0}
            />
          ))}
        </div>
      </div>

      {/* Credit Card Accounts Grid */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-slate-800">Credit Cards & Liabilities</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardAccounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              closingPositionPaise={summary.closing_positions_paise[acc.id] ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
