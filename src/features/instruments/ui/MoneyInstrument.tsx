import { formatMoney, FORMATION_CURRENCY, parseAmount, type InstrumentDraft, type MoneySpec } from '../model';
import { Field, INPUT } from './atoms';

/**
 * The amount editor. Decimal STRINGS only -- never converted to a JS number. KES only: the formation
 * interpreter files every recognised amount as KES, so another currency could be typed here but never
 * read back as what was meant.
 */
export function MoneyInstrument({ spec, draft, onChange, disabled, onSubmit }: {
  spec: MoneySpec; draft: Extract<InstrumentDraft, { kind: 'money' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean; onSubmit: () => void;
}) {
  const parsed = parseAmount(draft.amount);
  const problem = draft.amount.trim() === '' ? null
    : !parsed.ok ? (parsed.reason === 'zero' ? 'Enter an amount above zero.' : 'Use digits, with up to two decimals — for example 4,000 or 4,000.50.')
    : null;
  return <form onSubmit={event => { event.preventDefault(); onSubmit(); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onSubmit(); } }} className="space-y-4">
    {spec.amount && <p className="text-[0.85rem] text-sand-600">SecurePay currently understands <span className="font-medium text-forest-800">{formatMoney(spec.amount, FORMATION_CURRENCY)}</span>.</p>}
    <Field label={`Amount in ${FORMATION_CURRENCY}`} htmlFor="instrument-amount">
      <div className="flex items-stretch gap-2.5">
        <span aria-hidden="true" className="flex w-16 shrink-0 items-center justify-center rounded-xl border border-cream-300 bg-cream-100 font-medium tracking-wide text-sand-700">{FORMATION_CURRENCY}</span>
        <input id="instrument-amount" data-autofocus value={draft.amount} onChange={event => onChange({ ...draft, amount: event.target.value })} disabled={disabled}
          inputMode="decimal" autoComplete="off" onFocus={event => event.currentTarget.select()} placeholder="0" aria-invalid={!!problem} aria-describedby="instrument-amount-note" className={`${INPUT} min-w-0 tabular-nums`} />
      </div>
    </Field>
    <p id="instrument-amount-note" role="status" className={`min-h-[1.25rem] text-[0.82rem] ${problem ? 'text-ember-700' : 'text-sand-500'}`}>
      {problem ?? (parsed.ok ? formatMoney(parsed.value, FORMATION_CURRENCY) : 'Kenya shillings only for now. This is what you intend — not a payment.')}
    </p>
  </form>;
}
