import React from 'react';
import { LayoutDashboard, Wallet, ArrowLeftRight, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TabId } from './Sidebar';

export interface MobileNavProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onOpenMore: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab, onOpenMore }) => {
  const tabs = [
    { id: 'overview' as TabId, label: 'Overview', icon: LayoutDashboard },
    { id: 'accounts' as TabId, label: 'Accounts', icon: Wallet },
    { id: 'transactions' as TabId, label: 'Transactions', icon: ArrowLeftRight },
  ];

  const isMoreActive = ['imports', 'commitments', 'assistant', 'settings'].includes(currentTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 py-1.5 shadow-lg safe-area-bottom">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
              isActive ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Icon className={cn('w-5 h-5 mb-0.5', isActive ? 'text-indigo-600' : 'text-slate-400')} />
            <span>{tab.label}</span>
          </button>
        );
      })}

      <button
        onClick={onOpenMore}
        className={cn(
          'flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
          isMoreActive ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
        )}
      >
        <MoreHorizontal className={cn('w-5 h-5 mb-0.5', isMoreActive ? 'text-indigo-600' : 'text-slate-400')} />
        <span>More</span>
      </button>
    </nav>
  );
};
