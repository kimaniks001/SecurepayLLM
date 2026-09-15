import { AlertCircle, FileText, CheckCircle, Gavel, MessageSquare, Handshake, Scale, Bell } from 'lucide-react';
import type { AttentionItem } from '../types';

interface NeedsAttentionListProps {
  items: AttentionItem[];
  onOpenAgreement: (id: string) => void;
}

const kindIcon = {
  agreement_changed: AlertCircle,
  waiting_confirmation: CheckCircle,
  document_review: FileText,
  dispute_scope_confirmation: Gavel,
  dispute_position_needed: MessageSquare,
  dispute_match_proposed: Handshake,
  dispute_master_appointment: Scale,
  dispute_master_opinion: Scale,
  agreement_action: Bell,
};

const kindTone = {
  agreement_changed: 'text-ember-600 bg-ember-50',
  waiting_confirmation: 'text-forest-600 bg-forest-50',
  document_review: 'text-sand-600 bg-cream-100',
  dispute_scope_confirmation: 'text-ember-600 bg-ember-50',
  dispute_position_needed: 'text-ember-600 bg-ember-50',
  dispute_match_proposed: 'text-forest-600 bg-forest-50',
  dispute_master_appointment: 'text-ember-600 bg-ember-50',
  dispute_master_opinion: 'text-forest-600 bg-forest-50',
  agreement_action: 'text-forest-600 bg-forest-50',
};

const kindLabel = {
  agreement_changed: 'Change requested',
  waiting_confirmation: 'Ready for your confirmation',
  document_review: 'Document needs review',
  dispute_scope_confirmation: 'Disputed scope needs your confirmation',
  dispute_position_needed: 'Position needed',
  dispute_match_proposed: 'Match proposed',
  dispute_master_appointment: 'Master appointment needs you',
  dispute_master_opinion: 'Master opinion ready',
  agreement_action: 'Needs your action',
};

export function NeedsAttentionList({ items, onOpenAgreement }: NeedsAttentionListProps) {
  if (items.length === 0) {
    return (
      <div className="animate-quiet-in">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Needs you</div>
        <div className="rounded-xl border border-cream-200 bg-white px-4 py-4">
          <p className="text-[0.85rem] text-sand-600">Nothing needs your attention right now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">
        Needs you · {items.length}
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = kindIcon[item.kind];
          return (
            <button
              key={item.id}
              onClick={() => onOpenAgreement(item.agreementId)}
              className="w-full text-left rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 hover:shadow-soft transition-all group"
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${kindTone[item.kind]}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">{kindLabel[item.kind]}</div>
                  <div className="text-[0.875rem] font-medium text-forest-800 mt-0.5">{item.title}</div>
                  <div className="text-[0.78rem] text-sand-600 mt-0.5">{item.detail}</div>
                  <div className="text-[0.78rem] font-medium text-forest-600 mt-1.5 group-hover:text-forest-700">
                    {item.actionLabel} →
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
