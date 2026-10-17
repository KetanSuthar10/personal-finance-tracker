import React from 'react';
import { FinancialEvent, Account } from '../../domain/types';
import { Modal } from '../../components/ui/Modal';
import { MoneyDisplay } from '../../components/common/MoneyDisplay';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Calendar, User, Tag, Layers, Trash2 } from 'lucide-react';
import { useLedger } from '../../context/LedgerContext';

export interface TransactionDrawerProps {
  event: FinancialEvent | null;
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
}

export const TransactionDrawer: React.FC<TransactionDrawerProps> = ({
  event,
  isOpen,
  onClose,
  accounts,
}) => {
  const { deleteEvent } = useLedger();

  if (!event) return null;

  const getAccountLabel = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    return acc ? acc.label : id;
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete this event "${event.recipient}"?`)) {
      await deleteEvent(event.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Details"
      description={`ID: ${event.id}`}
      maxWidth="md"
    >
      <div className="space-y-4 pt-1">
        {/* Main Amount Header */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              Transaction Impact
            </span>
            <div className="mt-0.5">
              {event.type === 'income' ? (
                <MoneyDisplay paise={event.income_paise} size="xl" variant="success" showSign />
              ) : event.type === 'purchase' || event.type === 'fee' ? (
                <MoneyDisplay paise={-event.spending_paise} size="xl" variant="neutral" />
              ) : event.type === 'refund' ? (
                <MoneyDisplay paise={Math.abs(event.spending_paise)} size="xl" variant="success" showSign />
              ) : (
                <MoneyDisplay paise={Math.abs(event.postings[0]?.delta_paise || 0)} size="xl" />
              )}
            </div>
          </div>
          <Badge variant="indigo" size="md">
            {event.type.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Metadata Fields */}
        <div className="space-y-2.5 text-xs text-slate-600">
          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <span className="flex items-center gap-2 text-slate-500">
              <Calendar className="w-3.5 h-3.5" /> Date (Asia/Kolkata)
            </span>
            <span className="font-medium text-slate-800">{event.date}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <span className="flex items-center gap-2 text-slate-500">
              <User className="w-3.5 h-3.5" /> Recipient / Merchant
            </span>
            <span className="font-medium text-slate-800">{event.recipient}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <span className="flex items-center gap-2 text-slate-500">
              <Tag className="w-3.5 h-3.5" /> Category
            </span>
            <span className="font-medium text-slate-800">{event.category || 'Uncategorised'}</span>
          </div>

          {event.linked_purchase_id && (
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="flex items-center gap-2 text-slate-500">
                <Layers className="w-3.5 h-3.5" /> Linked Purchase
              </span>
              <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                {event.linked_purchase_id}
              </span>
            </div>
          )}
        </div>

        {/* Postings Breakdown */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Account Postings ({event.postings.length})
          </h4>
          <div className="space-y-1.5">
            {event.postings.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{getAccountLabel(p.account_id)}</span>
                  <span className="font-mono text-[10px] text-slate-400">({p.account_id})</span>
                </div>
                <MoneyDisplay
                  paise={p.delta_paise}
                  showSign
                  size="sm"
                  variant={p.delta_paise > 0 ? 'success' : 'danger'}
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 italic">
            Signed net-position convention: asset increases are positive; liabilities increases are negative.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete Event
          </Button>

          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
