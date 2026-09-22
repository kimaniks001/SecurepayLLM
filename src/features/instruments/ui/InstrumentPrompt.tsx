import { CalendarDays, Coins, Image as ImageIcon, MapPin, UserRound } from 'lucide-react';
import type { InstrumentPromptView } from '../../../api/securepay/agent/instruments';

const LABEL: Record<InstrumentPromptView['instrument'], string> = {
  who: 'Add a person', when: 'Choose a date', money: 'Enter the amount', where: 'Name the place',
};
const ICON = { who: UserRound, when: CalendarDays, money: Coins, where: MapPin } as const;

/**
 * The in-conversation face of an Agent-proposed input affordance: one quiet, unmistakably
 * actionable line under KS001's message -- not a card. Choosing it opens the same instrument the
 * UNDERSTOOD workbench opens; it never acts by itself. PHOTO_UPLOAD / DOCUMENT_UPLOAD have no
 * durable pre-Agreement backend path, so they render an honest note instead of a dead control.
 */
const NOTE: Record<string, string> = {
  photo: 'Photos can’t be added to SecurePay here yet. You can describe it in words.',
  document: 'Documents can’t be added to SecurePay here yet. You can describe it in words.',
};
export function InstrumentPrompt({ prompt, onOpen, unavailable, note }: { prompt?: InstrumentPromptView; onOpen?: () => void; unavailable?: 'photo' | 'document'; note?: string }) {
  if (unavailable || note) {
    return <div className="ml-[2.625rem] flex items-start gap-2 text-[0.82rem] leading-snug text-sand-500">
      <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{note ?? NOTE[unavailable!]}</span>
    </div>;
  }
  if (!prompt || !onOpen) return null;
  const Icon = ICON[prompt.instrument];
  const defaultLabel = prompt.hints.mode === 'range' ? 'Choose dates' : LABEL[prompt.instrument];
  return <div className="ml-[2.625rem]">
    <button type="button" onClick={onOpen}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-forest-200 bg-white px-4 text-[0.875rem] font-medium text-forest-700 shadow-soft transition-colors hover:bg-forest-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 animate-fade-in-up">
      <Icon className="h-4 w-4" aria-hidden="true" />{prompt.hints.label ?? defaultLabel}
    </button>
  </div>;
}
