import { ArrowLeft, Sparkles } from 'lucide-react';
import type { AgreementStructure } from '../types';
import { MilestoneProgress } from './MilestoneProgress';
import { ActionList } from './ActionList';
import { ReminderRuleCard } from './ReminderRuleCard';
import { WhatsAppPreviewCard } from './WhatsAppPreviewCard';
import { MilestoneValueSummary } from './MilestoneValueSummary';
import { demoWhatsAppPreviews } from '../milestoneData';

interface AgreementBuilderViewProps {
  structure: AgreementStructure;
  agreementTitle: string;
  onBack: () => void;
}

export function AgreementBuilderView({ structure, agreementTitle, onBack }: AgreementBuilderViewProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Agreements
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">{agreementTitle}</h1>
        <div className="mt-1.5 flex items-center gap-2 text-[0.75rem] text-sand-500">
          <Sparkles className="w-3.5 h-3.5 text-forest-500" />
          Agreement structure
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <MilestoneProgress
          milestones={structure.milestones}
          isSimple={structure.isSimple}
          rootMilestone={structure.rootMilestone}
        />

        {!structure.isSimple && (
          <MilestoneValueSummary
            totalValue={structure.totalValue}
            allocatedValue={structure.allocatedValue}
            unallocatedValue={structure.unallocatedValue}
          />
        )}

        <ActionList actions={structure.actions} />

        {structure.reminders.length > 0 && (
          <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Reminders</div>
            <div className="space-y-2">
              {structure.reminders.map((rule) => (
                <ReminderRuleCard key={rule.id} rule={rule} />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {demoWhatsAppPreviews.map((preview) => (
            <WhatsAppPreviewCard key={preview.id} preview={preview} />
          ))}
        </div>
      </div>
    </div>
  );
}
