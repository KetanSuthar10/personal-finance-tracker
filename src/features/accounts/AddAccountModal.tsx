import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useLedger } from '../../context/LedgerContext';
import { toPaise } from '../../domain/money';
import { getTodayKolkata, isValidDateString } from '../../domain/dates';
import { Landmark, Wallet, CreditCard, AlertCircle } from 'lucide-react';

export interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose }) => {
  const { addAccount } = useLedger();
  const [type, setType] = useState<'bank' | 'cash' | 'card'>('bank');
  const [label, setLabel] = useState('');
  const [maskedSuffix, setMaskedSuffix] = useState('');
  const [openingDate, setOpeningDate] = useState(getTodayKolkata());
  const [amountRupees, setAmountRupees] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!label.trim()) {
      setError('Please provide an account name/label.');
      return;
    }

    if (!isValidDateString(openingDate)) {
      setError('Please provide a valid calendar opening date (YYYY-MM-DD).');
      return;
    }

    const numericAmount = parseFloat(amountRupees || '0');
    if (isNaN(numericAmount) || !isFinite(numericAmount) || numericAmount < 0) {
      setError('Opening balance must be a valid non-negative number.');
      return;
    }

    let rawPaise = toPaise(numericAmount);
    // For credit card, opening balance represents outstanding debt (liability = negative position)
    const openingPositionPaise = type === 'card' ? -rawPaise : rawPaise;

    setIsSubmitting(true);
    try {
      await addAccount({
        label: label.trim(),
        type,
        opening_date: openingDate,
        opening_position_paise: openingPositionPaise,
        masked_suffix: maskedSuffix.trim() ? maskedSuffix.trim() : undefined,
      });

      // Reset form and close
      setLabel('');
      setMaskedSuffix('');
      setAmountRupees('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Account"
      description="Configure a new liquid asset or credit liability for your personal tracker"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Account Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Account Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType('bank')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
                type === 'bank'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Landmark className="w-5 h-5 text-indigo-600" />
              <span>Bank A/c</span>
            </button>
            <button
              type="button"
              onClick={() => setType('cash')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
                type === 'cash'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Wallet className="w-5 h-5 text-emerald-600" />
              <span>Cash Wallet</span>
            </button>
            <button
              type="button"
              onClick={() => setType('card')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
                type === 'card'
                  ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-5 h-5 text-amber-600" />
              <span>Credit Card</span>
            </button>
          </div>
        </div>

        {/* Account Label */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Account Name / Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={
              type === 'bank'
                ? 'e.g. HDFC Salary Account'
                : type === 'cash'
                ? 'e.g. Primary Wallet'
                : 'e.g. ICICI Amazon Pay Card'
            }
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Masked Suffix (optional) */}
        {type !== 'cash' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Masked Identifier / Suffix (Optional)
            </label>
            <input
              type="text"
              value={maskedSuffix}
              onChange={(e) => setMaskedSuffix(e.target.value)}
              placeholder="e.g. •• 4821"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
            />
          </div>
        )}

        {/* Opening Date & Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Opening Date
            </label>
            <input
              type="date"
              value={openingDate}
              onChange={(e) => setOpeningDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              {type === 'card' ? 'Initial Outstanding (₹)' : 'Opening Balance (₹)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {type === 'card'
                ? 'Enter current unpaid balance on the card as of the opening date.'
                : 'Current available cash/bank balance as of opening date.'}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Create Account
          </Button>
        </div>
      </form>
    </Modal>
  );
};
