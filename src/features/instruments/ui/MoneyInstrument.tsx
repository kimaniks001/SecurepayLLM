import { formatMoney, isCurrencyCode, parseAmount, type InstrumentDraft, type MoneySpec } from '../model';
import { Field, INPUT } from './atoms';

/**
 * The amount editor. Decimal STRINGS only -- never converted to a JS number. Currency is explicit and
 * editable (Phase 4 of the Agent/Trade-Context Convergence removes the old KES-only assumption, an
 * artifact of the retired free-text interpreter): SecurePay validates the real ISO-4217 code server-side.
 * This is agreement UNDERSTANDING only -- never a payment, a reserved balance, or an executed FX rate.
 */
export function MoneyInstrument({ spec, draft, onChange, disabled, onSubmit }: {
  spec: MoneySpec; draft: Extract<InstrumentDraft, { kind: 'money' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean; onSubmit: () => void;
}) {
  const parsed = parseAmount(draft.amount);
  const problem = draft.amount.trim() === '' ? null
    : !parsed.ok ? (parsed.reason === 'zero' ? 'Enter an amount above zero.' : 'Use digits, with up to two decimals — for example 4,000 or 4,000.50.')
    : !isCurrencyCode(draft.currency) ? 'Enter a three-letter currency code, like KES, USD or EUR.'
    : null;
  return <form onSubmit={event => { event.preventDefault(); onSubmit(); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onSubmit(); } }} className="space-y-4">
    {spec.amount && <p className="text-[0.85rem] text-sand-600">SecurePay currently understands <span className="font-medium text-forest-800">{formatMoney(spec.amount, spec.currency ?? draft.currency)}</span>.</p>}
    <div className="flex items-stretch gap-2.5">
      <Field label="Currency" htmlFor="instrument-currency">
        <input id="instrument-currency" value={draft.currency} onChange={event => onChange({ ...draft, currency: event.target.value.toUpperCase().slice(0, 3) })} disabled={disabled}
          maxLength={3} autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false}
          className={`${INPUT} w-20 shrink-0 text-center font-medium tracking-wide uppercase`} />
      </Field>
      <Field label="Amount" htmlFor="instrument-amount">
        <input id="instrument-amount" data-autofocus value={draft.amount} onChange={event => onChange({ ...draft, amount: event.target.value })} disabled={disabled}
          inputMode="decimal" autoComplete="off" onFocus={event => event.currentTarget.select()} placeholder="0" aria-invalid={!!problem} aria-describedby="instrument-amount-note" className={`${INPUT} min-w-0 tabular-nums`} />
      </Field>
    </div>
    <p id="instrument-amount-note" role="status" className={`min-h-[1.25rem] text-[0.82rem] ${problem ? 'text-ember-700' : 'text-sand-500'}`}>
      {problem ?? (parsed.ok && isCurrencyCode(draft.currency) ? `${formatMoney(parsed.value, draft.currency)} — this is what you intend, not a payment.` : 'This is what you intend — not a payment.')}
    </p>
  </form>;
}
