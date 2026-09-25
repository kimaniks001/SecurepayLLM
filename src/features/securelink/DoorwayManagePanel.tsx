import { useSyncExternalStore } from 'react';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { ShareCard } from './ShareCard';
import type { DoorwayManageController } from './doorwayManageController';
import type { DoorwayCreateController } from './doorwayCreateController';
import type { SecureLinkCreateController } from './createController';

/**
 * KS001 Upgrade Phase 5 continuation (Slice 5, UR-150) — the PRE-ACTIVATION public Agreement doorway's
 * own management entry point, mirroring `SecureLinkManagePanel`'s exact shape (bounded existence truth
 * first, explicit confirmation before Replace/Revoke) but for the doorway rather than an ACTIVE
 * SecureLink product. Human-facing wording still says "SecureLink" throughout (Section 8) — the person
 * never sees "doorway" or any other backend-only term.
 *
 * <p>Live golden-journey verification found a further gap of the exact same shape as UR-150 itself:
 * once a doorway exists, nothing ever offered a path to ACTUAL product activation --
 * `AgreementSecureLinkSection` only ever renders `SecureLinkManagePanel` (which owns `productCreate`)
 * once an ACTIVE product ALREADY exists. This panel now also accepts the SAME, unmodified
 * `productCreate` controller and offers "Activate SecureLink now" from the `has-doorway` phase. The
 * backend's own `activateProduct` call remains the ONLY source of readiness truth -- this never
 * precomputes or guesses eligibility client-side; a real precondition failure is shown exactly as the
 * backend states it, never bypassed or paraphrased into something more permissive. A successful
 * activation issues a genuinely NEW, separate ACTIVE-product locator (Option B) rather than silently
 * upgrading the pre-activation doorway in place -- the doorway remains valid, non-authoritative review
 * history until explicitly revoked.
 */
export function DoorwayManagePanel({ agreementTitle, manageController, createController, productCreate, onDone, onActivated }: {
  agreementTitle: string;
  manageController: DoorwayManageController;
  createController: DoorwayCreateController;
  productCreate: SecureLinkCreateController;
  onDone: () => void;
  onActivated: () => void;
}) {
  const state = useSyncExternalStore(manageController.subscribe, manageController.getSnapshot, manageController.getSnapshot);
  const createState = useSyncExternalStore(createController.subscribe, createController.getSnapshot, createController.getSnapshot);
  const activateState = useSyncExternalStore(productCreate.subscribe, productCreate.getSnapshot, productCreate.getSnapshot);

  if (state.phase === 'loading') {
    return <p role="status" className="text-sm text-sand-500 px-1">Checking for an existing SecureLink…</p>;
  }

  if (state.phase === 'error') {
    return (
      <div className="space-y-3">
        <StatusNotice tone="warning" icon={false}>{state.message}</StatusNotice>
        <Button variant="secondary" onClick={onDone}>Close</Button>
      </div>
    );
  }

  if (state.phase === 'no-doorway') {
    if (createState.phase === 'created') {
      return (
        <div className="space-y-3">
          <StatusNotice tone="success" icon={false}>Your SecureLink is ready.</StatusNotice>
          <ShareCard title={agreementTitle} purposeSummary={agreementTitle} slug={createState.slug} publicUrl={createState.publicUrl} />
          <p className="text-[0.78rem] text-sand-500">
            Opening this link lets someone review the Agreement and choose to Join — nothing happens
            automatically.
          </p>
          <Button variant="secondary" onClick={() => void manageController.load()}>Done</Button>
        </div>
      );
    }
    if (createState.phase === 'uncertain') {
      return (
        <div className="space-y-3">
          <StatusNotice tone="warning" icon={false}>{createState.error}</StatusNotice>
          <Button onClick={() => void createController.retry()}>Try again</Button>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-sm text-sand-600">
          A SecureLink is a public, shareable doorway into this Agreement. Anyone with the link can review
          what’s being proposed and choose to Join — opening it never joins, confirms, or pays anything on
          its own.
        </p>
        {createState.error && <StatusNotice tone="warning" icon={false}>{createState.error}</StatusNotice>}
        <Button onClick={() => void createController.create()} disabled={createState.busy}>
          {createState.busy ? 'Creating…' : 'Create SecureLink'}
        </Button>
      </div>
    );
  }

  if (state.phase === 'has-doorway') {
    if (activateState.phase === 'created') {
      return (
        <div className="space-y-3">
          <StatusNotice tone="success" icon={false}>
            SecureLink activated. This Agreement now has a real, active product with its own SecureLink —
            the earlier pre-activation link above still exists but is no longer the current one.
          </StatusNotice>
          <ShareCard title={agreementTitle} purposeSummary={agreementTitle} slug={activateState.slug} publicUrl={activateState.publicUrl} />
          <Button variant="secondary" onClick={onActivated}>Done</Button>
        </div>
      );
    }
    if (activateState.phase === 'uncertain') {
      return (
        <div className="space-y-3">
          <StatusNotice tone="warning" icon={false}>{activateState.error}</StatusNotice>
          <Button onClick={() => void productCreate.retry()}>Try again</Button>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <StatusNotice tone="success" icon={false}>This Agreement already has an active SecureLink.</StatusNotice>
        <p className="text-[0.82rem] text-sand-600 px-1">
          SecurePay doesn’t keep the original link text on file for security reasons — to share it again,
          replace it with a fresh one below (this stops the old link from working).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={manageController.startReplace}>Replace SecureLink</Button>
          <Button variant="secondary" onClick={manageController.startRevoke}>Revoke SecureLink</Button>
          <Button variant="secondary" onClick={onDone}>Done</Button>
        </div>
        <div className="border-t border-cream-200 pt-3 space-y-2">
          <p className="text-[0.82rem] text-sand-600">
            Once the required participants have joined and confirmed, and the Agreement has a monetary
            term, you can activate this as a real SecureLink product. SecurePay checks these conditions
            itself when you try — nothing here guesses whether it will succeed.
          </p>
          {activateState.error && <StatusNotice tone="warning" icon={false}>{activateState.error}</StatusNotice>}
          <Button onClick={() => void productCreate.create()} disabled={activateState.busy}>
            {activateState.busy ? 'Activating…' : 'Activate SecureLink now'}
          </Button>
        </div>
      </div>
    );
  }

  if (state.phase === 'confirm-replace') {
    return (
      <div className="space-y-3">
        <StatusNotice tone="warning" icon={false}>
          Replacing this SecureLink creates a new link and permanently stops the old one from working.
          Anyone who still has the old link will no longer be able to open it. This does not change the
          Agreement itself, and does not Join, Confirm, fund, or pay anything.
        </StatusNotice>
        <div className="flex gap-2">
          <Button onClick={() => void manageController.confirmReplace()}>Yes, replace SecureLink</Button>
          <Button variant="secondary" onClick={manageController.cancelReplace}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (state.phase === 'replacing') {
    return <p role="status" className="text-sm text-sand-500 px-1">Replacing your SecureLink…</p>;
  }

  if (state.phase === 'replace-uncertain') {
    return (
      <div className="space-y-3">
        <StatusNotice tone="warning" icon={false}>{state.error}</StatusNotice>
        <div className="flex gap-2">
          <Button onClick={() => void manageController.confirmReplace()}>Try again</Button>
          <Button variant="secondary" onClick={manageController.cancelReplace}>Cancel</Button>
        </div>
        <p className="text-[0.78rem] text-sand-500">Trying again is safe — it won’t create a second replacement.</p>
      </div>
    );
  }

  if (state.phase === 'replaced') {
    return (
      <div className="space-y-3">
        <StatusNotice tone="success" icon={false}>Your SecureLink has been replaced. The old link no longer works.</StatusNotice>
        <ShareCard title={agreementTitle} purposeSummary={agreementTitle} slug={state.slug} publicUrl={state.publicUrl} />
        <Button variant="secondary" onClick={onDone}>Done</Button>
      </div>
    );
  }

  if (state.phase === 'confirm-revoke') {
    return (
      <div className="space-y-3">
        <StatusNotice tone="warning" icon={false}>
          Revoking stops this public SecureLink from working. It does not cancel or delete the Agreement.
        </StatusNotice>
        <div className="flex gap-2">
          <Button onClick={() => void manageController.confirmRevoke()}>Yes, revoke SecureLink</Button>
          <Button variant="secondary" onClick={manageController.cancelRevoke}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (state.phase === 'revoking') {
    return <p role="status" className="text-sm text-sand-500 px-1">Revoking your SecureLink…</p>;
  }

  if (state.phase === 'revoke-uncertain') {
    return (
      <div className="space-y-3">
        <StatusNotice tone="warning" icon={false}>{state.error}</StatusNotice>
        <div className="flex gap-2">
          <Button onClick={() => void manageController.confirmRevoke()}>Try again</Button>
          <Button variant="secondary" onClick={manageController.cancelRevoke}>Cancel</Button>
        </div>
        <p className="text-[0.78rem] text-sand-500">Trying again is safe — it won’t revoke anything twice.</p>
      </div>
    );
  }

  // state.phase === 'revoked'
  return (
    <div className="space-y-3">
      <StatusNotice tone="info" icon={false}>
        This SecureLink has been revoked. The Agreement itself is unaffected.
      </StatusNotice>
      <div className="flex gap-2">
        <Button onClick={manageController.createNewAfterRevoke}>Create a new SecureLink</Button>
        <Button variant="secondary" onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}
