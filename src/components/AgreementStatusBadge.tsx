import type { AgreementStatus } from '../types';

const statusConfig: Record<AgreementStatus, { label: string; classes: string; dot: string }> = {
  taking_shape: { label: 'Taking shape', classes: 'bg-cream-100 text-sand-600', dot: 'bg-sand-400' },
  ready_for_review: { label: 'Ready for review', classes: 'bg-forest-50 text-forest-700', dot: 'bg-forest-500' },
  waiting_for_me: { label: 'Waiting for you', classes: 'bg-forest-50 text-forest-700', dot: 'bg-forest-500' },
  waiting_for_other: { label: 'Waiting on others', classes: 'bg-cream-100 text-sand-500', dot: 'bg-sand-400' },
  active: { label: 'Active', classes: 'bg-forest-50 text-forest-700', dot: 'bg-forest-500' },
  change_requested: { label: 'Change requested', classes: 'bg-ember-50 text-ember-700', dot: 'bg-ember-500' },
  completed: { label: 'Completed', classes: 'bg-cream-100 text-sand-600', dot: 'bg-sand-400' },
  cancelled: { label: 'Cancelled', classes: 'bg-ember-50 text-ember-700', dot: 'bg-ember-500' },
  expired: { label: 'Expired', classes: 'bg-cream-200 text-sand-500', dot: 'bg-sand-400' },
};

interface AgreementStatusBadgeProps {
  status: AgreementStatus;
  label?: string;
}

export function AgreementStatusBadge({ status, label }: AgreementStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium ${config.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label || config.label}
    </span>
  );
}
