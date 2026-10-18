import React, { useState } from 'react';
import { Account } from '../../domain/types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useLedger } from '../../context/LedgerContext';
import { toPaise, formatRupees } from '../../domain/money';
import { isValidDateString } from '../../domain/dates';
import { AlertCircle, Info } from 'lucide-react';

export interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({ isOpen, onClose, account }) => {
  if (!account) return null;

  const { updateAccount } = useLedger();
  const [label, setLabel] = useState(account.label);
  const [maskedSuffix, setMaskedSuffix] = useState(account.masked_suffix || '');
  const [openingDate, setOpeningDate] = useState(account.opening_date);

  const initialAmount =
    account.type === 'card'
      ? Math.abs(account.opening_position_paise) / 100
      : account.opening_position_paise / 100;
  const [amountRupees, setAmountRupees] = useState(initialAmount.toString());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live calculation of opening position adjustment and balance impact
  const parsedAmount = parseFloat(amountRupees || '0');
  const validAmount = !isNaN(parsedAmount) && isFinite(parsedAmount) && parsedAmount >= 0;
  const newOpeningPaise = validAmount
    ? account.type === 'card'
      ? -toPaise(parsedAmount)
      : toPaise(parsedAmount)
    : account.opening_position_paise;

  const currentPaise = account.current_position_paise ?? account.opening_position_paise;
  const openingDelta = newOpeningPaise - account.opening_position_paise;
  const projectedPosition = currentPaise + openingDelta;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!label.trim()) {
      setError('Please provide an account label.');
      return;
    }

    if (!isValidDateString(openingDate)) {
      setError('Please provide a valid calendar opening date (YYYY-MM-DD).');
      return;
    }

    if (!validAmount) {
      setError('Opening balance must be a valid non-negative number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAccount(account.id, {
        label: label.trim(),
        opening_date: openingDate,
        opening_position_paise: newOpeningPaise,
        masked_suffix: maskedSuffix.trim() ? maskedSuffix.trim() : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Account: ${account.label}`}
      description="Update account details and review the exact balance impact of opening position adjustments"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Account Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Account Name / Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Masked Suffix */}
        {account.type !== 'cash' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Masked Suffix (Optional)
            </label>
            <input
              type="text"
              value={maskedSuffix}
              onChange={(e) => setMaskedSuffix(e.target.value)}
              placeholder="e.g. •• 4821"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              {account.type === 'card' ? 'Opening Outstanding (₹)' : 'Opening Balance (₹)'}
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
                required
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Real-time Opening Adjustment Impact Preview (F18) */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>Balance Adjustment Impact Preview</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
            <div>
              <span className="text-slate-400 block">Current Balance:</span>
              <span className="font-semibold text-slate-700">
                {formatRupees(currentPaise)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Projected Balance:</span>
              <span className="font-semibold text-indigo-700">
                {formatRupees(projectedPosition)}
              </span>
            </div>
          </div>
          {openingDelta !== 0 && (
            <p className="text-[11px] text-indigo-600 font-medium">
              Net shift: {openingDelta > 0 ? '+' : ''}
              {formatRupees(openingDelta)} to total position. All historical transactions remain preserved.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
