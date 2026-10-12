import type { AttentionItem, WaitingItem } from '../../types';
import type { CalendarEventView } from '../workspace/view';

export interface AgreementUpcomingItem extends CalendarEventView {
  agreementId: string;
  agreementTitle: string;
}

export function AgreementAttentionSummary({ needsYou, waiting, upcoming, dominantWorkId, onOpenAgreement }: {
  needsYou: AttentionItem[];
  waiting: WaitingItem[];
  upcoming: AgreementUpcomingItem[];
  dominantWorkId?: string | null;
  onOpenAgreement: (agreementId: string, actionCode?: string) => void;
}) {
  const needs = needsYou.filter(item => item.agreementId !== dominantWorkId).slice(0, 3);
  const waits = waiting.filter(item => item.agreementId !== dominantWorkId).slice(0, 3);
  const dates = upcoming.filter(item => item.agreementId !== dominantWorkId).slice(0, 3);
  if (needs.length === 0 && waits.length === 0 && dates.length === 0) return null;

  return (
    <section aria-label="Your Agreements" className="mt-7 border-t border-cream-200 pt-5" data-agreement-attention-summary>
      <details>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-left">
          <span>
            <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-600">Other Agreements</span>
            <span className="mt-1 block text-[0.82rem] text-sand-700">Needs you Â· waiting Â¡ upcoming</span>
          </span>
          <span className="text-xs text-sand-500">S¶»§q«^