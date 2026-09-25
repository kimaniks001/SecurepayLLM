import { useSyncExternalStore } from 'react';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { ShareCard } from './ShareCard';
import { CreateSecureLinkPanel } from './CreateSecureLinkPanel';
import type { SecureLinkManageController } from './manageController';
import type { SecureLinkCreateController } from './createController';

/**
 * KS001 Upgrade Phase 5 continuation (Slice 2, Sections 8/9/10) — the SecureLink lifecycle management
 * entry point for an Agreement. Loads bounded existence truth first: an Agreement with no active
 * SecureLink sees the existing creation form (`CreateSecureLinkPanel`, unchanged); an Agreement that
 * already has one sees its status plus two deliberate, explicitly-confirmed lifecycle actions —
 * "Replace SecureLink" and "Revoke SecureLink" — never a blind re-offer of the creation form.
 */
export function SecureLinkManagePanel({ agreementTitle, manageController, createController, onDone }: {
  agreementTitle: string;
  manageController: SecureLinkManageController;
  createController: SecureLinkCreateController;
  onDone: () => void;
}) {
  const state = useSyncExternalStore(manageController.subscribe, manageController.getSnapshot, manageController.getSnapshot);

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

  if (state.phase === 'no-link') {
    return <CreateSecureLinkPanel agreementTitle={agreementTitle} controller={createController} onDone={onDone} />;
  }

  if (state.phase === 'has-link') {
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
