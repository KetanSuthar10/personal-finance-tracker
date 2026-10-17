import React from 'react';
import { Account } from '../../domain/types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { MoneyDisplay } from '../../components/common/MoneyDisplay';
import { Badge } from '../../components/ui/Badge';
import { Landmark, Wallet, CreditCard } from 'lucide-react';

export interface AccountCardProps {
  account: Account;
  closingPositionPaise: number;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, closingPositionPaise }) => {
  const isCard = account.type === 'card';
  const deltaPaise = closingPositionPaise - account.opening_position_paise;

  const getAccountIcon = () => {
    switch (account.type) {
      case 'bank':
        return <Landmark className="w-5 h-5 text-indigo-600" />;
      case 'cash':
        return <Wallet className="w-5 h-5 text-emerald-600" />;
      case 'card':
        return <CreditCard className="w-5 h-5 text-amber-600" />;
    }
  };

  const getAccountBadge = () => {
    switch (account.type) {
      case 'bank':
        return <Badge variant="indigo" size="sm">Bank Asset</Badge>;
      case 'cash':
        return <Badge variant="success" size="sm">Cash Asset</Badge>;
      case 'card':
        return <Badge variant="warning" size="sm">Credit Liability</Badge>;
    }
  };

  return (
    <Card className="hover:border-slate-300 transition-colors">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100">{getAccountIcon()}</div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>{account.label}</CardTitle>
              {account.masked_suffix && (
                <span className="text-xs font-mono text-slate-400">{account.masked_suffix}</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">As-of {account.opening_date}</p>
          </div>
        </div>
        {getAccountBadge()}
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {isCard ? 'Outstanding Balance' : 'Current Balance'}
          </span>
          <div className="mt-1">
            {isCard ? (
              closingPositionPaise < 0 ? (
                <MoneyDisplay
                  paise={Math.abs(closingPositionPaise)}
                  size="xl"
                  variant="danger"
                />
              ) : closingPositionPaise > 0 ? (
                <div className="flex items-center gap-2">
                  <MoneyDisplay paise={closingPositionPaise} size="xl" variant="success" />
                  <Badge variant="success" size="sm">Overpaid</Badge>
                </div>
              ) : (
                <MoneyDisplay paise={0} size="xl" />
              )
            ) : (
              <MoneyDisplay paise={closingPositionPaise} size="xl" />
            )}
          </div>
        </div>

        {/* Ledger Breakdown Details */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400">Opening Position:</span>
            <div className="font-medium text-slate-700 mt-0.5">
              <MoneyDisplay paise={account.opening_position_paise} size="sm" />
            </div>
          </div>
          <div>
            <span className="text-slate-400">Net Movement:</span>
            <div className="font-medium mt-0.5">
              <MoneyDisplay
                paise={deltaPaise}
                size="sm"
                showSign
                variant={deltaPaise > 0 ? 'success' : deltaPaise < 0 ? 'danger' : 'neutral'}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
