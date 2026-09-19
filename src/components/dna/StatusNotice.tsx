import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

export type StatusTone = 'warning' | 'error' | 'success' | 'info';

const TONE_CLASSES: Record<StatusTone, string> = {
  warning: 'border-ember-200 bg-ember-50 text-sand-800',
  error: 'border-ember-300 bg-ember-50 text-sand-800',
  success: 'border-forest-200 bg-forest-50 text-forest-800',
  info: 'border-cream-200 bg-cream-50 text-sand-700',
};

/**
 * One coherent notice/alert treatment for the whole product. Several feature files (Activation,
 * Money, Money Operations, Hosted Money Session) had each hand-rolled the same
 * `border-orange-200 bg-orange-50` banner independently — raw Tailwind orange, bypassing this
 * project's own `ember` design token. Consolidated here on the real token family so status colour
 * stays governed by one place, not a string copied file to file.
 */
export function StatusNotice({ tone, icon, children, className = '' }: {
  tone: StatusTone;
  icon?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const role = tone === 'warning' || tone === 'error' ? 'alert' : 'status';
  const showIcon = icon ?? (tone === 'warning' || tone === 'error');
  return (
    <div role={role} className={`rounded-xl border p-3 text-sm flex items-start gap-2 ${TONE_CLASSES[tone]} ${className}`}>
      {showIcon && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
      <div className="flex-1">{children}</div>
    </div>
  );
}
