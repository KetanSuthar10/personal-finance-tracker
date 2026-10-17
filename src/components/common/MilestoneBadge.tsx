import React from 'react';
import { Badge } from '../ui/Badge';
import { CheckCircle2, Clock } from 'lucide-react';

export interface MilestoneBadgeProps {
  milestone: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7';
  status?: 'live' | 'planned';
}

export const MilestoneBadge: React.FC<MilestoneBadgeProps> = ({ milestone, status = 'planned' }) => {
  if (status === 'live') {
    return (
      <Badge variant="success" size="sm">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>{milestone} Live</span>
      </Badge>
    );
  }

  return (
    <Badge variant="indigo" size="sm">
      <Clock className="w-3 h-3 text-indigo-500" />
      <span>{milestone} Planned</span>
    </Badge>
  );
};
