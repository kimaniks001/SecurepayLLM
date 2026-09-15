import { Package, Camera, FileSearch, CheckSquare, MessageSquare, FileText, Calendar, MapPin, Gavel, MessageCircle, Scale, Wallet, ClipboardCheck, User } from 'lucide-react';
import type { AgreementAction, ActionStatus, ActionType } from '../types';

const typeIcon: Record<ActionType, typeof Package> = {
  provide_materials: Package,
  upload_evidence: Camera,
  review_evidence: FileSearch,
  inspect_work: FileSearch,
  confirm_completion: CheckSquare,
  respond_to_change: MessageSquare,
  review_current_version: FileText,
  provide_document: FileText,
  meet_deadline: Calendar,
  attend_inspection: MapPin,
  respond_to_dispute_scope: Gavel,
  state_dispute_position: MessageCircle,
  review_master_opinion: Scale,
  contribute_funds: Wallet,
  confirm_contribution: ClipboardCheck,
  meet_in_person: User,
};

const statusConfig: Record<ActionStatus, { label: string; classes: string }> = {
  upcoming: { label: 'Upcoming', classes: 'text-sand-500 bg-cream-50' },
  needs_you: { label: 'Needs you', classes: 'text-forest-600 bg-forest-50' },
  waiting_on_other: { label: 'Waiting on someone else', classes: 'text-sand-500 bg-cream-50' },
  done: { label: 'Done', classes: 'text-forest-500 bg-forest-50' },
  overdue: { label: 'Overdue', classes: 'text-red-500 bg-red-50' },
  cancelled: { label: 'Cancelled', classes: 'text-sand-400 bg-cream-50' },
  superseded: { label: 'Superseded', classes: 'text-sand-400 bg-cream-50' },
};

interface ActionCardProps {
  action: AgreementAction;
  onOpen?: () => void;
}

export function ActionCard({ action, onOpen }: ActionCardProps) {
  const Icon = typeIcon[action.type] || Package;
  const config = statusConfig[action.status];

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 hover:shadow-soft transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-sand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.875rem] font-medium text-forest-800">{action.label}</span>
            <span className={`text-[0.68rem] font-medium rounded-full px-2 py-0.5 ${config.classes}`}>
              {config.label}
            </span>
          </div>
          <div className="text-[0.72rem] text-sand-500 mt-0.5">
            {action.responsible}
            {action.due && <span> · Due {action.due}</span>}
          </div>
          {action.milestoneTitle && (
            <div className="text-[0.72rem] text-sand-400 mt-0.5">{action.milestoneTitle}</div>
          )}
          {action.provenance && (
            <div className="text-[0.68rem] text-sand-400 mt-0.5 italic">Source: {action.provenance}</div>
          )}
        </div>
      </div>
    </button>
  );
}
