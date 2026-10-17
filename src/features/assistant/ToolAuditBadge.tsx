import React, { useState } from 'react';
import { ToolCallExecution } from '../../domain/types';

interface ToolAuditBadgeProps {
  toolCall: ToolCallExecution;
}

export const ToolAuditBadge: React.FC<ToolAuditBadgeProps> = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-slate-800 bg-slate-900/80 text-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-left text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-emerald-400 font-semibold">{toolCall.name}</span>
          {toolCall.supporting_record_count !== undefined && (
            <span className="text-[11px] text-slate-400">
              ({toolCall.supporting_record_count} verified records)
            </span>
          )}
        </div>
        <span className="text-slate-500 hover:text-slate-300 font-mono text-[10px]">
          {expanded ? 'Hide JSON ▲' : 'Inspect Proof ▼'}
        </span>
      </button>

      {expanded && (
        <div className="p-3 bg-black/40 border-t border-slate-800/80 font-mono text-[11px] text-slate-400 space-y-2">
          <div>
            <div className="text-slate-500 font-semibold uppercase text-[10px]">Arguments:</div>
            <pre className="overflow-x-auto p-1.5 rounded bg-slate-950 text-slate-300">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>
          <div>
            <div className="text-slate-500 font-semibold uppercase text-[10px]">Deterministic Output:</div>
            <pre className="overflow-x-auto p-1.5 rounded bg-slate-950 text-emerald-300/90 max-h-48 overflow-y-auto">
              {JSON.stringify(toolCall.result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
