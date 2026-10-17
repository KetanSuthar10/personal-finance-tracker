import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { MoneyDisplay } from '../../components/common/MoneyDisplay';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { toRupees } from '../../domain/money';

export interface CategorySpendChartProps {
  categoryBreakdown: Record<string, number>;
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'];

export const CategorySpendChart: React.FC<CategorySpendChartProps> = ({ categoryBreakdown }) => {
  const data = Object.entries(categoryBreakdown)
    .filter(([_, paise]) => paise > 0)
    .map(([category, paise]) => ({
      name: category,
      rupees: toRupees(paise),
      paise,
    }))
    .sort((a, b) => b.paise - a.paise);

  const totalPaise = data.reduce((sum, d) => sum + d.paise, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 py-6 text-center">No category spending in this period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <span className="text-xs font-semibold text-slate-500">
          Total: <MoneyDisplay paise={totalPaise} size="sm" />
        </span>
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col justify-between">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748b' }}
                width={80}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Spending']}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="rupees" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Semantic text list for accessibility and clarity */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
          {data.map((item, index) => {
            const pct = totalPaise > 0 ? Math.round((item.paise / totalPaise) * 100) : 0;
            return (
              <div key={item.name} className="flex items-center justify-between text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{item.name}</span>
                  <span className="text-slate-400 text-[10px]">({pct}%)</span>
                </div>
                <MoneyDisplay paise={item.paise} size="sm" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
