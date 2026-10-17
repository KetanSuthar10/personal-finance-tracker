import React from 'react';
import { FinancialEvent } from '../../domain/types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { MoneyDisplay } from '../../components/common/MoneyDisplay';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ArrowRight, ShoppingBag, ArrowUpRight, RotateCcw, CreditCard, ArrowLeftRight } from 'lucide-react';

export interface RecentTransactionsProps {
  events: FinancialEvent[];
  onViewAll: () => void;
  onSelectEvent: (event: FinancialEvent) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  events,
  onViewAll,
  onSelectEvent,
}) => {
  const recentEvents = events.slice(0, 5);

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

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs text-indigo-600 hover:text-indigo-700">
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div className="divide-y divide-slate-100">
          {recentEvents.map((evt) => {
            const displayPaise =
              evt.type === 'income'
                ? evt.income_paise
                : evt.type === 'purchase' || evt.type === 'fee'
                ? -evt.spending_paise
                : evt.type === 'refund'
                ? Math.abs(evt.spending_paise) // refund reduces spending, displayed with plus or refund indicator
                : Math.abs(evt.postings[0]?.delta_paise || 0);

            return (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className="flex items-center justify-between p-3.5 sm:px-5 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100/80">
                    {getEventIcon(evt.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{evt.recipient}</p>
                      {getEventBadge(evt.type)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{evt.date}</span>
                      {evt.category && <span>• {evt.category}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <MoneyDisplay
                    paise={displayPaise}
                    showSign={evt.type === 'income' || evt.type === 'refund'}
                    variant={
                      evt.type === 'income' || evt.type === 'refund'
                        ? 'success'
                        : evt.type === 'purchase' || evt.type === 'fee'
                        ? 'neutral'
                        : 'neutral'
                    }
                    size="sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {evt.postings.length > 1 ? 'Multi-account' : evt.postings[0]?.account_id}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
