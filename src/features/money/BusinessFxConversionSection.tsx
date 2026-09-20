import { useState } from 'react';
import { ApiError } from '../../api/securepay/http';
import type { BusinessCurrencyCapabilityGateway, CurrencyCapability } from '../../api/securepay/business-currency-capability';
import type { BusinessFxApplicationGateway, FxApplicationResponse, FxOperation } from '../../api/securepay/business-fx-application';
import { Surface, SurfaceHeader, SurfaceBody } from '../../components/dna/Surface';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { Button } from '../../components/dna/Button';
import { MoneyValue } from '../../components/dna/MoneyValue';
import { moneyText, parseMinorUnits, AMOUNT_PROBLEM } from './amount';
import { createAttemptStore, isUncertainFinancialError, UNCERTAIN_MONEY } from './attempt';

function money(minor: number, currency: string) { return moneyText(minor, currency); }

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'SecurePay could not complete this action.';
}

/**
 * Currency/FX convergence -- Business FX authority. An authorized Business actor may convert
 * between two of the Business's own already-ACTIVE regulated currency positions; ordinary Business
 * membership alone does not grant this (server-enforced, not merely a UI affordance). Source and
 * target must be the same Business's own positions -- this never lets one Business use another
 * Business's account mappings, and never touches any Agreement or its Agreement Money.
 */
export function BusinessFxConversionSection({ capabilityGateway, fxApplicationGateway }: {
  capabilityGateway: BusinessCurrencyCapabilityGateway;
  fxApplicationGateway: BusinessFxApplicationGateway;
}) {
  const [businessKsNumber, setBusinessKsNumber] = useState('');
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [positions, setPositions] = useState<CurrencyCapability[] | null>(null);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [operation, setOperation] = useState<FxOperation>('SELL');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<FxApplicationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!businessKsNumber.trim()) return;
    setLoading(true); setError(null);
    try {
      const items = (await capabilityGateway.list(businessKsNumber)).items;
      setPositions(items.filter(item => item.status === 'ACTIVE' && item.regulatedAccountMappingId));
      setLoadedFor(businessKsNumber);
    } catch (cause) { setError(errorText(cause)); setPositions(null); setLoadedFor(null); }
    finally { setLoading(false); }
  };

  const [attempts] = useState(() => createAttemptStore());
  const [uncertain, setUncertain] = useState(false);
  const submit = async () => {
    if (!loadedFor || !sourceId || !targetId || !amount) return;
    const parsed = parseMinorUnits(amount);
    if (!parsed.ok) { setError(AMOUNT_PROBLEM[parsed.reason]); return; }
    setLoading(true); setError(null); setResult(null);
    const request = { sourceAccountMappingId: sourceId, targetAccountMappingId: targetId, operation, amountMinor: parsed.minor };
    try {
      setResult(await fxApplicationGateway.create(loadedFor, request, attempts.keyFor(JSON.stringify([loadedFor, request]))));
      attempts.settle(); setUncertain(false);
    } catch (cause) {
      if (isUncertainFinancialError(cause)) { setUncertain(true); setError(`${UNCERTAIN_MONEY} Trying again sends the same request, so it can’t be recorded twice.`); }
      else { attempts.settle(); setUncertain(false); setError(errorText(cause)); }
    }
    finally { setLoading(false); }
  };

  return (
    <Surface>
      <SurfaceHeader title="Convert Business currency" description="Optional. Keep what the Business already holds, or convert some of it into another of its own active positions. Nothing is forced." />
      <SurfaceBody>
        {error && <StatusNotice tone="warning">{error}</StatusNotice>}
        {!positions ? (
          <div className="flex gap-2">
            <input
              value={businessKsNumber}
              onChange={e => setBusinessKsNumber(e.target.value)}
              placeholder="Business KS Number"
              className="flex-1 rounded-xl border border-cream-200 px-3 py-2 text-sm"
            />
            <Button variant="secondary" onClick={() => void load()} disabled={loading || !businessKsNumber.trim()}>
              {loading ? 'Loading…' : 'Show active positions'}
            </Button>
          </div>
        ) : positions.length < 2 ? (
          <div className="space-y-2">
            <p className="text-sm text-sand-600">This Business needs at least two active currency positions to convert between them.</p>
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        ) : result ? (
          <div className="rounded-xl bg-cream-50 p-3 text-sm text-sand-700 space-y-1">
            <div className="font-medium text-forest-800"><MoneyValue amount={money(result.amountMinor, result.sourceCurrency)} size="md" /> {'->'} {result.targetCurrency}</div>
            <div className="text-xs text-sand-600">Status: {result.status}</div>
            {result.providerExecutionReference && <div className="text-xs text-sand-500">Provider reference: {result.providerExecutionReference}</div>}
            <p className="text-xs text-sand-500">This does not change any Agreement or its Agreement Money -- it converts money the Business already holds.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <select value={sourceId} disabled={uncertain} onChange={e => setSourceId(e.target.value)} className="rounded-xl border border-cream-200 px-3 py-2 text-sm">
                <option value="">From</option>
                {positions.map(p => <option key={p.currency} value={p.regulatedAccountMappingId ?? ''}>{p.currency}</option>)}
              </select>
              <select value={targetId} disabled={uncertain} onChange={e => setTargetId(e.target.value)} className="rounded-xl border border-cream-200 px-3 py-2 text-sm">
                <option value="">To</option>
                {positions.map(p => <option key={p.currency} value={p.regulatedAccountMappingId ?? ''}>{p.currency}</option>)}
              </select>
            </div>
            <div className="flex gap-2 text-xs">
              <button onClick={() => setOperation('SELL')} className={`rounded-full px-3 py-1 ${operation === 'SELL' ? 'bg-forest-700 text-white' : 'bg-cream-100 text-sand-700'}`}>Sell</button>
              <button onClick={() => setOperation('BUY')} className={`rounded-full px-3 py-1 ${operation === 'BUY' ? 'bg-forest-700 text-white' : 'bg-cream-100 text-sand-700'}`}>Buy</button>
            </div>
            <input value={amount} disabled={uncertain} onChange={e => setAmount(e.target.value)} placeholder="Amount" inputMode="decimal" autoComplete="off" aria-label="Amount" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-sm" />
            {/* Deep-review correction: the original wording claimed the rate is "set when the
                provider approves the application," which overstates what this contract proves. */}
            <p className="text-xs text-sand-500">SecurePay does not show a rate before you apply. The confirmed rate will come from the provider when it becomes available.</p>
            <Button onClick={() => void submit()} disabled={loading || !sourceId || !targetId || !amount}>{uncertain ? 'Try the same request again' : 'Convert'}</Button>
          </>
        )}
      </SurfaceBody>
    </Surface>
  );
}
