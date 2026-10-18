import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  FileSpreadsheet,
  CreditCard,
  Bot,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { MilestoneBadge } from '../common/MilestoneBadge';
import { useAuth } from '../../context/AuthContext';

export type TabId = 'overview' | 'accounts' | 'transactions' | 'imports' | 'commitments' | 'assistant' | 'settings';

export interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user, signOut } = useAuth();
  const navItems = [
    { id: 'overview' as TabId, label: 'Overview', icon: LayoutDashboard, milestone: 'M1' as const, status: 'prototype' as const },
    { id: 'accounts' as TabId, label: 'Accounts', icon: Wallet, milestone: 'M1' as const, status: 'prototype' as const },
    { id: 'transactions' as TabId, label: 'Transactions', icon: ArrowLeftRight, milestone: 'M1' as const, status: 'prototype' as const },
    { id: 'imports' as TabId, label: 'Statements & Imports', icon: FileSpreadsheet, milestone: 'M2' as const, status: 'prototype' as const },
    { id: 'commitments' as TabId, label: 'Cards & EMIs', icon: CreditCard, milestone: 'M4' as const, status: 'prototype' as const },
    { id: 'assistant' as TabId, label: 'Gemini Assistant', icon: Bot, milestone: 'M5' as const, status: 'prototype' as const },
    { id: 'settings' as TabId, label: 'Settings & Sync', icon: Settings, milestone: 'M3' as const, status: 'prototype' as const },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200/80 bg-white">
      <div className="p-4 flex flex-col gap-1 flex-1">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all group text-left',
                isActive
                  ? 'bg-indigo-50/80 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                <span>{item.label}</span>
              </div>
              <MilestoneBadge milestone={item.milestone} status={item.status} />
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
        {user && (
          <div className="rounded-xl bg-white p-3 border border-slate-200/60 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                Owner Session
              </span>
              <button
                type="button"
                id="sidebar-signout-btn"
                onClick={() => signOut()}
                title="Sign out of your session"
                className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-50"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-800 truncate" title={user.email || ''}>
              {user.email || 'Owner'}
            </p>
            <p className="text-[10px] font-mono text-slate-400 truncate">
              {user.id}
            </p>
          </div>
        )}

        <div className="rounded-xl bg-white p-3 border border-slate-200/60 shadow-xs">
          <p className="text-xs font-semibold text-slate-800">INR Integer Paise</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Strict integer math for accounting invariants. Zero rounding errors.
          </p>
        </div>
      </div>
    </aside>
  );
};
