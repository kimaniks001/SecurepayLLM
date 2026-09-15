import type { AgreementAction } from '../types';
import { ActionCard } from './ActionCard';

interface ActionListProps {
  actions: AgreementAction[];
  onOpenAgreement?: (id: string) => void;
}

export function ActionList({ actions, onOpenAgreement }: ActionListProps) {
  const activeActions = actions.filter((a) => a.status !== 'done' && a.status !== 'cancelled' && a.status !== 'superseded');

  if (activeActions.length === 0) {
    return (
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Actions</div>
        <p className="text-[0.85rem] text-sand-500">No active actions for this agreement.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Actions</div>
      <div className="space-y-2">
        {activeActions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            onOpen={onOpenAgreement ? () => onOpenAgreement(action.agreementId) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
