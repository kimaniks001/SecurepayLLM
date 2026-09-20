import { useCallback, useEffect, useState } from 'react';
import { Surface, SurfaceHeader, SurfaceBody } from '../../components/dna/Surface';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { MoneyValue } from '../../components/dna/MoneyValue';
import { Button } from '../../components/dna/Button';
import type { MoneyGateway } from '../../api/securepay/money';
import type { PaymentIntentGateway } from '../../api/securepay/payment-intent';
import type { PaymentReleaseGateway, ReleaseSettlementStatusResponse } from '../../api/securepay/payment-release';
import type { AgreementMoneyStatusResponse, AgreementMoneyRecordResponse } from '../../api/securepay/agreements/dto';
import type { AgreementFundingAuthorityResponse, AgreementFundingOptionResponse, AgreementPaymentIntentSummaryResponse } from '../../api/securepay/payment-intent/dto';
import type { ReleaseAuthorityResponse, ReleaseInstructionResponse } from '../../api/securepay/payment-release';
import { moneyText, minorFromString } from './amount';
import { fundingReasonWords, intentWords, IN_FLIGHT_INTENT, paymentReadyFacts, reasonWords, recordWords, releaseReasonWords, settlementPhaseWords } from './display';

/** Every panel reads independently and says so when it can't: an unread thing is UNKNOWN, never zero, none or pending. */
type Read<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

function useRead<T>(load: () => Promise<T>, key: string): [Read<T>, () => void] {
  const [state, setState] = useState<Read<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    load().then(data => { if (live) setState({ status: 'ready', data }); }).catch(() => { if (live) setState({ status: 'error' }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  return [state, useCallback(() => setTick(n => n + 1), [])];
}

function Panel({ title, description, children, onRefresh }: { title: string; description: string; children: React.ReactNode; onRefresh?: () => void }) {
  return (
    <Surface>
      <SurfaceHeader title={title} description={description} />
      <SurfaceBody>
        {children}
        {onRefresh && <Button variant="ghost" onClick={onRefresh} className="text-xs">Refresh</Button>}
      </SurfaceBody>
    </Surface>
  );
}
const Unknown = ({ text }: { text: string }) => <StatusNotice tone="warning">{text}</StatusNotice>;
const Loading = ({ text }: { text: string }) => <p role="status" className="text-sm text-sand-500">{text}</p>;

/**
 * Amount authority (each figure has ONE source and is never mixed):
 *  - "Agreed amount"  = the Agreement row's proposedAmountMinor (what the parties proposed);
 *  - "Evaluated for Payment Ready" = money-status.evaluatedAmountMinor (what SecurePay evaluated readiness against).
 * If both are present in the same currency and differ, that is SURFACED, not reconciled here.
 */
export function PaymentReadyPanel({ gateway, agreementId, agreedAmountMinor, agreementCurrency }: {
  gateway: MoneyGateway; agreementId: string; agreedAmountMinor: string | null; agreementCurrency: string;
}) {
  const [state, refresh] = useRead<AgreementMoneyStatusResponse>(() => gateway.status(agreementId), agreementId);
  return (
    <Panel title="Payment Ready" description="Whether SecurePay says the conditions for the next financial step are satisfied. Payment Ready is not a payment." onRefresh={refresh}>
      {state.status === 'loading' && <Loading text="Checking Payment Ready…" />}
      {state.status === 'error' && <Unknown text="Payment readiness couldn’t be loaded. That doesn’t mean it’s blocked or ready." />}
      {state.status === 'ready' && (() => {
        const s = state.data;
        const facts = paymentReadyFacts(s.paymentReadyStatus, s.paymentReady);
        const agreed = minorFromString(agreedAmountMinor);
        const mismatch = agreed !== null && s.evaluatedCurrency === agreementCurrency && String(s.evaluatedAmountMinor) !== String(agreed);
        return (
          <div className="space-y-2 text-sm text-sand-700">
            <p className="font-medium text-forest-800">{facts.headline}</p>
            <p>{facts.text}</p>
            {s.outstandingReasons.length > 0 && (
              <ul className="list-disc pl-5 space-y-1">{s.outstandingReasons.map((r, i) => <li key={`${r.gateCode}-${r.reasonCode}-${i}`}>{reasonWords(r.reasonCode)}</li>)}</ul>
            )}
            <dl className="text-xs text-sand-600 space-y-0.5">
              {agreedAmountMinor !== null && <div>Agreed amount: <MoneyValue amount={moneyText(agreed, agreementCurrency)} size="sm" /></div>}
              <div>Evaluated for Payment Ready: <MoneyValue amount={moneyText(s.evaluatedAmountMinor, s.evaluatedCurrency)} size="sm" /></div>
            </dl>
            {mismatch && <Unknown text="The agreed amount and the amount SecurePay evaluated for Payment Ready are different. SecurePay’s evaluation is the one that counts for readiness; nothing has been changed." />}
          </div>
        );
      })()}
    </Panel>
  );
}

export function FundingPanel({ gateway, agreementId }: { gateway: PaymentIntentGateway; agreementId: string }) {
  const [authority, refreshAuthority] = useRead<AgreementFundingAuthorityResponse>(() => gateway.fundingAuthority(agreementId), agreementId);
  const [intents, refreshIntents] = useRead<AgreementPaymentIntentSummaryResponse[]>(async () => (await gateway.listIntents(agreementId, 0, 50)).items, agreementId);
  const [options, refreshOptions] = useRead<AgreementFundingOptionResponse[]>(async () => (await gateway.fundingOptions(agreementId)).items, agreementId);
  const refresh = () => { refreshAuthority(); refreshIntents(); refreshOptions(); };
  return (
    <Panel title="Funding" description="Who funds this Agreement and what payments exist. A payment being started or confirmed is different from money being progressed." onRefresh={refresh}>
      {authority.status === 'loading' && <Loading text="Checking who funds this Agreement…" />}
      {authority.status === 'error' && <Unknown text="Funding authority couldn’t be loaded." />}
      {authority.status === 'ready' && <p className="text-sm text-sand-700">{fundingReasonWords(authority.data.reasonCode)}</p>}

      <div className="space-y-1">
        <p className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Payments for this Agreement</p>
        {intents.status === 'loading' && <Loading text="Loading payments…" />}
        {intents.status === 'error' && <Unknown text="Payments couldn’t be loaded, so SecurePay can’t say whether one is in progress." />}
        {intents.status === 'ready' && (intents.data.length === 0
          ? <p className="text-sm text-sand-600">SecurePay shows no payments for this Agreement.</p>
          : (
            <ul className="space-y-2">
              {intents.data.map(i => (
                <li key={i.id} className="rounded-xl border border-cream-200 p-3 text-sm text-sand-700">
                  <div className="font-medium text-forest-800"><MoneyValue amount={moneyText(i.amountMinor, i.currency)} size="sm" /></div>
                  <div>{intentWords(i.status)}</div>
                  {i.retryEligible && <div className="text-xs text-sand-600">This attempt ended without success. Trying again would be a new payment, not a repeat of this one.</div>}
                  {IN_FLIGHT_INTENT.includes(i.status) && <div className="text-xs text-sand-500">Still in progress — this stays here after a refresh.</div>}
                </li>
              ))}
            </ul>
          ))}
      </div>

      <div className="space-y-1">
        <p className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Payment routes SecurePay lists</p>
        {options.status === 'loading' && <Loading text="Loading payment routes…" />}
        {options.status === 'error' && <Unknown text="Payment routes couldn’t be loaded." />}
        {options.status === 'ready' && (options.data.length === 0
          ? <p className="text-sm text-sand-600">SecurePay lists no payment route for this Agreement right now.</p>
          : <ul className="text-xs text-sand-600 space-y-0.5">{options.data.map(o => <li key={o.railCode}>{o.displayName} · {o.currency}{o.minimumAmountMinor != null && <> · min <MoneyValue amount={moneyText(o.minimumAmountMinor, o.currency)} size="sm" /></>}{o.maximumAmountMinor != null && <> · max <MoneyValue amount={moneyText(o.maximumAmountMinor, o.currency)} size="sm" /></>}</li>)}</ul>)}
      </div>
      <p className="text-xs text-sand-500">Starting a payment from here is temporarily unavailable until SecurePay can show that it can be safely carried out and bound to the current Agreement version. No money has moved because of this screen.</p>
    </Panel>
  );
}

export function ActivityPanel({ gateway, agreementId }: { gateway: MoneyGateway; agreementId: string }) {
  const [state, refresh] = useRead<AgreementMoneyRecordResponse[]>(() => gateway.records(agreementId), agreementId);
  return (
    <Panel title="Money activity" description="Records SecurePay holds for this Agreement. Each says only what it proves." onRefresh={refresh}>
      {state.status === 'loading' && <Loading text="Loading money activity…" />}
      {state.status === 'error' && <Unknown text="Money activity couldn’t be loaded. That doesn’t mean there is none." />}
      {state.status === 'ready' && (state.data.length === 0
        ? <p className="text-sm text-sand-600">SecurePay shows no money activity for this Agreement.</p>
        : <ul className="space-y-2">{state.data.map((r, i) => { const w = recordWords(r); return (
            <li key={`${r.occurredAt}-${i}`} className="text-sm text-sand-700">
              <span className="font-medium text-forest-800">{w.label}</span> · <MoneyValue amount={moneyText(minorFromString(r.amountMinor), r.currency)} size="sm" />
              <div className="text-xs text-sand-500">{new Date(r.occurredAt).toLocaleString()} — {w.detail}</div>
            </li>); })}</ul>)}
    </Panel>
  );
}

function SettlementRow({ gateway, agreementId, instruction }: { gateway: PaymentReleaseGateway; agreementId: string; instruction: ReleaseInstructionResponse }) {
  const [state, refresh] = useRead<ReleaseSettlementStatusResponse>(() => gateway.settlementStatus(agreementId, instruction.instructionId), instruction.instructionId);
  return (
    <li className="rounded-xl border border-cream-200 p-3 text-sm text-sand-700 space-y-1">
      <div className="font-medium text-forest-800">Release instruction {instruction.sequence}</div>
      {instruction.settlementDestinationMaskedDisplay && <div className="text-xs text-sand-600">To {instruction.settlementDestinationMaskedDisplay}</div>}
      {state.status === 'loading' && <Loading text="Checking settlement status…" />}
      {state.status === 'error' && <Unknown text="Settlement status couldn’t be confirmed. Nothing is assumed either way." />}
      {state.status === 'ready' && (
        <>
          <div>{settlementPhaseWords(state.data.settlementPhase)}</div>
          {state.data.exception && <div className="text-xs text-ember-700">{state.data.exception.customerSafeReason ?? 'SecurePay recorded an exception for this release.'}{state.data.exception.requiredAction ? ` ${state.data.exception.requiredAction}` : ''}</div>}
        </>
      )}
      <Button variant="ghost" onClick={refresh} className="text-xs">Refresh status</Button>
    </li>
  );
}

export function ReleasePanel({ gateway, agreementId }: { gateway: PaymentReleaseGateway; agreementId: string }) {
  const [authority, refreshAuthority] = useRead<ReleaseAuthorityResponse>(() => gateway.releaseAuthority(agreementId), agreementId);
  const [instructions, refreshInstructions] = useRead<ReleaseInstructionResponse[]>(() => gateway.instructions(agreementId), agreementId);
  return (
    <Panel title="Release and settlement" description="Releasing money to a recipient is a different lifecycle from funding. An instruction is not reserved, sent or settled." onRefresh={() => { refreshAuthority(); refreshInstructions(); }}>
      {authority.status === 'loading' && <Loading text="Checking release authority…" />}
      {authority.status === 'error' && <Unknown text="Release authority couldn’t be loaded. That doesn’t mean release is allowed or blocked." />}
      {authority.status === 'ready' && <p className="text-sm text-sand-700">{releaseReasonWords(authority.data.reasonCode)}</p>}
      {instructions.status === 'loading' && <Loading text="Loading release instructions…" />}
      {instructions.status === 'error' && <Unknown text="Release instructions couldn’t be loaded." />}
      {instructions.status === 'ready' && (instructions.data.length === 0
        ? <p className="text-sm text-sand-600">SecurePay shows no release instruction for this Agreement.</p>
        : <ul className="space-y-2">{instructions.data.map(i => <SettlementRow key={i.instructionId} gateway={gateway} agreementId={agreementId} instruction={i} />)}</ul>)}
      <p className="text-xs text-sand-500">Requesting, reserving or executing a release from here is temporarily unavailable until SecurePay can show that it is safely bound to the current Agreement version.</p>
    </Panel>
  );
}
