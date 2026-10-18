import React from 'react';
import { Badge } from '../ui/Badge';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react';

export interface MilestoneBadgeProps {
  milestone: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7';
  status?: 'prototype' | 'planned' | 'verified' | 'live';
}

export const MilestoneBadge: React.FC<MilestoneBadgeProps> = ({ milestone, status = 'planned' }) => {
  if (status === 'verified' || status === 'live') {
    return (
      <Badge variant="success" size="sm">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>{milestone} Verified</span>
      </Badge>
    );
  }

  if (status === 'prototype') {
    return (
      <Badge variant="indigo" size="sm">
        <Sparkles className="w-3 h-3 text-indigo-500" />
        <span>{milestone} Prototype</span>
      </Badge>
    );
  }

  return (
    <Badge variant="neutral" size="sm">
      <Clock className="w-3 h-3 text-slate-400" />
      <span>{milestone} Planned</span>
    </Badge>
  );
};
