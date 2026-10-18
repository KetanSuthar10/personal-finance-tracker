import React, { useState } from 'react';
import { useLedger } from '../../context/LedgerContext';
import { AccountCard } from './AccountCard';
import { MoneyDisplay } from '../../components/common/MoneyDisplay';
import { Button } from '../../components/ui/Button';
import { AddAccountModal } from './AddAccountModal';
import { EditAccountModal } from './EditAccountModal';
import { Account } from '../../domain/types';
import { Landmark, ShieldAlert, Plus, WalletCards } from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const { accounts, statements, summary, isLoading } = useLedger();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const latestStatementByAccount = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of statements) {
      const prev = map.get(s.account_id);
      if (!prev || s.statement_date > prev) {
        map.set(s.account_id, s.statement_date);
      }
    }
    return map;
  }, [statements]);

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
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Configured Accounts</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real balances derived from verified opening positions and accepted transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block uppercase">Liquid Assets</span>
            <MoneyDisplay paise={summary.liquid_funds_paise} size="md" variant="success" />
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block uppercase">Card Liabilities</span>
            <MoneyDisplay paise={summary.card_outstanding_paise} size="md" variant="danger" />
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Add Account</span>
          </Button>
        </div>
      </div>

      {/* Empty State when no accounts exist yet (F18) */}
      {accounts.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 max-w-lg mx-auto my-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-1">
            <WalletCards className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No accounts configured yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your personal finance tracker starts empty. Configure your primary bank account, cash wallet, or credit card to begin recording financial entries.
          </p>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="shadow-sm mt-2"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Set Up First Account</span>
          </Button>
        </div>
      ) : (
        <>
          {/* Asset Accounts Grid */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Liquid Accounts (Bank & Cash)</h3>
            </div>
            {assetAccounts.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No liquid asset accounts configured.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assetAccounts.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    closingPositionPaise={summary.closing_positions_paise[acc.id] ?? 0}
                    latestStatementDate={latestStatementByAccount.get(acc.id)}
                    onEdit={(a) => setEditingAccount(a)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Credit Card Accounts Grid */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Credit Cards & Liabilities</h3>
            </div>
            {cardAccounts.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No credit card accounts configured.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cardAccounts.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    closingPositionPaise={summary.closing_positions_paise[acc.id] ?? 0}
                    latestStatementDate={latestStatementByAccount.get(acc.id)}
                    onEdit={(a) => setEditingAccount(a)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Edit Account Modal */}
      <EditAccountModal
        isOpen={editingAccount !== null}
        onClose={() => setEditingAccount(null)}
        account={editingAccount}
      />
    </div>
  );
};
