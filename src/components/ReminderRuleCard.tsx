import { Bell, MessageCircle, Smartphone } from 'lucide-react';
import type { ReminderRule } from '../types';

interface ReminderRuleCardProps {
  rule: ReminderRule;
}

export function ReminderRuleCard({ rule }: ReminderRuleCardProps) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white px-4 py-3">
      <div className="flex items-start gap-2.5">
        <Bell className="w-3.5 h-3.5 text-sand-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="text-[0.825rem] text-forest-800">
            <span className="font-medium">{rule.who}</span>
            {' — '}
            {rule.about}
          </div>
          <div className="text-[0.72rem] text-sand-500 mt-0.5">{rule.timing}</div>
          {rule.createdBy && (
            <div className="text-[0.68rem] text-sand-400 mt-0.5 italic">Created by {rule.createdBy}</div>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {rule.channels.map((ch) => {
              const Icon = ch === 'whatsapp' ? Smartphone : MessageCircle;
              return (
                <span key={ch} className="flex items-center gap-1 text-[0.68rem] text-sand-500 bg-cream-50 rounded-full px-2 py-0.5">
                  <Icon className="w-2.5 h-2.5" />
                  {ch === 'whatsapp' ? 'WhatsApp' : 'SecurePay'}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
