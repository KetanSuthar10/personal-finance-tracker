import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { MilestoneBadge } from '../../components/common/MilestoneBadge';
import { Bot, Shield, Wrench, Lock } from 'lucide-react';

export const AssistantPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Gemini Financial Assistant</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Privacy-preserving financial insights and category learning powered by hosted Gemini.
          </p>
        </div>
        <MilestoneBadge milestone="M5" status="planned" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600" />
            <CardTitle>Milestone 5 Roadmap: Assistant & Privacy Boundary</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-slate-600">
          <p>
            Scheduled for development in <strong className="text-slate-800">Milestone M5</strong> upon verification of account quotas and appropriate paid data-policy routes:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Deterministic Grounding</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Gemini never invents arithmetic: all sums and balances are computed by deterministic TypeScript domain logic.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>Account Identifier Masking</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Card and account numbers are strictly masked before being sent to the AI processing boundary.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                <Wrench className="w-4 h-4 text-amber-600" />
                <span>Bounded Tool Allowlist</span>
              </div>
              <p className="text-[11px] text-slate-500">
                The assistant invokes only explicit, owner-scoped tools (e.g. <code>search_transactions</code>, <code>propose_entry</code>).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
