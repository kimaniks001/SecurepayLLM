import { ksShape, normalizeKs } from '../../../api/securepay/agent/ksformat';
import type { InstrumentDraft, WhoSpec } from '../model';
import { Field, INPUT, QuietButton } from './atoms';

/**
 * KSFinder -- the architecture stays, the resolution is honestly OFF in Phase 1.
 *
 * SecurePay has no participant-safe way to check a KS Number from here: the identity endpoint returns the
 * whole identity record (internal id, sequence, timestamps), and the formation path only recognises
 * `KS` + 9 digits, so a platform number such as KS003 could be looked up but never attached to the
 * conversation. Rather than expose the full record, pad the number or keep an association only in
 * browser state, this instrument keeps what the person typed, says plainly what SecurePay cannot do,
 * and hands them back to the conversation. It never sends anything and never claims a match.
 */
export function WhoInstrument({ spec, draft, onChange, disabled, onBackToConversation }: {
  spec: WhoSpec; draft: Extract<InstrumentDraft, { kind: 'who' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean; onBackToConversation: () => void;
}) {
  const typed = draft.ks.trim();
  const shape = typed ? ksShape(typed) : null;
  return <div className="space-y-4">
    {spec.entityName && <p className="text-[0.85rem] text-sand-600">SecurePay heard <span className="font-medium text-forest-800">{spec.entityName}</span> but has no KS Number for them.</p>}
    <Field label="KS Number" htmlFor="instrument-ks" hint={shape === null ? 'For example KS003' : undefined}>
      <input id="instrument-ks" data-autofocus value={draft.ks} onChange={event => onChange({ ...draft, ks: event.target.value })} disabled={disabled}
        autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="KS003" aria-describedby="instrument-ks-note"
        className={`${INPUT} font-medium tracking-wide uppercase`} />
    </Field>
    <div id="instrument-ks-note" role="status" aria-live="polite" className="space-y-1 text-[0.85rem]">
      {shape === 'malformed' && <p className="text-ember-700">A KS Number looks like KS003 — the letters KS and at least three digits.</p>}
      {shape && shape !== 'malformed' && <p className="text-forest-800">{normalizeKs(typed)} looks like a SecurePay KS Number, but SecurePay can’t check it or attach it to this conversation from here yet.</p>}
      <p className="text-sand-500">Your KS Number stays here. To involve this person now, tell KS001 about them in the conversation.</p>
    </div>
    <div><QuietButton onClick={onBackToConversation}>Back to the conversation</QuietButton></div>
  </div>;
}
