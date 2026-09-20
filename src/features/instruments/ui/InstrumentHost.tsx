import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { KsIdentityDto } from '../../../api/securepay/agent/dto';
import { specKey, type InstrumentController } from '../controller';
import { formatMoney, isCurrencyCode, parseAmount, statementFor, type InstrumentDraft, type InstrumentSpec } from '../model';
import { FOCUS, PrimaryButton, QuietButton } from './atoms';
import { useIsDesktop, useKeyboardInset } from './hooks';
import { WhoInstrument } from './WhoInstrument';
import { CalendarInstrument } from './CalendarInstrument';
import { MoneyInstrument } from './MoneyInstrument';
import { WhereInstrument } from './WhereInstrument';

function titleFor(spec: InstrumentSpec, draft: InstrumentDraft | null): string {
  switch (spec.kind) {
    case 'who': { const role = (draft?.kind === 'who' && draft.role) || spec.role; return role ? `Who is the ${role}?` : 'Who is this with?'; }
    case 'when': return 'When?';
    case 'when-range': return 'Which dates?';
    case 'money': return spec.amount ? 'Change the amount' : 'How much?';
    case 'where': return 'Where?';
  }
}
/** The primary action's label and readiness for the current draft -- `null` label means "no primary yet". */
function primaryFor(spec: InstrumentSpec, draft: InstrumentDraft): { label: string | null; ready: boolean } {
  if (spec.kind === 'who' && draft.kind === 'who') return { label: draft.ks ? `Use ${draft.ks}${draft.role ? ` as ${draft.role}` : ''}` : null, ready: !!draft.ks && !!draft.role };
  if (spec.kind === 'when' && draft.kind === 'when') return { label: 'Use this date', ready: !!draft.date };
  if (spec.kind === 'when-range' && draft.kind === 'when-range') return { label: 'Use these dates', ready: !!draft.start && !!draft.end };
  if (spec.kind === 'money' && draft.kind === 'money') { const parsed = parseAmount(draft.amount); const ok = parsed.ok && isCurrencyCode(draft.currency); return { label: ok && parsed.ok ? `Use ${formatMoney(parsed.value, draft.currency)}` : 'Use this amount', ready: ok }; }
  if (spec.kind === 'where' && draft.kind === 'where') return { label: 'Use this place', ready: draft.place.trim().length > 0 };
  return { label: null, ready: false };
}

/**
 * The single presentation of an active interaction instrument. Always mounted so that focus can be
 * returned to whatever invoked it. Desktop: an anchored panel in the UNDERSTOOD column (the
 * conversation stays fully visible beside it). Mobile: a bottom sheet that rides above the keyboard.
 */
export function InstrumentHost({ controller, agentBusy, lookup, onFindOnSecurePay, panelSlot }: {
  controller: InstrumentController; agentBusy: boolean; lookup: (ks: string) => Promise<KsIdentityDto>; onFindOnSecurePay: () => void;
  /** Desktop: where the anchored panel is portalled (top of the UNDERSTOOD column). */
  panelSlot: HTMLElement | null;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const desktop = useIsDesktop();
  const returnFocus = useRef<HTMLElement | null>(null);
  const wasActive = useRef(false);
  const active = state.active;

  // Remember what invoked the instrument (before focus moves into it) and hand focus back on close.
  useLayoutEffect(() => {
    if (active && !wasActive.current) returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!active && wasActive.current) {
      const target = returnFocus.current;
      returnFocus.current = null;
      if (target && document.contains(target) && !target.hasAttribute('disabled')) target.focus();
    }
    wasActive.current = !!active;
  }, [active]);

  if (!active || !state.draft) return null;
  const surface = <Surface key={specKey(active)} controller={controller} state={state} agentBusy={agentBusy} lookup={lookup} onFindOnSecurePay={onFindOnSecurePay} variant={desktop ? 'panel' : 'sheet'} />;
  if (!desktop) return surface;
  return panelSlot ? createPortal(surface, panelSlot) : null;
}

function Surface({ controller, state, agentBusy, lookup, onFindOnSecurePay, variant }: {
  controller: InstrumentController; state: ReturnType<InstrumentController['getSnapshot']>; agentBusy: boolean;
  lookup: (ks: string) => Promise<KsIdentityDto>; onFindOnSecurePay: () => void; variant: 'panel' | 'sheet';
}) {
  const spec = state.active!; const draft = state.draft!;
  const root = useRef<HTMLDivElement>(null);
  const keyboardInset = useKeyboardInset(variant === 'sheet');
  const sending = state.phase === 'sending';
  const locked = sending;
  const primary = primaryFor(spec, draft);
  const statement = statementFor(spec, draft, {
    previousAmount: spec.kind === 'money' ? spec.amount : undefined, previousCurrency: spec.kind === 'money' ? spec.currency : undefined,
    previousDateText: spec.kind === 'when' ? spec.currentText : undefined, previousPlace: spec.kind === 'where' ? spec.currentText : undefined,
  });
  const title = titleFor(spec, draft);

  // Deliberate initial focus: the field the person will type into, or the calendar's one tab stop.
  useEffect(() => {
    const el = root.current?.querySelector<HTMLElement>('[data-autofocus]') ?? root.current?.querySelector<HTMLElement>('button[data-iso][tabindex="0"]') ?? root.current?.querySelector<HTMLElement>('input,select,button');
    el?.focus({ preventScroll: variant === 'panel' });
  }, [variant, state.openCount]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.stopPropagation(); if (!sending) controller.cancel(); return; }
    if (variant === 'sheet' && event.key === 'Tab' && root.current) {
      const focusables = [...root.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')].filter(el => el.tabIndex >= 0);
      if (focusables.length === 0) return;
      const first = focusables[0]; const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };
  const setDraft = (next: InstrumentDraft) => controller.setDraft(next);
  const submit = () => { if (primary.ready && !agentBusy) void controller.submit(); };

  let body: ReactNode = null;
  if (spec.kind === 'who' && draft.kind === 'who') body = <WhoInstrument spec={spec} draft={draft} onChange={setDraft} disabled={locked} lookup={lookup} onFindOnSecurePay={onFindOnSecurePay} />;
  else if ((spec.kind === 'when' || spec.kind === 'when-range') && (draft.kind === 'when' || draft.kind === 'when-range')) body = <CalendarInstrument spec={spec} draft={draft} onChange={setDraft} disabled={locked} />;
  else if (spec.kind === 'money' && draft.kind === 'money') body = <MoneyInstrument spec={spec} draft={draft} onChange={setDraft} disabled={locked} onSubmit={submit} />;
  else if (spec.kind === 'where' && draft.kind === 'where') body = <WhereInstrument spec={spec} draft={draft} onChange={setDraft} disabled={locked} onSubmit={submit} />;

  const content = <>
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-1">
      <h2 id="instrument-title" className="font-display text-[1.2rem] leading-snug text-forest-800">{title}</h2>
      <button type="button" onClick={() => controller.cancel()} disabled={sending} aria-label="Close" className={`-mr-2 -mt-1 h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-sand-500 hover:bg-cream-100 disabled:opacity-40 ${FOCUS}`}><X className="w-[1.15rem] h-[1.15rem]" aria-hidden="true" /></button>
    </div>
    <div className="px-5 pb-4 pt-2">{body}</div>
    <div className="sticky bottom-0 border-t border-cream-100 bg-white px-5 pt-3 pb-4 space-y-3">
      {(state.phase === 'failed' || state.phase === 'unrecorded') && state.error && <div role="alert" className="rounded-xl border border-ember-200 bg-ember-50 px-3.5 py-2.5 text-[0.85rem] text-sand-800">
        {state.error}
        <div className="mt-1 flex flex-wrap gap-x-3">
          {state.phase === 'failed' && <QuietButton onClick={() => void controller.retry()}>Retry</QuietButton>}
          {state.phase === 'unrecorded' && <QuietButton onClick={() => void controller.recheck()}>Check again</QuietButton>}
          <QuietButton onClick={() => controller.cancel()}>Cancel</QuietButton>
        </div>
      </div>}
      {agentBusy && state.phase === 'editing' && <p role="status" className="text-[0.8rem] text-sand-500">KS001 is still replying — you can choose now and send when it finishes.</p>}
      {primary.label && statement && <p className="text-[0.78rem] leading-snug text-sand-500">Tells KS001: “{statement}” This updates what SecurePay understands — nothing is agreed or paid.</p>}
      <div className="flex items-center justify-between gap-2">
        <QuietButton onClick={() => controller.cancel()} disabled={sending}>Cancel</QuietButton>
        {primary.label && <PrimaryButton onClick={submit} disabled={!primary.ready || agentBusy} busy={sending}>{sending ? 'Sending…' : primary.label}</PrimaryButton>}
      </div>
    </div>
  </>;

  if (variant === 'panel') {
    return <div ref={root} role="region" aria-labelledby="instrument-title" onKeyDown={onKeyDown}
      className="rounded-2xl border border-forest-200 bg-white shadow-lifted animate-fade-in-up">{content}</div>;
  }
  return <div className="fixed inset-0 z-40">
    <div aria-hidden="true" className="absolute inset-0 bg-forest-900/30 animate-fade-in" onClick={() => { if (!sending) controller.cancel(); }} />
    <div ref={root} role="dialog" aria-modal="true" aria-labelledby="instrument-title" onKeyDown={onKeyDown}
      style={{ bottom: keyboardInset }} className="absolute inset-x-0 max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-white shadow-lifted animate-fade-in-up pb-[env(safe-area-inset-bottom)]">
      <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-cream-400" />
      {content}
    </div>
  </div>;
}
