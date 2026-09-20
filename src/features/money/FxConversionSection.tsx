import { useState } from 'react';
import { ApiError } from '../../api/securepay/http';
import type { FxApplicationGateway, FxApplicationResponse, FxOperation } from '../../api/securepay/fx-application';
import type { RegulatedAccountMapping, RegulatedAccountsGateway } from '../../api/securepay/regulated-accounts';
import { Surface, SurfaceHeader, SurfaceBody } from '../../components/dna/Surface';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { Button } from '../../components/dna/Button';
import { MoneyValue } from '../../components/dna/MoneyValue';
import { moneyText, parseMinorUnits, AMOUNT_PROBLEM } from './amount';
import { createAttemptStore, isUncertainFinancialError, UNCERTAIN_MONEY, UNRESOLVED_ATTEMPT } from './attempt';

function money(minor: number, currency: string) { return moneyText(minor, currency); }

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'SecurePay could not complete this action.';
}

/**
 * Currency/FX convergence -- "The customer chooses" (locked doctrine). Money stays simple: keep
 * the currency you already hold, or convert some of it into another of your own active positions.
 * Never forces conversion just because a default/home currency differs. This never touches an
 * Agreement or its Agreement Money -- it only converts between the caller's own already-ACTIVE
 * regulated positions, exactly the doctrine's "optional FX" scenario.
 */
export function FxConversionSection({ regulatedAccountsGateway, fxApplicationGateway }: {
  regulatedAccountsGateway: RegulatedAccountsGateway;
  fxApplicationGateway: FxApplicationGateway;
}) {
  const [accounts, setAccounts] = useState<RegulatedAccountMapping[] | null>(null);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [operation, setOperation] = useState<FxOperation>('SELL');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<FxApplicationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts] = useState(() => createAttemptStore());
  const [uncertain, setUncertain] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try { setAccounts((await regulatedAccountsGateway.listMine()).filter(a => a.accountStatus === 'ACTIVE')); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  };

  const submit = async () => {
    if (!sourceId || !targetId || !amount) return;
    const parsed = parseMinorUnits(amount);
    if (!parsed.ok) { setError(AMOUNT_PROBLEM[parsed.reason]); return; }
    setLoading(true); setError(null); setResult(null);
    // One logical conversion = one key + one exact request: a retry after an uncertain outcome re-sends the SAME request.
    const request = { sourceAccountMappingId: sourceId, targetAccountMappingId: targetId, operation, amountMinor: parsed.minor };
    try {
      const attempt = attempts.keyFor(JSON.stringify(request));
      if (!attempt.ok) { setError(UNRESOLVED_ATTEMPT); setLoading(false); return; }
      setResult(await fxApplicationGateway.create(request, attempt.key));
      attempts.settle(); setUncertain(false);
    } catch (cause) {
      if (isUncertainFinancialError(cause)) { setUncertain(true); setError(`${UNCERTAIN_MONEY} Trying again sends the same request, so it can’t be recorded twice.`); }
      else { attempts.settle(); setUncertain(false); setError(errorText(cause)); }
    }
    finally { setLoading(false); }
  };

  return (
    <Surface>
      <SurfaceHeader title="Convert currency" description="Optional. Keep what you already have, or convert some of it into another of your own active positions. Nothing is forced." />
      <SurfaceBody>
        {error && <StatusNotice tone="warning">{error}</StatusNotice>}
        {!accounts ? (
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>Show my active positions</Button>
        ) : accounts.length < 2 ? (
          <p className="text-sm text-sand-600">You need at least two active currency positions to convert between them.</p>
        ) : result ? (
          <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-1">
            <div className="font-medium text-forest-800"><MoneyValue amount={money(result.amountMinor, result.sourceCurrency)} size="md" /> {'->'} {result.targetCurrency}</div>
            <div className="text-xs text-sand-600">Status: {result.status}</div>
            <p className="text-xs text-sand-500">This does not change your Agreement or its Agreement Money -- it converts money you already hold.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <select value={sourceId} disabled={uncertain} onChange={e => setSourceId(e.target.value)} className="rounded-xl border border-cream-200 px-3 py-2 text-sm">
                <option value="">From</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.currency} · {a.maskedAccountReference}</option>)}
              </select>
              <select value={targetId} disabled={uncertain} onChange={e => setTargetId(e.target.value)} className="rounded-xl border border-cream-200 px-3 py-2 text-sm">
                <option value="">To</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.currency} · {a.maskedAccountReference}</option>)}
              </select>
            </div>
            <div className="flex gap-2 text-xs">
              <button disabled={uncertain} onClick={() => setOperation('SELL')} className={`rounded-full px-3 py-1 ${operation === 'SELL' ? 'bg-forest-700 text-white' : 'bg-cream-100 text-sand-700'}`}>Sell</button>
              <button disabled={uncertain} onClick={() => setOperation('BUY')} className={`rounded-full px-3 py-1 ${operation === 'BUY' ? 'bg-forest-700 text-white' : 'bg-cream-100 text-sand-700'}`}>Buy</button>
            </div>
            <input value={amount} disabled={uncertain} onChange={e => setAmount(e.target.value)} placeholder="Amount" inputMode="decimal" autoComplete="off" aria-label="Amount" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-sm" />
            {/* Phase 3 Money World (Section 18), corrected by the deep-review pass: FxApplicationResponse
                carries no rate/fee field -- Choice's own contract is application-based, never an
                instant quote -- so this says so honestly. The original wording claimed the rate is
                "set when the provider approves the application," which overstates what this
                frontend/backend contract actually proves -- narrowed to what's genuinely known. */}
            <p className="text-xs text-sand-500">SecurePay does not show a rate before you apply. The confirmed rate will come from the provider when it becomes available.</p>
            <Button onClick={() => void submit()} disabled={loading || !sourceId || !targetId || !amount}>{uncertain ? 'Try the same request again' : 'Convert'}</Button>
          </>
        )}
      </SurfaceBody>
    </Surface>
  );
}
