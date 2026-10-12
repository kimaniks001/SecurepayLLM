import { useRef, useState } from 'react';
import type { AgreementGateway } from '../../api/securepay/agreements';
import { ApiError } from '../../api/securepay/http';

type Gateway = Pick<AgreementGateway, 'proposeAmendment' | 'amendmentOverview'>;

type ProposalState =
  | { phase: 'idle' }
  | { phase: 'sending'; text: string }
  | { phase: 'uncertain'; text: string; message: string }
  | { phase: 'sent'; text: string }
  | { phase: 'error'; text: string; message: string };

const uncertain = (error: unknown) =>
  error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || (error.status ?? 0) >= 500);

export function AgreementChangeProposal({ gateway, agreementId, expectedVersionId, currentDescription, onDone }: {
  gateway: Gateway;
  agreementId: string;
  expectedVersionId: string;
  currentDescription: string;
  onDone?: () => void;
}) {
  const [value, setValue] = useState(currentDescription);
  const [state, setState] = useState<ProposalState>({ phase: 'idle' });
  const key = useRef<string | null>(null);
  const locked = state.phase === 'sending' || state.phase === 'uncertain';
  const changed = value.trim() !== currentDescription.trim() && value.trim().length > 0;

  const send = async () => {
    if (!changed || locked) return;
    const text = value.trim();
    const idempotencyKey = key.current ?? crypto.randomUUID();
    key.current = idempotencyKey;
    setState({ phase: 'sending', text });
    try {
      await gateway.proposeAmendment(agreementId, {
        idempotencyKey,
        expectedAgreementVersionId: expectedVersionId,
        changes: [{ type: 'AGREEMENT_TEXT', field: 'description', value: text }],
        reason: 'Suggested from Agreement review',
      });
      key.current = null;
      setState({ phase: 'sent', text });
      onDone?.();
    } catch (error) {
      if (uncertain(error)) {
        setState({ phase: 'uncertain', text, message: 'SecurePay could not confirm whether that suggestion was recorded.' });
        return;
      }
      key.current = null;
      const message = error instanceof ApiError && error.status === 409
        ? 'The Agreement changed before this suggestion could be recorded. Nothing was changed. Read the current Agreement and try again.'
        : error instanceof ApiError && error.status === 403
          ? 'SecurePay did not allow this account to propose that change. Nothing was changed.'
          : 'SecurePay could not propose that change. Nothing was changed.';
      setState({ phase: 'error', text, message });
    }
  };

  const check = async () => {
    if (state.phase !== 'uncertain') return;
    try {
      const overview = await gateway.amendmentOverview(agreementId);
      const recorded = overview.open?.proposedByCaller
        && overview.open.changes.some(change => change.field === 'description' && change.after === state.text);
      if (recorded) {
        key.current = null;
        setState({ phase: 'sent', text: state.text });
        onDone?.();
      } else {
        setState({ phase: 'uncertain', text: state.text, message: 'SecurePay does not yet show this suggestion as recorded. You can safely try the same request again.' });
      }
    } catch {
      setState({ phase: 'uncertain', text: state.text, message: 'SecurePay still could not confirm what happened. Your words are kept here.' });
    }
  };

  if (state.phase === 'sent') {
    return <section className="rounded-2xl border border-forest-200 bg-forest-50/60 px-4 py-3" aria-label="Suggested Agreement change">
      <p className="font-display text-[1rem] text-forest-900">Change suggested</p>
      <p className="mt-1 text-[0.84rem] leading-5 text-sand-700">The current Agreement has not changed. The other participant must agree before SecurePay can create a new version.</p>
    </section>;
  }

  return <section className="rounded-2xl border border-cream-200 bg-white px-4 py-4" aria-label="Suggest a change">
    <h3 className="font-display text-[1rem] text-forest-900">Suggest a change</h3>
    <p className="mt-1 text-[0.8rem] leading-5 text-sand-700">
      You can suggest different Agreement wording here. SecurePay does not currently allow payment amount, currency or payment-timing changes through this amendment path.
    </p>
    <label htmlFor="agreement-change-description" className="mt-3 block text-[0.75rem] font-medium text-sand-700">Agreement description</label>
    <textarea
      id="agreement-change-description"
      value={value}
      readOnly={locked}
      rows={4}
      onChange={event => setValue(event.target.value)}
      className="mt-1 w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-[0.9rem] leading-6 text-forest-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300"
    />
    {state.phase === 'error' && <p role="alert" className="mt-2 text-[0.8rem] text-ember-800">{state.message}</p>}
    {state.phase === 'uncertain' && <div role="status" className="mt-2 rounded-xl border border-ember-200 bg-ember-50 px-3 py-2 text-[0.8rem] text-sand-800">
      <p>{state.message}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => void check()} className="min-h-11 rounded-full border border-forest-300 bg-white px-4 text-[0.82rem] text-forest-800">Check what happened</button>
        <button type="button" onClick={() => { setState({ phase: 'idle' }); void send(); }} className="min-h-11 rounded-full border border-forest-300 bg-white px-4 text-[0.82rem] text-forest-800">Try the same suggestion again</button>
      </div>
    </div>}
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={!changed || locked} onClick={() => void send()}
        className="min-h-11 rounded-full bg-forest-700 px-4 text-[0.84rem] font-medium text-white disabled:opacity-40">
        {state.phase === 'sending' ? 'Sending…' : 'Suggest this change'}
      </button>
      <button type="button" disabled={locked} onClick={() => { setValue(currentDescription); setState({ phase: 'idle' }); key.current = null; }}
        className="min-h-11 rounded-full px-3 text-[0.82rem] text-sand-700 underline underline-offset-2 disabled:opacity-40">Cancel</button>
    </div>
  </section>;
}
