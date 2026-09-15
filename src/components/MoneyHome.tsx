import { Wallet, ChevronRight, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import type { MoneyDetail, ParticipantNextAction } from '../types';
import { nextActionLabel } from '../moneyData';

interface MoneyHomeProps {
  items: MoneyDetail[];
  onOpenMoney: (id: string) => void;
  onStartConversation: () => void;
}

function actionableNextActions(m: MoneyDetail): ParticipantNextAction[] {
  return m.nextActions.filter((a) => a !== 'none');
}

export function MoneyHome({ items, onOpenMoney, onStartConversation }: MoneyHomeProps) {
  const needsYou = items.filter((m) => actionableNextActions(m).length > 0);
  const waiting = items.filter((m) => m.state === 'pending_confirmation' || m.state === 'payment_initiated');
  const recent = items.filter((m) => m.state === 'confirmed' || (m.activity.length > 0 && actionableNextActions(m).length === 0));

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        <div className="mb-5">
          <h1 className="font-display text-xl text-forest-800 font-medium">Money</h1>
          <p className="text-[0.85rem] text-sand-500 mt-0.5">Money follows the agreement</p>
        </div>

        {/* Needs you */}
        {needsYou.length > 0 && (
          <div className="mb-5">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Needs you</div>
            <div className="space-y-2">
              {needsYou.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onOpenMoney(m.id)}
                  className="w-full text-left rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 hover:shadow-soft transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      actionableNextActions(m).includes('FUND_AGREEMENT') ? 'bg-forest-50' : 'bg-ember-50'
                    }`}>
                      {actionableNextActions(m).includes('FUND_AGREEMENT') ? <Wallet className="w-3.5 h-3.5 text-forest-600" /> : actionableNextActions(m).includes('REFRESH') ? <RefreshCw className="w-3.5 h-3.5 text-ember-600" /> : <AlertCircle className="w-3.5 h-3.5 text-ember-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-[0.875rem] font-medium text-forest-800">{m.agreementLink.agreementTitle}</div>
                      <div className="text-[0.72rem] text-sand-500">
                        {actionableNextActions(m).map((a) => nextActionLabel[a]).join(' · ')}{m.amount && ` · ${m.amount}`}
                      </div>
                      {m.agreementLink.milestoneTitle && (
                        <div className="text-[0.68rem] text-sand-400 mt-0.5">Related to: {m.agreementLink.milestoneTitle}</div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-sand-400 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Waiting */}
        {waiting.length > 0 && (
          <div className="mb-5">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Waiting</div>
            <div className="space-y-2">
              {waiting.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onOpenMoney(m.id)}
                  className="w-full text-left rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-cream-50 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-sand-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[0.875rem] font-medium text-forest-800">{m.agreementLink.agreementTitle}</div>
                      <div className="text-[0.72rem] text-sand-500">Waiting on confirmation · {m.amount}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-sand-400 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent */}
        {recent.length > 0 && (
          <div className="mb-5">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Recent</div>
            <div className="space-y-2">
              {recent.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onOpenMoney(m.id)}
                  className="w-full text-left rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-forest-50 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-forest-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[0.875rem] font-medium text-forest-800">{m.agreementLink.agreementTitle}</div>
                      <div className="text-[0.72rem] text-sand-500">Payment confirmed · {m.amount}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-sand-400 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {needsYou.length === 0 && waiting.length === 0 && recent.length === 0 && (
          <div className="rounded-2xl border border-cream-200 bg-white px-5 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-6 h-6 text-sand-400" />
            </div>
            <p className="text-[0.875rem] text-sand-600">No money actions yet.</p>
            <p className="text-[0.78rem] text-sand-400 mt-1">Your agreements will bring Money here when a financial action becomes available.</p>
          </div>
        )}

        {/* Agent prompt */}
        <button
          onClick={onStartConversation}
          className="w-full mt-4 rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-3 text-left hover:bg-cream-50 transition-colors"
        >
          <span className="text-[0.825rem] text-forest-600 font-medium">Ask SecurePay about money</span>
          <p className="text-[0.72rem] text-sand-400 mt-0.5">Ask what you owe, what's been paid, or what needs your action</p>
        </button>
      </div>
    </div>
  );
}
