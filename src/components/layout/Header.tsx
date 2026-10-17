import React from 'react';
import { Plus, RotateCcw, ShieldCheck, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useLedger } from '../../context/LedgerContext';

export interface HeaderProps {
  onOpenAddEntry: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAddEntry }) => {
  const { period, resetToDemo, isLoading } = useLedger();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
      {/* Left: Title & Period */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-200">
            <span className="text-sm font-bold tracking-tight">₹</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 sm:text-base">Finance Tracker</h1>
              <Badge variant="indigo" size="sm" className="hidden sm:inline-flex">
                <ShieldCheck className="w-3 h-3 text-indigo-500" />
                Demo Mode
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>
                {period.from} to {period.through}
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="hidden sm:inline text-slate-400">Asia/Kolkata</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={resetToDemo}
          isLoading={isLoading}
          title="Reset to bundled demo fixture"
          className="text-xs text-slate-600 hover:text-slate-900"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Reset Demo</span>
        </Button>

        <Button size="sm" onClick={onOpenAddEntry} className="shadow-indigo-100">
          <Plus className="w-4 h-4" />
          <span>Add Entry</span>
        </Button>
      </div>
    </header>
  );
};
