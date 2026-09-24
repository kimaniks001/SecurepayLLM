import { useSyncExternalStore } from 'react';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { ShareCard } from './ShareCard';
import type { SecureLinkCreateController } from './createController';

/**
 * KS001 Upgrade Phase 5 (SecureLink & Money Continuation, Section 3/6/7) — the explicit "Create
 * SecureLink" continuation panel. The person deliberately chose this; it is never triggered by SET
 * itself. `publicAmountDisplay` defaults OFF (private) — a genuine privacy choice, never silently on.
 */
export function CreateSecureLinkPanel({ agreementTitle, controller, onDone }: {
  agreementTitle: string;
  controller: SecureLinkCreateController;
  onDone: () => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  if (state.phase === 'created') {
    return (
      <div className="space-y-3">
        <StatusNotice tone="success" icon={false}>Your SecureLink is ready.</StatusNotice>
        <ShareCard title={agreementTitle} purposeSummary={agreementTitle} slug={state.slug} publicUrl={state.publicUrl} />
        <Button variant="secondary" onClick={onDone}>Done</Button>
      </div>
    );
  }

  if (state.phase === 'uncertain') {
    return (
      <div className="space-y-3">
        <StatusNotice tone="warning" icon={false}>{state.error}</StatusNotice>
        <div className="flex gap-2">
          <Button onClick={() => void controller.retry()}>Try again</Button>
          <Button variant="secondary" onClick={onDone}>Cancel</Button>
        </div>
        <p className="text-[0.78rem] text-sand-500">Trying again sends the same request — it can’t create a duplicate SecureLink.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-sand-600">
        A SecureLink is a public, shareable doorway into this Agreement. Anyone with the link can review
        what’s being proposed — opening it never joins, confirms, or pays anything on its own.
      </p>
      <label className="block text-[0.78rem] font-medium text-sand-600" htmlFor="securelink-purpose">What is this SecureLink for?</label>
      <textarea
        id="securelink-purpose"
        className="w-full rounded-xl border border-cream-200 px-3 py-2 text-sm"
        rows={2}
        value={state.purposeSummary}
        disabled={state.busy}
        onChange={e => controller.setPurposeSummary(e.target.value)}
      />
      <label className="flex items-center gap-2 text-[0.82rem] text-sand-700">
        <input
          type="checkbox"
          checked={state.publicAmountDisplay}
          disabled={state.busy}
          onChange={e => controller.setPublicAmountDisplay(e.target.checked)}
        />
        Show the proposed amount publicly on this link
      </label>
      {state.error && <StatusNotice tone="warning" icon={false}>{state.error}</StatusNotice>}
      <div className="flex gap-2">
        <Button onClick={() => void controller.create()} disabled={state.busy}>{state.busy ? 'Creating…' : 'Create SecureLink'}</Button>
        <Button variant="secondary" onClick={onDone} disabled={state.busy}>Cancel</Button>
      </div>
    </div>
  );
}
