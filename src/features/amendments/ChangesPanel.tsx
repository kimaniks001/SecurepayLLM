import { useEffect, useSyncExternalStore } from 'react';
import type { AmendmentChangeViewDto, AmendmentOverviewDto, AmendmentProposalDto } from '../../api/securepay/agreements';
import type { AgreementDetailResponse } from '../../api/securepay/agreements/dto';
import type { AmendmentAction, AmendmentsController, Notice } from './controller';
import { CHANGEABILITY_WORDS, RESPONSE_WORDS, changeFieldWord } from './display';

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300';
const BTN = `min-h-11 rounded-full px-4 text-[0.85rem] font-medium ${FOCUS} disabled:opacity-40`;
const PRIMARY = `${BTN} bg-forest-700 text-white hover:bg-forest-800`;
const SECONDARY = `${BTN} border border-cream-300 bg-white text-forest-700 hover:border-forest-300`;
const dateOf = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };

/** SecurePay's amendment statuses in plain words. Anything else is "unavailable", never guessed. */
export const AMENDMENT_STATUS_WORDS: Record<string, string> = { PROPOSED: 'Proposed', APPLIED: 'Applied', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn', SUPERSEDED: 'Superseded' };
export const amendmentStatusWord = (status: string) => AMENDMENT_STATUS_WORDS[status] ?? 'Status unavailable';

const tone = (n: Notice) => n.kind === 'done' ? 'border-forest-200 bg-forest-50 text-forest-800' : n.kind === 'info' ? 'border-cream-300 bg-cream-50 text-sand-800' : 'border-ember-200 bg-ember-50 text-sand-800';

function ChangeRow({ change }: { change: AmendmentChangeViewDto }) {
  return <li className="rounded-xl bg-cream-50 px-3 py-2">
    <p className="text-[0.75rem] text-sand-600">{change.subject} · {changeFieldWord(change.field)}</p>
    <p className="break-words text-[0.85rem] text-sand-800"><span className="text-sand-600">Now: </span>{change.before ?? 'Nothing set'}</p>
    <p className="break-words text-[0.88rem] text-forest-800"><span className="text-sand-600">Proposed: </span>{change.after ?? 'Nothing set'}</p>
  </li>;
}

/**
 * The Changes area: canonical VERSIONS (history) and the change SecurePay says is waiting, kept distinct. Nothing here edits an
 * Agreement: a proposal becomes a new version only when every other participant has explicitly accepted it in SecurePay.
 */
export function ChangesPanel({ controller, detail }: { controller: AmendmentsController; detail: AgreementDetailResponse }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { void controller.loadOverview(); }, [controller, detail.currentVersion?.versionId]);
  const currentId = detail.currentVersion?.versionId ?? null;
  const versions = [...detail.versionHistory].sort((a, b) => b.versionNumber - a.versionNumber);
  const anyBusy = state.busy !== null;

  const noticeFor = (amendmentId: string, stillOpen: boolean) => {
    const notice = state.notices[amendmentId];
    if (!notice) return null;
    const action = notice.action as AmendmentAction | undefined;
    const retry = action === 'accept' ? 'Try accepting again' : action === 'reject' ? 'Try rejecting again' : 'Try withdrawing again';
    return <div role={notice.kind === 'error' ? 'alert' : 'status'} className={`mt-2 rounded-xl border px-3 py-2 text-[0.82rem] ${tone(notice)}`}>
      <p>{notice.text}</p>
      {/* Recovery is ALWAYS the uncertain operation's own, and re-sends the same pinned request. */}
      {notice.kind === 'uncertain' && action && <div className="mt-1.5 flex flex-wrap gap-2">
        <button type="button" className={SECONDARY} disabled={anyBusy} onClick={() => void controller.check(amendmentId, action)}>Check what happened</button>
        {stillOpen && <button type="button" className={SECONDARY} disabled={anyBusy} onClick={() => void controller[action](amendmentId)}>{retry}</button>}
      </div>}
    </div>;
  };

  const openCard = (o: AmendmentProposalDto, overview: AmendmentOverviewDto) => {
    const busy = state.busy?.id === o.amendmentId ? state.busy.action : null;
    const stale = o.sourceVersionNumber !== overview.currentVersionNumber;
    return <li className="rounded-2xl border border-cream-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h4 className="font-display text-[1rem] text-forest-800">Proposed change</h4>
        <span className="text-[0.78rem] font-medium text-sand-700">Waiting for answers</span>
      </div>
      <p className="text-[0.8rem] text-sand-600">{o.proposedByCaller ? 'You proposed this' : `${o.proposedByName} proposed this`} against version {o.sourceVersionNumber} · {dateOf(o.proposedAt)}</p>
      {o.reason && <p className="mt-1.5 break-words text-[0.85rem] text-sand-800"><span className="text-sand-600">Reason: </span>{o.reason}</p>}
      <ul aria-label="What would change" className="mt-2 space-y-2">{o.changes.map((c, i) => <ChangeRow key={i} change={c} />)}</ul>
      <p className="mt-2 text-[0.82rem] leading-snug text-sand-800"><span className="text-sand-600">Work already set up: </span>{o.liveWorkEffect}</p>
      <div className="mt-2">
        <p className="text-[0.75rem] text-sand-600">Who needs to agree</p>
        <ul aria-label="Who needs to agree" className="text-[0.85rem] text-sand-800">{o.responders.map((r, i) => <li key={i}>{r.isCaller ? 'You' : r.name} — {RESPONSE_WORDS[r.decision] ?? 'answer unavailable'}</li>)}</ul>
      </div>
      {stale && <p role="status" className="mt-1.5 rounded-xl border border-ember-200 bg-ember-50 px-3 py-2 text-[0.82rem] text-sand-800">The Agreement has moved on since this was proposed, so SecurePay won’t apply it.</p>}
      <p className="mt-2 text-[0.75rem] leading-snug text-sand-600">Nothing changes until everyone above has agreed. Then SecurePay creates a new version and keeps this one in the history; if the change is material, everyone is asked to confirm the new version again. Agreeing to the change is not confirming the new version.</p>
      {(o.callerMustRespond || o.callerCanWithdraw) && !stale && <div className="mt-3 flex flex-wrap gap-2 border-t border-cream-100 pt-3">
        {o.callerMustRespond && <button type="button" className={PRIMARY} disabled={anyBusy} onClick={() => void controller.accept(o.amendmentId)}>{busy === 'accept' ? 'Accepting…' : 'Agree to this change'}</button>}
        {o.callerMustRespond && <button type="button" className={SECONDARY} disabled={anyBusy} onClick={() => void controller.reject(o.amendmentId)}>{busy === 'reject' ? 'Rejecting…' : 'Reject this change'}</button>}
        {o.callerCanWithdraw && <button type="button" className={SECONDARY} disabled={anyBusy} onClick={() => void controller.withdraw(o.amendmentId)}>{busy === 'withdraw' ? 'Withdrawing…' : 'Withdraw proposal'}</button>}
      </div>}
      {noticeFor(o.amendmentId, true)}
    </li>;
  };

  const overviewState = state.overview;
  const overview = overviewState.status === 'ready' ? overviewState.overview : null;
  const openId = overview?.open?.amendmentId ?? null;
  const settled = Object.keys(state.notices).filter(id => id !== openId && !overview?.history.some(h => h.amendmentId === id));

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
      {(overviewState.status === 'loading' || overviewState.status === 'idle') && <p role="status" className="mt-1 text-[0.85rem] text-sand-600">Loading proposed changes…</p>}
      {overviewState.status === 'error' && <p className="mt-1 text-[0.85rem] text-sand-700">Changes couldn’t be loaded right now. Nothing is being claimed about whether any exist. <button type="button" className={`underline ${FOCUS}`} onClick={() => void controller.loadOverview()}>Try again</button></p>}
      {overview && <>
        {overview.open ? <ul className="mt-2 space-y-3">{openCard(overview.open, overview)}</ul>
          : <p className="mt-1 text-[0.85rem] leading-snug text-sand-700">{CHANGEABILITY_WORDS[overview.changeability] ?? 'SecurePay didn’t say whether this Agreement can be changed.'}{overview.callerCanPropose ? ' Proposing a change isn’t available from this screen yet.' : ''}</p>}
        {settled.map(id => <div key={id}>{noticeFor(id, false)}</div>)}
        {overview.history.length > 0 && <ul aria-label="Earlier proposed changes" className="mt-3 space-y-2">{overview.history.map(h => <li key={h.amendmentId} className="rounded-xl border border-cream-200 bg-white px-3 py-2">
          <p className="text-[0.88rem] text-forest-800">{amendmentStatusWord(h.outcome)} · proposed by {h.proposedByName} against version {h.sourceVersionNumber}</p>
          {h.outcome === 'APPLIED' && h.resultingVersionNumber != null && <p className="text-[0.8rem] text-forest-800">Everyone agreed; it created version {h.resultingVersionNumber}.</p>}
          <p className="text-[0.75rem] text-sand-600">{dateOf(h.closedAt)}</p>
          {h.changes.length > 0 && <ul className="mt-1 space-y-1">{h.changes.map((c, i) => <li key={i} className="text-[0.8rem] text-sand-700">{c.subject} · {changeFieldWord(c.field)}: {c.after ?? 'Nothing set'}</li>)}</ul>}
          {noticeFor(h.amendmentId, false)}
        </li>)}</ul>}
      </>}
    </div>
  </section>;
}
