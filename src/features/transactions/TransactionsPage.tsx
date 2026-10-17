import React, { useState, useMemo } from 'react';
import { useLedger } from '../../context/LedgerContext';
import { TransactionFilters, FilterState } from './TransactionFilters';
import { TransactionRow } from './TransactionRow';
import { TransactionDrawer } from './TransactionDrawer';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { FinancialEvent } from '../../domain/types';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export interface TransactionsPageProps {
  onOpenAddEntry: () => void;
  selectedEvent: FinancialEvent | null;
  onSelectEvent: (event: FinancialEvent | null) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  onOpenAddEntry,
  selectedEvent,
  onSelectEvent,
}) => {
  const { events, accounts, isLoading } = useLedger();

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    accountId: 'all',
    category: 'all',
    eventType: 'all',
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.category) set.add(e.category);
    }
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchRecipient = e.recipient.toLowerCase().includes(query);
        const matchCategory = e.category?.toLowerCase().includes(query) ?? false;
        const matchNotes = e.notes?.toLowerCase().includes(query) ?? false;
        if (!matchRecipient && !matchCategory && !matchNotes) return false;
      }

      // Account filter
      if (filters.accountId !== 'all') {
        const hasAccount = e.postings.some((p) => p.account_id === filters.accountId);
        if (!hasAccount) return false;
      }

      // Category filter
      if (filters.category !== 'all') {
        if (e.category !== filters.category) return false;
      }

      // Event Type filter
      if (filters.eventType !== 'all') {
        if (e.type !== filters.eventType) return false;
      }

      return true;
    });
  }, [events, filters]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Transactions Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified financial events and multi-account posting entries.
          </p>
        </div>
        <Button size="sm" onClick={onOpenAddEntry}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Entry
        </Button>
      </div>

      {/* Filters */}
      <TransactionFilters
        filters={filters}
        onChangeFilters={setFilters}
        accounts={accounts}
        categories={categories}
      />

      {/* Transactions List Card */}
      <Card>
        <CardHeader className="py-3 px-4 sm:px-5">
          <CardTitle>
            Matching Records ({filteredEvents.length} of {events.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {filteredEvents.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ArrowLeftRight}
                title="No transactions found"
                description="Try clearing your filters or add a new financial entry."
                actionLabel="Add Entry"
                onAction={onOpenAddEntry}
              />
            </div>
          ) : (
            <div>
              {filteredEvents.map((evt) => (
                <TransactionRow
                  key={evt.id}
                  event={evt}
                  accounts={accounts}
                  onSelect={onSelectEvent}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Slide-over / Modal */}
      <TransactionDrawer
        event={selectedEvent}
        isOpen={selectedEvent !== null}
        onClose={() => onSelectEvent(null)}
        accounts={accounts}
      />
    </div>
  );
};
