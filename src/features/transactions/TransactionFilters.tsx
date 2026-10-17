import { Search, X } from 'lucide-react';
import { Account } from '../../domain/types';
import { Button } from '../../components/ui/Button';

export interface FilterState {
  search: string;
  accountId: string;
  category: string;
  eventType: string;
}

export interface TransactionFiltersProps {
  filters: FilterState;
  onChangeFilters: (filters: FilterState) => void;
  accounts: Account[];
  categories: string[];
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onChangeFilters,
  accounts,
  categories,
}) => {
  const hasActiveFilters =
    filters.search !== '' ||
    filters.accountId !== 'all' ||
    filters.category !== 'all' ||
    filters.eventType !== 'all';

  const resetFilters = () => {
    onChangeFilters({
      search: '',
      accountId: 'all',
      category: 'all',
      eventType: 'all',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search recipient or notes..."
            value={filters.search}
            onChange={(e) => onChangeFilters({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        {/* Account Filter */}
        <div>
          <select
            value={filters.accountId}
            onChange={(e) => onChangeFilters({ ...filters, accountId: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          >
            <option value="all">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.label} ({acc.type})
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={filters.category}
            onChange={(e) => onChangeFilters({ ...filters, category: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Event Type Filter */}
        <div className="flex items-center gap-2">
          <select
            value={filters.eventType}
            onChange={(e) => onChangeFilters({ ...filters, eventType: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          >
            <option value="all">All Event Types</option>
            <option value="income">Income</option>
            <option value="purchase">Purchase</option>
            <option value="refund">Refund</option>
            <option value="card_payment">Card Payment</option>
            <option value="own_transfer">Own Transfer</option>
            <option value="fee">Fee</option>
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-slate-500 hover:text-slate-800 p-1.5 h-8"
              title="Reset Filters"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
