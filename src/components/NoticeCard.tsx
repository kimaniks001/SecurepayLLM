import { Lightbulb, Eye, ShieldCheck } from 'lucide-react';
import type { NoticeResponse } from '../types';

interface NoticeCardProps {
  data: NoticeResponse;
}

export function NoticeCard({ data }: NoticeCardProps) {
  const toneConfig = {
    useful: {
      icon: Lightbulb,
      iconClass: 'text-forest-500',
      bg: 'bg-forest-50',
      border: 'border-forest-100',
      labelClass: 'text-forest-700',
      textClass: 'text-forest-800',
    },
    worth_checking: {
      icon: Eye,
      iconClass: 'text-ember-500',
      bg: 'bg-ember-50/50',
      border: 'border-ember-100',
      labelClass: 'text-ember-700',
      textClass: 'text-sand-800',
    },
    important: {
      icon: ShieldCheck,
      iconClass: 'text-forest-600',
      bg: 'bg-forest-50',
      border: 'border-forest-200',
      labelClass: 'text-forest-700',
      textClass: 'text-forest-800',
    },
  };

  const config = toneConfig[data.tone];
  const Icon = config.icon;

  return (
    <div className={`rounded-2xl border ${config.border} ${config.bg} px-4 py-4 animate-quiet-in`}>
      <div className="flex items-start gap-2.5">
        <div className="pt-0.5 shrink-0">
          <Icon className={`w-4 h-4 ${config.iconClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[0.7rem] font-medium uppercase tracking-wide ${config.labelClass}`}>
            {data.label}
          </div>
          <p className={`text-[0.875rem] leading-relaxed mt-1.5 ${config.textClass}`}>
            {data.text}
          </p>
        </div>
      </div>
    </div>
  );
}
