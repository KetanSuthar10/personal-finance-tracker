import React from 'react';
import { PeriodSummary } from '../../domain/types';
import { Card, CardContent } from '../../components/ui/Card';
import { MoneyDisplay } from '../../components/common/MoneyDisplay';
import { TrendingUp, TrendingDown, Landmark, CreditCard, Scale } from 'lucide-react';

export interface KpiCardsProps {
  summary: PeriodSummary;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ summary }) => {
  const cards = [
    {
      label: 'Received Income',
      paise: summary.received_income_paise,
      icon: TrendingUp,
      iconBg: 'bg-emerald-50 text-emerald-600',
      description: 'Settled income this period',
      variant: 'success' as const,
    },
    {
      label: 'Net Spending',
      paise: summary.net_spending_paise,
      icon: TrendingDown,
      iconBg: 'bg-rose-50 text-rose-600',
      description: 'Purchases minus refunds + fees',
      variant: 'neutral' as const,
    },
    {
      label: 'Liquid Funds',
      paise: summary.liquid_funds_paise,
      icon: Landmark,
      iconBg: 'bg-blue-50 text-blue-600',
      description: 'Bank & cash wallet balance',
      variant: 'auto' as const,
    },
    {
      label: 'Card Outstanding',
      paise: summary.card_outstanding_paise,
      icon: CreditCard,
      iconBg: 'bg-amber-50 text-amber-600',
      description: 'Recorded card liabilities',
      variant: 'danger' as const,
    },
    {
      label: 'Net Position',
      paise: summary.closing_net_position_paise,
      icon: Scale,
      iconBg: 'bg-indigo-50 text-indigo-600',
      description: 'Assets minus card liabilities',
      variant: 'auto' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="hover:border-slate-300 transition-colors">
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {card.label}
                </span>
                <div className={`p-2 rounded-lg ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <MoneyDisplay paise={card.paise} size="lg" variant={card.variant} />
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
