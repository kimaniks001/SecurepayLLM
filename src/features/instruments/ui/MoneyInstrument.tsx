import { formatMoney, isCurrencyCode, parseAmount, type InstrumentDraft, type MoneySpec } from '../model';
import { Field, INPUT } from './atoms';

/** The amount editor. Decimal STRINGS only -- the value is never converted to a JS number. */
export function MoneyInstrument({ spec, draft, onChange, disabled, onSubmit }: {
  spec: MoneySpec; draft: Extract<InstrumentDraft, { kind: 'money' }>; onChange: (draft: InstrumentDraft) => void; disabled: boolean; onSubmit: () => void;
}) {
  const parsed = parseAmount(draft.amount);
  const currencyOk = isCurrencyCode(draft.currency);
  const problem = draft.amount.trim() === '' ? null
    : !parsed.ok ? (parsed.reason === 'zero' ? 'Enter an amount above zero.' : 'Use digits, with up to two decimals — for example 4,000 or 4,000.50.')
    : null;
  return <form onSubmit={event => { event.preventDefault(); onSubmit(); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onSubmit(); } }} className="space-y-4">
    {spec.amount && <p className="text-[0.85rem] text-sand-600">SecurePay currently understands <span className="font-medium text-forest-800">{formatMoney(spec.amount, spec.currency ?? '')}</span>.</p>}
    <div className="flex gap-2.5">
      <div className="w-24 shrink-0">
        <Field label="Currency" htmlFor="instrument-currency">
          <input id="instrument-currency" value={draft.currency} onChange={event => onChange({ ...draft, currency: event.target.value.toUpperCase().slice(0, 3) })} disabled={disabled}
            autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-invalid={!currencyOk} className={`${INPUT} text-center font-medium tracking-wide`} />
        </Field>
      </div>
      <div className="flex-1 min-w-0">
        <Field label="Amount" htmlFor="instrument-amount">
          <input id="instrument-amount" data-autofocus value={draft.amount} onChange={event => onChange({ ...draft, amount: event.target.value })} disabled={disabled}
            inputMode="decimal" autoComplete="off" onFocus={event => event.currentTarget.select()} placeholder="0" aria-invalid={!!problem} aria-describedby="instrument-amount-note" className={`${INPUT} tabular-nums`} />
        </Field>
      </div>
    </div>
    <p id="instrument-amount-note" role="status" className={`min-h-[1.25rem] text-[0.82rem] ${problem ? 'text-ember-700' : 'text-sand-500'}`}>
      {problem ?? (parsed.ok && currencyOk ? formatMoney(parsed.value, draft.currency) : !currencyOk ? 'Use a three-letter currency such as KES.' : 'This is what you intend — not a payment.')}
    </p>
  </form>;
}
