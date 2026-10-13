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
            <span className="mt-1 block text-[0.82rem] text-sand-700">Needs you · waiting · upcoming</span>
          </span>
          <span className="text-xs text-sand-500">See all</span>
        </summary>
        <div className="space-y-5 pb-2 pt-3">
          {needs.length > 0 && <div>
            <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-600">Needs you</h3>
            <ul className="mt-2 space-y-2">{needs.map(item => <li key={item.id}>
              <button type="button" onClick={() => onOpenAgreement(item.agreementId, item.actionValue)}
                className="w-full rounded-2xl border border-cream-200 bg-white px-4 py-3 text-left hover:border-forest-300">
                <span className="block text-sm font-semibold text-forest-900">{item.title}</span>
                <span className="mt-0.5 block text-[0.8rem] leading-5 text-sand-700">{item.detail}</span>
              </button>
            </li>)}</ul>
          </div>}

          {waits.length > 0 && <div>
            <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-600">Waiting</h3>
            <ul className="mt-2 space-y-2">{waits.map(item => <li key={item.id}>
              <button type="button" onClick={() => onOpenAgreement(item.agreementId)}
                className="w-full rounded-2xl border border-cream-200 bg-white/70 px-4 py-3 text-left hover:border-forest-300">
                <span className="block text-sm font-semibold text-forest-900">{item.title}</span>
                <span className="mt-0.5 block text-[0.8rem] text-sand-700">{item.detail}</span>
                <span className="mt-0.5 block text-[0.72rem] text-sand-600">{item.statusText} · No action needed.</span>
              </button>
            </li>)}</ul>
          </div>}

          {dates.length > 0 && <div>
            <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-600">Upcoming</h3>
            <ul className="mt-2 space-y-2">{dates.map(item => <li key={item.id}>
              <button type="button" onClick={() => onOpenAgreement(item.agreementId)}
                className="w-full rounded-2xl border border-cream-200 bg-white/70 px-4 py-3 text-left hover:border-forest-300">
                <span className="block text-sm font-semibold text-forest-900">{item.agreementTitle}</span>
                <span className="mt-0.5 block text-[0.8rem] text-sand-700">{item.title}</span>
                <span className="mt-0.5 block text-[0.72rem] text-sand-600">{item.dateLabel}{item.timeLabel ? ' · ' + item.timeLabel : ''}</span>
              </button>
            </li>)}</ul>
          </div>}
        </div>
      </details>
    </section>
  );
}
