import { useId, useState } from 'react';
import { MomentSheet } from '../../components/dna/MomentSheet';
import type { FormationOpenPoint, FormationSide } from './view';
import { pointQuestion, splitMoney } from './nextStep';

export type ResolveOutcome = { ok: true } | { ok: false; error: string };

/**
 * User-Ready Beta Gate 1 (EP-CERT-003/007) -- ONE decision, not the whole agreement. A LEVEL 4 moment (dialog on desktop,
 * bottom sheet on phones) that settles one open point and returns the person exactly where they were.
 *
 * When SecurePay already knows the alternatives (a conflict whose sides name their facts), each side has its own
 * "Use this": the server keeps that side and retracts the rest (RESOLVE_CONFLICT -- version-pinned, idempotent, history
 * kept). For money, "Enter another amount" settles it with a typed figure in the same action. When a side cannot be settled
 * here (e.g. already confirmed), or for anything else, the person tells KS001 in their own words -- never a dead end.
 */
export function MicroReview({ point, busy, onUse, onTell, onCheck, onClose }: {
  point: FormationOpenPoint;
  busy: boolean;
  onUse: (side: FormationSide, amount?: { amount: string; currency: string }) => Promise<ResolveOutcome>;
  onTell: (text: string) => Promise<ResolveOutcome>;
  onCheck?: () => void;
  onClose: () => void;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [other, setOther] = useState(false);
  const firstMoney = point.sides.find(s => s.choosable) ?? null;
  const prefill = firstMoney ? splitMoney(firstMoney.value) : { amount: '', currency: '' };
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(prefill.currency);
  const [words, setWords] = useState('');
  const amountId = useId();
  const wordsId = useId();
  const choosable = point.kind === 'CONFLICT' && point.sides.some(s => s.choosable);
  const moneyConflict = choosable && point.topic === 'MONEY' && !!firstMoney;

  const run = async (attempt: () => Promise<ResolveOutcome>) => {
    setWorking(true); setError(null);
    try {
      const outcome = await attempt();
      if (outcome.ok) onClose(); else setError(outcome.error);
    } finally { setWorking(false); }
  };
  const disabled = busy || working;
  const choice = 'inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[0.88rem] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 disabled:opacity-50';

  return (
    <MomentSheet title={pointQuestion(point)} onClose={onClose} description={point.text}>
      {choosable && <ul className="space-y-2" aria-label="Choose one">
        {point.sides.map((side, i) => (
          <li key={`${side.factId ?? i}`} className="surface-info flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[1rem] text-forest-900 break-words">{side.value}</p>
              {side.from && <p className="text-[0.8rem] text-sand-700">from {side.from}</p>}
            </div>
            {side.choosable && <button type="button" data-autofocus={i === 0 ? true : undefined} disabled={disabled}
              onClick={() => void run(() => onUse(side))} aria-label={`Use ${side.value}${side.from ? ` from ${side.from}` : ''}`}
              className={`${choice} bg-forest-700 text-white hover:bg-forest-800`}>Use this</button>}
          </li>
        ))}
      </ul>}

      {moneyConflict && (other ? (
        <form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); if (amount.trim() && firstMoney) void run(() => onUse(firstMoney, { amount: amount.trim().replace(/,/g, ''), currency: currency.trim().toUpperCase() })); }}>
          <label htmlFor={amountId} className="block text-[0.85rem] text-forest-800">The right amount</label>
          <div className="flex gap-2">
            <input aria-label="Currency" value={currency} onChange={e => setCurrency(e.target.value.toUpperCase().slice(0, 3))} maxLength={3} autoCapitalize="characters"
              className="min-h-11 w-20 rounded-xl border border-cream-300 bg-white px-3 text-[0.95rem] uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300" />
            <input id={amountId} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder={prefill.amount || '95000'} autoFocus
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-cream-300 bg-white px-3 text-[0.95rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300" />
            <button type="submit" disabled={disabled || !amount.trim() || currency.trim().length !== 3} className={`${choice} border border-forest-300 bg-white text-forest-700`}>Use</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setOther(true)} disabled={disabled} className="mt-3 min-h-11 text-[0.88rem] text-forest-700 underline">Enter another amount</button>
      ))}

      {point.checkable && onCheck && (
        <button type="button" disabled={disabled} onClick={() => { onCheck(); onClose(); }} data-autofocus={!choosable ? true : undefined}
          className={`mt-3 ${choice} border border-forest-300 bg-white text-forest-700`}>{point.checked ? 'Checked' : 'This is right — mark as checked'}</button>
      )}

      {/* Words always work: the person can explain it to KS001 (the conversational path), never trapped by the buttons. */}
      <form className="mt-4 border-t rule-quiet pt-3" onSubmit={e => { e.preventDefault(); const text = words.trim(); if (text) void run(() => onTell(text)); }}>
        <label htmlFor={wordsId} className="block text-[0.82rem] text-sand-700">{choosable ? 'Or tell KS001 in your own words' : 'Tell KS001 what’s right'}</label>
        <div className="mt-1.5 flex gap-2">
          <input id={wordsId} value={words} onChange={e => setWords(e.target.value)} readOnly={working}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-cream-300 bg-white px-3 text-[0.9rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300" />
          <button type="submit" disabled={disabled || !words.trim()} className={`${choice} border border-forest-300 bg-white text-forest-700`}>Send</button>
        </div>
      </form>

      <div aria-live="assertive">{error && <p role="alert" className="mt-3 text-[0.85rem] text-ember-800">{error}</p>}</div>
    </MomentSheet>
  );
}
