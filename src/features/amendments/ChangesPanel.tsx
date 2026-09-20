import { useEffect, useState, useSyncExternalStore } from 'react';
import type { AgreementAmendmentDto } from '../../api/securepay/agreements';
import type { AgreementDetailResponse } from '../../api/securepay/agreements/dto';
import { proposedFields, trustedDiff, type FieldFact, type ShownValue } from './display';
import type { AmendmentsController, Notice } from './controller';

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300';
const BTN = `min-h-11 rounded-full px-4 text-[0.85rem] font-medium ${FOCUS} disabled:opacity-40`;
const SECONDARY = `${BTN} border border-cream-300 bg-white text-forest-700 hover:border-forest-300`;
const dateOf = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };

/** SecurePay's amendment statuses in plain words. Anything else is "unavailable", never guessed. */
export const AMENDMENT_STATUS_WORDS: Record<string, string> = { PROPOSED: 'Proposed', APPLIED: 'Applied', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn', SUPERSEDED: 'Superseded' };
export const amendmentStatusWord = (status: string) => AMENDMENT_STATUS_WORDS[status] ?? 'Status unavailable';

function Value({ value }: { value: ShownValue }) { return <span className="break-words">{value.text}</span>; }
function FieldRow({ fact }: { fact: FieldFact }) {
  return <li className="rounded-xl bg-cream-50 px-3 py-2"><p className="text-[0.75rem] text-sand-600">{fact.label}</p><p className="text-[0.88rem] text-forest-800"><Value value={fact.value} /></p></li>;
}
const tone = (n: Notice) => n.kind === 'done' ? 'border-forest-200 bg-forest-50 text-forest-800' : n.kind === 'info' ? 'border-cream-300 bg-cream-50 text-sand-800' : 'border-ember-200 bg-ember-50 text-sand-800';

/**
 * The Changes area: canonical VERSIONS (history) and PROPOSED CHANGES (amendments), kept distinct. Nothing here edits an
 * Agreement: a proposal sits beside the current version until one of three separate, explicit actions is taken.
 */
export function ChangesPanel({ controller, detail, agreementStatus }: { controller: AmendmentsController; detail: AgreementDetailResponse; agreementStatus: string }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => { void controller.load(agreementStatus); }, [controller, agreementStatus]);
  const currentId = detail.currentVersion?.versionId ?? null;
  const numberOf = (versionId: string) => detail.versionHistory.find(v => v.versionId === versionId)?.versionNumber ?? null;
  const currency = detail.overview.currency || null;
  const versions = [...detail.versionHistory].sort((a, b) => b.versionNumber - a.versionNumber);

  const card = (a: AgreementAmendmentDto) => {
    const proposedAgainst = numberOf(a.sourceVersionId);
    const proposed = a.status === 'PROPOSED';
    const stale = proposed && !!currentId && a.sourceVersionId !== currentId;
    const notice = state.notices[a.id];
    const busy = state.busy?.id === a.id ? state.busy.action : null;
    const anyBusy = state.busy !== null;
    const diffState = state.diffs[a.id];
    const trusted = diffState?.status === 'ready' ? trustedDiff(diffState.diff, currency) : null;
    const facts = proposedFields(a.proposedTerms, currency);
    const created = a.appliedVersionId ? numberOf(a.appliedVersionId) : null;
    return <li key={a.id} className="rounded-2xl border border-cream-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h4 className="font-display text-[1rem] text-forest-800">Proposed change</h4>
        <span className="text-[0.78rem] font-medium text-sand-700">{amendmentStatusWord(a.status)}</span>
      </div>
      <p className="text-[0.8rem] text-sand-600">Proposed against {proposedAgainst != null ? `version ${proposedAgainst}` : 'an earlier version'} · {dateOf(a.createdAt)}</p>
      {a.status === 'APPLIED' && <p className="text-[0.8rem] text-forest-800">{created != null ? `Applying it created version ${created}.` : 'Applying it created a new version.'}</p>}
      {stale && <p role="status" className="mt-1.5 rounded-xl border border-ember-200 bg-ember-50 px-3 py-2 text-[0.82rem] text-sand-800">The Agreement has moved on since this was proposed{proposedAgainst != null ? ` (it was made against version ${proposedAgainst})` : ''}, so this proposal no longer matches the current version.</p>}
      {a.reason && <p className="mt-1.5 break-words text-[0.85rem] text-sand-800"><span className="text-sand-600">Reason: </span>{a.reason}</p>}

      <button type="button" className={`${SECONDARY} mt-2`} aria-expanded={!!open[a.id]} onClick={() => { setOpen(o => ({ ...o, [a.id]: !o[a.id] })); void controller.loadDiff(a.id); }}>{open[a.id] ? 'Hide what’s proposed' : 'See what’s proposed'}</button>
      {open[a.id] && <div className="mt-2 space-y-2">
        {diffState?.status === 'loading' && <p role="status" className="text-[0.8rem] text-sand-600">Loading…</p>}
        {trusted && trusted.changes.length > 0 && <ul aria-label="What would change" className="space-y-2">{trusted.changes.map(c => <li key={c.field} className="rounded-xl bg-cream-50 px-3 py-2">
          <p className="text-[0.75rem] text-sand-600">{c.label}{c.kind === 'added' ? ' (new)' : ''}</p>
          {c.kind === 'changed' && <p className="text-[0.85rem] text-sand-800"><span className="text-sand-600">Earlier: </span><Value value={c.before} /></p>}
          <p className="text-[0.88rem] text-forest-800"><span className="text-sand-600">Proposed: </span><Value value={c.after} /></p>
        </li>)}</ul>}
        {trusted && trusted.changes.length === 0 && <p className="text-[0.82rem] text-sand-700">SecurePay lists no customer-facing field changes for this proposal.</p>}
        {!trusted && diffState && diffState.status !== 'loading' && <>
          <p role="status" className="text-[0.82rem] leading-snug text-sand-800">SecurePay can’t safely show a complete comparison for this change yet. What it does show is the value this proposal would set for each field it names.</p>
          {facts.shown.length > 0 ? <ul aria-label="Fields this proposal sets" className="space-y-2">{facts.shown.map(f => <FieldRow key={f.field} fact={f} />)}</ul> : <p className="text-[0.82rem] text-sand-700">No customer-facing fields to show.</p>}
        </>}
        {(trusted?.hidden ?? facts.hidden) > 0 && <p className="text-[0.72rem] text-sand-500">Some internal fields aren’t shown.</p>}
        {proposed && <p className="text-[0.72rem] text-sand-500">The current Agreement doesn’t change unless this is applied.</p>}
      </div>}

      {proposed && <div className="mt-3 space-y-2 border-t border-cream-100 pt-3">
        {/* No Apply here: applying currently updates the current VERSION but not the Agreement's own fields, so SecurePay's views
            could disagree about the current Agreement. The action is withheld, not hidden behind a disabled button. */}
        {!stale && <p className="text-[0.82rem] leading-snug text-sand-800">This proposed change can be reviewed here, but SecurePay can’t safely apply it from this screen yet.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={SECONDARY} disabled={anyBusy} onClick={() => void controller.reject(a.id)}>{busy === 'reject' ? 'Rejecting…' : 'Reject proposed change'}</button>
          <button type="button" className={SECONDARY} disabled={anyBusy} onClick={() => void controller.withdraw(a.id)}>{busy === 'withdraw' ? 'Withdrawing…' : 'Withdraw proposal'}</button>
        </div>
        <p className="text-[0.75rem] text-sand-600">Rejecting keeps the current Agreement as it is. Only the person who proposed it can withdraw it; SecurePay will check that authority.</p>
      </div>}
      {notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} className={`mt-2 rounded-xl border px-3 py-2 text-[0.82rem] ${tone(notice)}`}>
        <p>{notice.text}</p>
        {/* Recovery is ALWAYS the uncertain operation's own -- reject/withdraw never offer anything about applying. */}
        {notice.kind === 'uncertain' && proposed && (notice.action === 'reject' || notice.action === 'withdraw') && <div className="mt-1.5 flex flex-wrap gap-2">
          <button type="button" className={SECONDARY} disabled={anyBusy} onClick={() => void controller.checkTerminal(a.id, notice.action as 'reject' | 'withdraw')}>Check what happened</button>
          <button type="button" className={SECONDARY} disabled={anyBusy} onClick={() => void (notice.action === 'reject' ? controller.reject(a.id) : controller.withdraw(a.id))}>{notice.action === 'reject' ? 'Try rejecting again' : 'Try withdrawing again'}</button>
        </div>}
      </div>}
    </li>;
  };

  return <section aria-label="Changes to this Agreement" className="space-y-5">
    <div>
      <h3 className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">Versions</h3>
      {versions.length === 0 ? <p className="mt-1 text-[0.85rem] text-sand-600">No version history was returned.</p> : <ul className="mt-2 space-y-2">{versions.map(v => <li key={v.versionId} className="rounded-xl border border-cream-200 bg-white px-3 py-2">
        <p className="text-[0.9rem] font-medium text-forest-800">Version {v.versionNumber} · {v.versionId === currentId ? 'Current version' : 'Earlier version'}</p>
        <p className="text-[0.78rem] text-sand-600">Created {dateOf(v.createdAt)}</p>
        {v.amendmentReason && <p className="break-words text-[0.82rem] text-sand-800">Reason: {v.amendmentReason}</p>}
        {v.materialChange && <p className="text-[0.78rem] text-sand-700">SecurePay marked this a material change.</p>}
      </li>)}</ul>}
    </div>
    <div>
      <h3 className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">Proposed changes</h3>
      {state.list.status === 'loading' && <p role="status" className="mt-1 text-[0.85rem] text-sand-600">Loading proposed changes…</p>}
      {state.list.status === 'unavailable' && <p className="mt-1 text-[0.85rem] leading-snug text-sand-700">Proposed changes can’t be read while this Agreement is {state.list.agreementStatus.toLowerCase().replace(/_/g, ' ')}. Nothing is being claimed about whether any exist.</p>}
      {state.list.status === 'error' && <p className="mt-1 text-[0.85rem] text-sand-700">Change history couldn’t be loaded right now. <button type="button" className={`underline ${FOCUS}`} onClick={() => void controller.load(agreementStatus, { force: true })}>Try again</button></p>}
      {state.list.status === 'ready' && state.list.items.length === 0 && <p className="mt-1 text-[0.85rem] text-sand-600">Nobody has proposed a change to this Agreement.</p>}
      {state.list.status === 'ready' && state.list.items.length > 0 && <ul className="mt-2 space-y-3">{[...state.list.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(card)}</ul>}
    </div>
  </section>;
}
