import React, { useState } from 'react';
import { useLedger } from '../../context/LedgerContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { MilestoneBadge } from '../../components/common/MilestoneBadge';
import { MoneyDisplay } from '../../components/common/MoneyDisplay';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { calculateCardStatementStatus, calculateUnbilledCardActivity, calculateEmiInstalmentPaise } from '../../domain/cards';
import { toPaise } from '../../domain/money';
import {
  CreditCard,
  Split,
  ShieldCheck,
  Plus,
  Info,
} from 'lucide-react';

export const CommitmentsPage: React.FC = () => {
  const {
    statements,
    emiPlans,
    planningConfig,
    planningSummary,
    events,
    accounts,
    updatePlanningConfig,
    addEmiPlan,
    addEvent,
  } = useLedger();

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  // Convert to EMI form state
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [emiMerchant, setEmiMerchant] = useState('');
  const [emiPrincipalStr, setEmiPrincipalStr] = useState('');
  const [emiTenureMonths, setEmiTenureMonths] = useState(6);
  const [emiInterestRate, setEmiInterestRate] = useState(14);
  const [emiStartDate, setEmiStartDate] = useState('2026-10-18');
  const [convertError, setConvertError] = useState<string | null>(null);

  // Pay statement bill form state
  const [payAmountStr, setPayAmountStr] = useState('');
  const [payBankAccountId, setPayBankAccountId] = useState(accounts.find((a) => a.type === 'bank')?.id || 'demo-bank');

  const cardAccount = accounts.find((a) => a.type === 'card') || accounts[0];
  const bankAccounts = accounts.filter((a) => a.type === 'bank' || a.type === 'cash');

  // Filter eligible purchases for EMI conversion
  const eligiblePurchases = events.filter(
    (e) => (e.type === 'purchase' || e.type === 'fee') && e.postings.some((p) => p.account_id === cardAccount.id)
  );

  const handleSelectPurchase = (eventId: string) => {
    setSelectedPurchaseId(eventId);
    const evt = events.find((e) => e.id === eventId);
    if (evt) {
      setEmiMerchant(evt.recipient);
      setEmiPrincipalStr((evt.spending_paise / 100).toFixed(2));
      setEmiStartDate(evt.date);
    }
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConvertError(null);

    try {
      const principalPaise = toPaise(emiPrincipalStr);
      if (principalPaise <= 0) {
        setConvertError('Principal amount must be positive.');
        return;
      }

      const instalmentPaise = calculateEmiInstalmentPaise(
        principalPaise,
        emiInterestRate,
        emiTenureMonths
      );

      await addEmiPlan({
        purchase_event_id: selectedPurchaseId || undefined,
        account_id: cardAccount.id,
        merchant: emiMerchant.trim() || 'Converted Purchase',
        original_principal_paise: principalPaise,
        monthly_instalment_paise: instalmentPaise,
        total_tenure_months: emiTenureMonths,
        instalments_billed: 0,
        remaining_principal_paise: principalPaise,
        annual_interest_rate_pct: emiInterestRate,
        start_date: emiStartDate,
        next_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: 'active',
      });

      setIsConvertModalOpen(false);
      setEmiMerchant('');
      setEmiPrincipalStr('');
      setSelectedPurchaseId('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setConvertError(err.message);
      } else {
        setConvertError('Failed to convert purchase to EMI.');
      }
    }
  };

  const handleOpenPayModal = (statementId: string) => {
    setSelectedStatementId(statementId);
    const stmt = statements.find((s) => s.id === statementId);
    if (stmt) {
      const status = calculateCardStatementStatus(stmt, events);
      setPayAmountStr((status.remaining_due_paise / 100).toFixed(2));
    }
    setIsPayModalOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const paise = toPaise(payAmountStr);
      if (paise <= 0) return;

      // Add a card repayment event
      await addEvent({
        date: new Date().toISOString().slice(0, 10),
        type: 'card_payment',
        recipient: `Repayment to ${cardAccount.label}`,
        category: null,
        income_paise: 0,
        spending_paise: 0,
        postings: [
          { account_id: payBankAccountId, delta_paise: -paise },
          { account_id: cardAccount.id, delta_paise: paise },
        ],
        notes: `Payment towards statement ${selectedStatementId}`,
      });

      setIsPayModalOpen(false);
    } catch {
      // Handled
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Cards, EMIs & Cash Planning</h2>
            <MilestoneBadge milestone="M4" status="live" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Credit card billing statements, partial repayments, EMI schedules, and deduplicated cash planning.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsConvertModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Convert Purchase to EMI
        </Button>
      </div>

      {/* Cash Planning Horizon Widget */}
      {planningSummary && (
        <Card className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-lg">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Deduplicated Cash Planning Horizon ({planningConfig.horizon_days} Days)
                </span>
                <div className="mt-1 flex items-baseline gap-3">
                  <MoneyDisplay
                    paise={planningSummary.planning_available_paise}
                    size="xl"
                    className="text-white text-3xl font-extrabold"
                  />
                  <span className="text-xs text-indigo-200">Safe to spend</span>
                </div>
              </div>

              {/* Horizon Selector */}
              <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                {[15, 30, 45].map((days) => (
                  <button
                    key={days}
                    onClick={() => updatePlanningConfig({ horizon_days: days })}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      planningConfig.horizon_days === days
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Invariant Equation Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Liquid Funds (+)</span>
                <MoneyDisplay paise={planningSummary.liquid_funds_paise} size="md" className="text-white font-semibold" />
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Card Bills Due (-)</span>
                <MoneyDisplay paise={-planningSummary.card_bills_due_paise} size="md" className="text-rose-300 font-semibold" />
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Standalone EMIs (-)</span>
                <MoneyDisplay paise={-planningSummary.standalone_emis_due_paise} size="md" className="text-amber-300 font-semibold" />
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Emergency Buffer (-)</span>
                <MoneyDisplay paise={-planningSummary.emergency_buffer_paise} size="md" className="text-slate-300 font-semibold" />
              </div>
            </div>

            {/* Deduplication Notice */}
            {planningSummary.deduplicated_emis_count > 0 && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center gap-2.5 text-xs text-indigo-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  <strong className="text-white font-medium">Accounting Invariant:</strong> {planningSummary.deduplicated_emis_count} active EMI instalment is already billed inside your card statement bill and is <strong>not double-deducted</strong>.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Credit Card Statements Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-800">Card Statements & Dues</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statements.map((stmt) => {
            const status = calculateCardStatementStatus(stmt, events);
            const unbilled = calculateUnbilledCardActivity(stmt.statement_date, events, stmt.account_id);

            return (
              <Card key={stmt.id} className="hover:border-slate-300 transition-colors">
                <CardHeader>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>Statement Bill #{stmt.id}</CardTitle>
                      {status.is_settled ? (
                        <Badge variant="success" size="sm">Fully Paid</Badge>
                      ) : (
                        <Badge variant="danger" size="sm">Due in 2 days</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Period: {stmt.statement_date} • Due: {stmt.due_date}
                    </p>
                  </div>

                  {!status.is_settled && (
                    <Button size="sm" onClick={() => handleOpenPayModal(stmt.id)}>
                      Pay Bill
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="space-y-4 pt-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400">Statement Total:</span>
                      <div className="mt-0.5 font-bold text-slate-900">
                        <MoneyDisplay paise={stmt.statement_total_paise} size="md" />
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Remaining Due:</span>
                      <div className="mt-0.5 font-bold">
                        <MoneyDisplay
                          paise={status.remaining_due_paise}
                          size="lg"
                          variant={status.is_settled ? 'success' : 'danger'}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400">Repayments Recorded:</span>
                      <div className="font-medium text-emerald-600 mt-0.5">
                        <MoneyDisplay paise={status.allocated_payments_paise} size="sm" />
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Minimum Due:</span>
                      <div className="font-medium text-slate-700 mt-0.5">
                        <MoneyDisplay paise={stmt.minimum_due_paise} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Unbilled Activity */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 font-medium">Unbilled Activity (Post-statement):</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        New purchases, refunds, and charges since {stmt.statement_date}
                      </p>
                    </div>
                    <MoneyDisplay paise={unbilled.net_unbilled_paise} size="sm" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Active EMI Plans Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Split className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-slate-800">Active EMI Purchases & Schedules</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emiPlans.map((emi) => {
            const tenurePct = Math.round((emi.instalments_billed / emi.total_tenure_months) * 100);

            return (
              <Card key={emi.id} className="hover:border-slate-300 transition-colors">
                <CardHeader>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{emi.merchant}</CardTitle>
                      <Badge variant="indigo" size="sm">
                        {emi.annual_interest_rate_pct}% APR
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Started: {emi.start_date} • Next Due: {emi.next_due_date}
                    </p>
                  </div>
                  {emi.billed_in_statement_id ? (
                    <Badge variant="success" size="sm" title="Deduplicated against card statement">
                      Billed in Statement
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">Standalone</Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-4 pt-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400">Monthly Instalment:</span>
                      <div className="mt-0.5 font-bold text-slate-900">
                        <MoneyDisplay paise={emi.monthly_instalment_paise} size="md" />
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Remaining Principal:</span>
                      <div className="mt-0.5 font-bold text-slate-700">
                        <MoneyDisplay paise={emi.remaining_principal_paise} size="md" />
                      </div>
                    </div>
                  </div>

                  {/* Tenure Progress Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Tenure Progress</span>
                      <span>
                        {emi.instalments_billed} of {emi.total_tenure_months} Months ({tenurePct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${tenurePct}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Convert Purchase to EMI Modal */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Convert Purchase to EMI"
        description="Schedule a credit card purchase into monthly principal and interest instalments"
        maxWidth="lg"
      >
        <form onSubmit={handleConvertSubmit} className="space-y-4 pt-2">
          {convertError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {convertError}
            </div>
          )}

          {/* Quick Picker from eligible purchases */}
          {eligiblePurchases.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Select Past Purchase (Optional)
              </label>
              <select
                value={selectedPurchaseId}
                onChange={(e) => handleSelectPurchase(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
              >
                <option value="">-- Choose from card purchases --</option>
                {eligiblePurchases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.date} • {p.recipient} • ₹{(p.spending_paise / 100).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Merchant / Item Name"
              type="text"
              placeholder="e.g. Work Laptop, Smartphone"
              value={emiMerchant}
              onChange={(e) => setEmiMerchant(e.target.value)}
              required
            />
            <Input
              label="Principal Amount (₹ INR)"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 30000.00"
              value={emiPrincipalStr}
              onChange={(e) => setEmiPrincipalStr(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Tenure (Months)
              </label>
              <select
                value={emiTenureMonths}
                onChange={(e) => setEmiTenureMonths(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-600"
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={9}>9 Months</option>
                <option value={12}>12 Months</option>
                <option value={24}>24 Months</option>
              </select>
            </div>

            <Input
              label="Annual APR (%)"
              type="number"
              step="0.5"
              value={emiInterestRate}
              onChange={(e) => setEmiInterestRate(Number(e.target.value))}
              required
            />

            <Input
              label="Start Date"
              type="date"
              value={emiStartDate}
              onChange={(e) => setEmiStartDate(e.target.value)}
              required
            />
          </div>

          {/* Computed monthly instalment preview */}
          {emiPrincipalStr && Number(emiPrincipalStr) > 0 && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-indigo-900">Estimated Monthly Instalment</span>
                <p className="text-[11px] text-indigo-600 mt-0.5">Principal + Interest amortized over {emiTenureMonths} months</p>
              </div>
              <MoneyDisplay
                paise={calculateEmiInstalmentPaise(toPaise(emiPrincipalStr), emiInterestRate, emiTenureMonths)}
                size="lg"
                className="text-indigo-900 font-bold"
              />
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsConvertModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Confirm EMI Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pay Statement Bill Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Pay Card Statement Bill"
        description="Records a bank-to-card transfer with zero income/spending inflation"
        maxWidth="md"
      >
        <form onSubmit={handlePaySubmit} className="space-y-4 pt-2">
          <Input
            label="Payment Amount (₹ INR)"
            type="text"
            inputMode="decimal"
            value={payAmountStr}
            onChange={(e) => setPayAmountStr(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Source Bank Account
            </label>
            <select
              value={payBankAccountId}
              onChange={(e) => setPayBankAccountId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} ({a.type})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <span>
              This will create a neutral card payment posting that debits your bank account and credits your credit card balance.
            </span>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
