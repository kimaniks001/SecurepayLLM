import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { specKey, type InstrumentController } from '../controller';
import { canonicalRole } from '../../../api/securepay/agent/roles';
import { isValidKsNumber, normalizeKs } from '../../../api/securepay/agent/ksformat';
import { formatMoney, MAX_DETAIL_VALUE_LENGTH, parseAmount, parsePersonName, parsePlace, sameAmount, structuredInputFor, type InstrumentDraft, type InstrumentSpec } from '../model';
import { FOCUS, PrimaryButton, QuietButton } from './atoms';
import { SurfaceMount, SurfaceShell } from './SurfaceShell';
import { useReturnFocus, useSheetEscape, useSurfaceKeys } from './surfaceHooks';
import { WhoInstrument } from './WhoInstrument';
import { CalendarInstrument } from './CalendarInstrument';
import { MoneyInstrument } from './MoneyInstrument';
import { WhereInstrument } from './WhereInstrument';
import { DetailInstrument } from './DetailInstrument';

function titleFor(spec: InstrumentSpec, draft: InstrumentDraft | null): string {
  switch (spec.kind) {
    case 'who': { const role = (draft?.kind === 'who' && draft.role) || spec.role; return role ? `Add the ${role}` : 'Add a person'; }
    case 'when': return spec.mode === 'range' ? 'Which dates?' : 'When?';
    case 'money': return spec.amount ? 'Change the amount' : 'How much?';
    case 'where': return 'Where?';
    case 'detail': return `Correct ${spec.entityName}`;
  }
}
/** The primary action's label and readiness for the current draft -- `null` label means "no primary yet". */
function primaryFor(spec: InstrumentSpec, draft: InstrumentDraft): { label: string | null; ready: boolean } {
  if (spec.kind === 'who' && draft.kind === 'who') {
    const typedKs = draft.ks.trim();
    if (typedKs) return { label: `Check ${normalizeKs(typedKs)}`, ready: isValidKsNumber(typedKs) };
    const name = parsePersonName(draft.name, spec.takenNames);
    return { label: name.ok ? `Add ${name.value}${draft.role ? ` as ${draft.role}` : ''}` : 'Add person', ready: name.ok && !!canonicalRole(draft.role) };
  }
  if (spec.kind === 'when' && draft.kind === 'when') {
    if (spec.mode === 'range') {
      const ready = !!draft.date && !!draft.endDate && draft.date <= draft.endDate;
      return { label: 'Use these dates', ready };
    }
    return { label: 'Use this date', ready: !!draft.date };
  }
  if (spec.kind === 'money' && draft.kind === 'money') {
    const parsed = parseAmount(draft.amount);
    // (an unchanged amount is not a change, so it is not submittable)
    const unchanged = spec.amount && parsed.ok && sameAmount(spec.amount, parsed.value) && (spec.currency ?? draft.currency) === draft.currency;
    return { label: parsed.ok ? `Use ${formatMoney(parsed.value, draft.currency)}` : 'Use this amount', ready: parsed.ok && !unchanged };
  }
  if (spec.kind === 'where' && draft.kind === 'where') {
    // GPS-only is legitimate (Phase 4 review correction, Section 10/27): coordinates alone are enough to
    // submit, even with no typed place text.
    const hasCoordinates = draft.latitude != null && draft.longitude != null;
    return { label: 'Use this place', ready: parsePlace(draft.place).ok || (draft.place.trim() === '' && hasCoordinates) };
  }
  if (spec.kind === 'detail' && draft.kind === 'detail') {
    const changed = spec.fields.some(field => {
      const next = (draft.values[field.key] ?? '').trim();
      return next && next.length <= MAX_DETAIL_VALUE_LENGTH && next !== field.value;
    });
    return { label: 'Save this detail', ready: changed };
  }
  return { label: null, ready: false };
}

/** An honest, non-fabricated description of what pressing the primary button actually does -- an
 *  explicit structured action to SecurePay, never a chat sentence. */
function actionPreview(spec: InstrumentSpec, draft: InstrumentDraft): string | null {
  if (spec.kind === 'who' && draft.kind === 'who' && draft.ks.trim()) {
    return `Sends ${normalizeKs(draft.ks)} to SecurePay to check who it belongs to. This confirms an identity — it doesn’t add or accept anyone yet.`;
  }
  const body = structuredInputFor(spec, draft);
  return body ? 'This updates what SecurePay understands directly — nothing is agreed or paid.' : null;
}

/**
 * The single presentation of an active interaction instrument. Always mounted so that focus can be
 * returned to whatever invoked it. Desktop: an anchored panel in the UNDERSTOOD column (the
 * conversation stays fully visible beside it). Mobile: a bottom sheet that rides above the keyboard.
 */
export function InstrumentHost({ controller, agentBusy, agentUncertain, onBackToConversation, onFind, panelSlot }: {
  controller: InstrumentController; agentBusy: boolean;
  /** An earlier step's delivery is unresolved (it may or may not have been applied): nothing different is sent over it. */
  agentUncertain: boolean; onBackToConversation: () => void; onFind: () => void;
  /** Desktop: where the anchored panel is portalled (top of the UNDERSTOOD column). */
  panelSlot: HTMLElement | null;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const active = state.active;
  // Remember what invoked the instrument (before focus moves into it) and hand focus back on close.
  useReturnFocus(!!active);
  if (!active || !state.draft) return null;
  return <SurfaceMount panelSlot={panelSlot}>{variant => <Surface key={specKey(active)} controller={controller} state={state} agentBusy={agentBusy} agentUncertain={agentUncertain} onBackToConversation={onBackToConversation} onFind={onFind} variant={variant} />}</SurfaceMount>;
}

function Surface({ controller, state, agentBusy, agentUncertain, onBackToConversation, onFind, variant }: {
  controller: InstrumentController; state: ReturnType<InstrumentController['getSnapshot']>; agentBusy: boolean; agentUncertain: boolean;
  onBackToConversation: () => void; onFind: () => void; variant: 'panel' | 'sheet';
}) {
  const spec = state.active!; const draft = state.draft!;
  const root = useRef<HTMLDivElement>(null);
    const sending = state.phase === 'sending';
  // After a failed delivery the earlier action may already be applied, so the choice is frozen: Retry (same action) or Close.
  const locked = sending || state.phase === 'failed';
  const blocked = agentBusy || agentUncertain;
  const primary = primaryFor(spec, draft);
  const preview = actionPreview(spec, draft);
  const title = titleFor(spec, draft);

  // Deliberate initial focus: the field the person will type into, or the calendar's one tab stop.
  useEffect(() => {
    const el = root.current?.querySelector<HTMLElement>('[data-autofocus]') ?? root.current?.querySelector<HTMLElement>('button[data-iso][tabindex="0"]') ?? root.current?.querySelector<HTMLElement>('input,select,button');
    el?.focus({ preventScroll: variant === 'panel' });
  }, [variant, state.openCount]);

  const escape = () => { if (!sending) controller.cancel(); };
  const onKeyDown = useSurfaceKeys(root, variant, escape);
  useSheetEscape(variant, escape);
  const setDraft = (next: InstrumentDraft) => controller.setDraft(next);
  const submit = () => { if (primary.ready && !blocked && state.phase !== 'failed') void controller.submit(); };

  let body: ReactNode = null;
  if (spec.kind === 'who' && draft.kind === 'who') body = <WhoInstrument spec={spec} draft={draft} onChange={setDraft} disabled={locked} onSubmit={submit} onBackToConversation={onBackToConversation} onFind={onFind} />;
  else if (spec.kind === 'when' && draft.kind === 'when') body = <CalendarInstrument spec={spec} draft={draft} onChange={setDraft} disabled={locked} />;
  else if (spec.kind === 'money' && draft.kind === 'money') body = <MoneyInstrument spec={spec} draft={draft} onChange={setDraft} disabled={locked} onSubmit={submit} />;
  else if (spec.kind === 'where' && draft.kind === 'where') body = <WhereInstrument spec={spec} draft={draft} onChange={setDraft} disabled={locked} onSubmit={submit} />;
  else if (spec.kind === 'detail' && draft.kind === 'detail') body = <DetailInstrument spec={spec} draft={draft} onChange={setDraft} disabled={locked} onSubmit={submit} />;

  const content = <>
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-1">
      <h2 id="instrument-title" className="font-display text-[1.2rem] leading-snug text-forest-800">{title}</h2>
      <button type="button" onClick={() => controller.cancel()} disabled={sending} aria-label="Close" className={`-mr-2 -mt-1 h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-sand-500 hover:bg-cream-100 disabled:opacity-40 ${FOCUS}`}><X className="w-[1.15rem] h-[1.15rem]" aria-hidden="true" /></button>
    </div>
    <div className="px-5 pb-4 pt-2">{body}</div>
    <div className="sticky bottom-0 border-t border-cream-100 bg-white px-5 pt-3 pb-4 space-y-3">
      {(state.phase === 'failed' || state.phase === 'unrecorded') && state.error && <div role="alert" className="rounded-xl border border-ember-200 bg-ember-50 px-3.5 py-2.5 text-[0.85rem] text-sand-800">
        {state.error}
        {state.phase === 'failed' && <span className="block mt-1 text-sand-600">Closing this doesn’t undo it.</span>}
        <div className="mt-1 flex flex-wrap gap-x-3">
          {state.phase === 'failed' && <QuietButton onClick={() => void controller.retry()}>Retry</QuietButton>}
          <QuietButton onClick={() => void controller.recheck()}>Check what SecurePay understands</QuietButton>
          <QuietButton onClick={() => controller.cancel()}>Close</QuietButton>
        </div>
      </div>}
      {state.phase === 'editing' && state.error && <p role="alert" className="text-[0.82rem] text-ember-700">{state.error}</p>}
      {state.phase === 'editing' && agentUncertain && <p role="status" className="text-[0.8rem] text-sand-500">An earlier step hasn’t been confirmed yet. Retry it in the conversation before sending anything new.</p>}
      {state.phase === 'editing' && !agentUncertain && agentBusy && <p role="status" className="text-[0.8rem] text-sand-500">KS001 is still replying — you can choose now and send when it finishes.</p>}
      {primary.label && preview && state.phase !== 'failed' && <p className="text-[0.78rem] leading-snug text-sand-500">{preview}</p>}
      <div className="flex items-center justify-between gap-2">
        {state.phase !== 'failed' && <QuietButton onClick={() => controller.cancel()} disabled={sending}>Cancel</QuietButton>}
        {primary.label && state.phase !== 'failed' && <PrimaryButton onClick={submit} disabled={!primary.ready || blocked} busy={sending}>{sending ? 'Sending…' : primary.label}</PrimaryButton>}
      </div>
    </div>
  </>;

  return <SurfaceShell variant={variant} titleId="instrument-title" root={root} onKeyDown={onKeyDown} onBackdrop={() => { if (!sending) controller.cancel(); }}>{content}</SurfaceShell>;
}
