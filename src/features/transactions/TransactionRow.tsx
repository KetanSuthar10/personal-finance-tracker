import React from 'react';
import { FinancialEvent, Account } from '../../domain/types';
import { MoneyDisplay } from '../../components/common/MoneyDisplay';
import { Badge } from '../../components/ui/Badge';
import { ShoppingBag, ArrowUpRight, RotateCcw, CreditCard, ArrowLeftRight, ChevronRight } from 'lucide-react';

export interface TransactionRowProps {
  event: FinancialEvent;
  accounts: Account[];
  onSelect: (event: FinancialEvent) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ event, accounts, onSelect }) => {
  const getAccountLabel = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    return acc ? acc.label : id;
  };

  const getEventBadge = (type: FinancialEvent['type']) => {
    switch (type) {
      case 'income':
        return <Badge variant="success" size="sm">Income</Badge>;
      case 'purchase':
        return <Badge variant="neutral" size="sm">Purchase</Badge>;
      case 'refund':
        return <Badge variant="indigo" size="sm">Refund</Badge>;
      case 'card_payment':
        return <Badge variant="warning" size="sm">Card Payment</Badge>;
      case 'own_transfer':
        return <Badge variant="neutral" size="sm">Transfer</Badge>;
      case 'fee':
        return <Badge variant="danger" size="sm">Fee</Badge>;
      default:
        return null;
    }
  };

  const getEventIcon = (type: FinancialEvent['type']) => {
    switch (type) {
      case 'income':
        return <ArrowUpRight className="w-4 h-4 text-emerald-600" />;
      case 'refund':
        return <RotateCcw className="w-4 h-4 text-indigo-600" />;
      case 'card_payment':
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      case 'own_transfer':
        return <ArrowLeftRight className="w-4 h-4 text-slate-600" />;
      default:
        return <ShoppingBag className="w-4 h-4 text-slate-600" />;
    }
  };

  const displayPaise =
    event.type === 'income'
      ? event.income_paise
      : event.type === 'purchase' || event.type === 'fee'
      ? -event.spending_paise
      : event.type === 'refund'
      ? Math.abs(event.spending_paise)
      : Math.abs(event.postings[0]?.delta_paise || 0);

  return (
    <div
      onClick={() => onSelect(event)}
      className="group flex items-center justify-between p-3.5 sm:px-5 hover:bg-slate-50/80 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0"
    >
      {/* Left: Icon & Description */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-slate-100 group-hover:bg-white group-hover:shadow-xs transition-all">
          {getEventIcon(event.type)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {event.recipient}
            </span>
            {getEventBadge(event.type)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span>{event.date}</span>
            <span>•</span>
            <span>
              {event.postings.length > 1
                ? `${getAccountLabel(event.postings[0].account_id)} → ${getAccountLabel(event.postings[1].account_id)}`
                : getAccountLabel(event.postings[0]?.account_id)}
            </span>
            {event.category && (
              <>
                <span>•</span>
                <span className="text-slate-500 font-medium">{event.category}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Amount & Detail Chevron */}
      <div className="flex items-center gap-3 text-right">
        <div>
          <MoneyDisplay
            paise={displayPaise}
            showSign={event.type === 'income' || event.type === 'refund'}
            variant={
              event.type === 'income' || event.type === 'refund'
                ? 'success'
                : event.type === 'purchase' || event.type === 'fee'
                ? 'neutral'
                : 'neutral'
            }
            size="md"
          />
          <p className="text-[10px] text-slate-400 mt-0.5">
            {event.type === 'own_transfer' || event.type === 'card_payment'
              ? 'Transfer'
              : event.type === 'refund'
              ? 'Refund'
              : event.type === 'income'
              ? 'Income'
              : 'Expense'}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
      </div>
    </div>
  );
};
