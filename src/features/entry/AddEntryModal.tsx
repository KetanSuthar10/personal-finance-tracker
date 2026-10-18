import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EventType } from '../../domain/types';
import { useLedger } from '../../context/LedgerContext';
import { toPaise } from '../../domain/money';

export interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddEntryModal: React.FC<AddEntryModalProps> = ({ isOpen, onClose }) => {
  const { accounts, executeCommand } = useLedger();

  const [type, setType] = useState<EventType>('purchase');
  const [date, setDate] = useState('2026-10-18');
  const [amountStr, setAmountStr] = useState('');
  const [recipient, setRecipient] = useState('');
  const [category, setCategory] = useState('');
  const [primaryAccountId, setPrimaryAccountId] = useState(accounts[0]?.id || 'demo-bank');
  const [destinationAccountId, setDestinationAccountId] = useState(accounts[1]?.id || 'demo-cash');
  const [linkedPurchaseId, setLinkedPurchaseId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setType('purchase');
    setDate('2026-10-18');
    setAmountStr('');
    setRecipient('');
    setCategory('');
    setLinkedPurchaseId('');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!amountStr.trim()) {
        setError('Please enter an amount.');
        return;
      }

      const paise = toPaise(amountStr);
      if (paise <= 0) {
        setError('Amount must be a positive number.');
        return;
      }

      const effectiveRecipient =
        type === 'own_transfer'
          ? `Transfer to ${accounts.find((a) => a.id === destinationAccountId)?.label || 'destination'}`
          : type === 'card_payment'
          ? `Repayment to ${accounts.find((a) => a.id === destinationAccountId)?.label || 'card'}`
          : recipient.trim();

      setIsSubmitting(true);

      await executeCommand({
        date,
        type,
        amount_paise: paise,
        account_id: primaryAccountId,
        destination_account_id:
          type === 'own_transfer' || type === 'card_payment' ? destinationAccountId : undefined,
        recipient: effectiveRecipient,
        category: category.trim() || null,
        linked_purchase_id: type === 'refund' && linkedPurchaseId.trim() ? linkedPurchaseId.trim() : undefined,
        notes: notes.trim() || undefined,
      });

      handleClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const bankAccounts = accounts.filter((a) => a.type === 'bank' || a.type === 'cash');
  const cardAccounts = accounts.filter((a) => a.type === 'card');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Record Financial Entry"
      description="Manual daily capture with validated double-entry posting rules"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Event Type Selector Buttons */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Event Type
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {[
              { id: 'purchase', label: 'Expense' },
              { id: 'income', label: 'Income' },
              { id: 'refund', label: 'Refund' },
              { id: 'own_transfer', label: 'Transfer' },
              { id: 'card_payment', label: 'Card Pay' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setType(btn.id as EventType)}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                  type === btn.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount & Date in 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Amount (₹ INR)"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 250.00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Recipient / Merchant */}
        {type !== 'own_transfer' && type !== 'card_payment' && (
          <Input
            label={type === 'income' ? 'Payer / Source' : 'Recipient / Merchant'}
            type="text"
            placeholder={type === 'income' ? 'e.g. Client X or Employer' : 'e.g. Cafe Blue, Supermarket'}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
          />
        )}

        {/* Account Pickers depending on event type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {type === 'income'
                ? 'Destination Account'
                : type === 'own_transfer' || type === 'card_payment'
                ? 'Source Account (Debit)'
                : 'Payment Account'}
            </label>
            <select
              value={primaryAccountId}
              onChange={(e) => setPrimaryAccountId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            >
              {type === 'card_payment'
                ? bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.type})
                    </option>
                  ))
                : accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.type})
                    </option>
                  ))}
            </select>
          </div>

          {(type === 'own_transfer' || type === 'card_payment') && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                {type === 'card_payment' ? 'Credit Card (Credit)' : 'Destination Account (Credit)'}
              </label>
              <select
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              >
                {type === 'card_payment'
                  ? cardAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} ({a.type})
                      </option>
                    ))
                  : accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} ({a.type})
                      </option>
                    ))}
              </select>
            </div>
          )}

          {/* Category for income/purchase/refund */}
          {type !== 'own_transfer' && type !== 'card_payment' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Category
              </label>
              <input
                type="text"
                list="category-suggestions"
                placeholder="e.g. Dining, Groceries, Salary"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
              <datalist id="category-suggestions">
                <option value="Dining" />
                <option value="Groceries" />
                <option value="Transport" />
                <option value="Salary" />
                <option value="Additional income" />
                <option value="Finance charges" />
                <option value="Shopping" />
                <option value="Utilities" />
              </datalist>
            </div>
          )}
        </div>

        {/* Optional Linked Purchase ID for refund */}
        {type === 'refund' && (
          <Input
            label="Linked Purchase ID (Optional)"
            type="text"
            placeholder="e.g. groceries"
            value={linkedPurchaseId}
            onChange={(e) => setLinkedPurchaseId(e.target.value)}
            helperText="Directly connects this refund with an earlier purchase record"
          />
        )}

        {/* Submit Actions */}
        <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Save Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
};
