import React, { useState } from 'react';
import { Plus, RotateCcw, ShieldCheck, Calendar, Camera, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useLedger } from '../../context/LedgerContext';
import { useAuth } from '../../context/AuthContext';
import { PeriodSelectModal } from '../common/PeriodSelectModal';
import { ThemeToggle } from '../common/ThemeToggle';

export interface HeaderProps {
  onOpenAddEntry: () => void;
  onOpenCapture?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAddEntry, onOpenCapture }) => {
  const { period, setPeriod, resetToDemo, isLoading } = useLedger();
  const { user, signOut } = useAuth();
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-4 py-3 backdrop-blur-md sm:px-6">
        {/* Left: Title & Period */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-950">
              <span className="text-sm font-bold tracking-tight">₹</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">Finance Tracker</h1>
                {user ? (
                  <Badge variant="indigo" size="sm" className="hidden sm:inline-flex" title={`Logged in as ${user.email}`}>
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>Owner</span>
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm" className="hidden sm:inline-flex">
                    <ShieldCheck className="w-3 h-3 text-slate-400" />
                    <span>Demo Mode</span>
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsPeriodModalOpen(true)}
                title="Change active accounting period"
                className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer group text-left mt-0.5"
              >
                <Calendar className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                <span className="font-medium underline decoration-dotted underline-offset-2">
                  {period.from} to {period.through}
                </span>
                <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                <span className="hidden sm:inline text-slate-400 dark:text-slate-500">Asia/Kolkata</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Button
            variant="outline"
            size="sm"
            onClick={resetToDemo}
            isLoading={isLoading}
            title="Reset to bundled demo fixture"
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset Demo</span>
          </Button>

          {onOpenCapture && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCapture}
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 shadow-sm"
              title="Scan receipt OCR or dictate voice note"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Scan / Dictate</span>
            </Button>
          )}

          <Button size="sm" onClick={onOpenAddEntry} className="shadow-indigo-100">
            <Plus className="w-4 h-4" />
            <span>Add Entry</span>
          </Button>

          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              title="Sign out of your session"
              className="text-xs text-slate-500 hover:text-rose-600 hover:border-rose-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Sign Out</span>
            </Button>
          )}
        </div>
      </header>

      <PeriodSelectModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        currentPeriod={period}
        onApplyPeriod={setPeriod}
      />
    </>
  );
};
