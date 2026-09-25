import { useEffect, useState, useSyncExternalStore } from 'react';
import { CanonicalAgreementCard } from '../../components/CanonicalAgreement';
import { NoticeCard } from '../../components/NoticeCard';
import type { AgreementConfirmationStatusResponse, AgreementDetailResponse } from '../../api/securepay/agreements/dto';
import { confirmedView, exactVersionView, needsChangingView } from '../recipient/view';
import { trustedDiff } from './display';
import type { AmendmentsController } from './controller';
import type { ReconfirmController } from './reconfirm';

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300';
const BTN = `min-h-11 rounded-full px-4 text-[0.85rem] font-medium ${FOCUS} disabled:opacity-40`;

/** The caller's own confirmation standing, from SecurePay's `confirmation-status` row (the endpoint returns only the caller's row). */
export function ownStanding(rows: AgreementConfirmationStatusResponse[] | null, actorStatus: string | null): AgreementConfirmationStatusResponse | null {
  // KS001 Upgrade Phase 5 continuation (Slice 4, UR-148) -- CREATOR can now confirm too: the backend's
  // own AgreementConfirmationService gained this capability this slice (see the Phase 5 Slice 4
  // addendum), through the SAME confirm endpoint this panel already calls unchanged below. A failed read
  // is still unknown, not "needs review".
  if (!rows || rows.length !== 1
      || (actorStatus !== 'JOINED_UNCONFIRMED' && actorStatus !== 'CONFIRMED' && actorStatus !== 'CREATOR')) {
    return null;
  }
  return rows[0].reconfirmationRequired ? rows[0] : null;
}

/**
 * "Version N needs your review". Shows what changed (only where SecurePay's comparison is trustworthy), then the SAME exact-
 * version review and confirmation used everywhere else. The comparison is orientation; the canonical current version is what
 * the person confirms.
 */
export function ReconfirmPanel({ controller, amendments, detail, standing }: { controller: ReconfirmController; amendments: AmendmentsController; detail: AgreementDetailResponse; standing: AgreementConfirmationStatusResponse | null }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const am = useSyncExternalStore(amendments.subscribe, amendments.getSnapshot, amendments.getSnapshot);
  const [needsChanging, setNeedsChanging] = useState(false);
  const current = detail.currentVersion;
  const produced = am.list.status === 'ready' && current ? am.list.items.find(a => a.appliedVersionId === current.versionId) ?? null : null;
  useEffect(() => { if (standing) void amendments.load(detail.overview.status); }, [amendments, standing, detail.overview.status]);
  useEffect(() => { if (produced) void amendments.loadDiff(produced.id); }, [amendments, produced?.id]);
  const producedDiff = produced ? am.diffs[produced.id] : undefined;
  const diff = producedDiff?.status === 'ready' ? trustedDiff(producedDiff.diff, detail.overview.currency || null) : null;
  const diffTried = !!produced && (am.diffs[produced.id]?.status === 'ready' || am.diffs[produced.id]?.status === 'error');
  const number = standing?.currentVersionNumber ?? null;
  const first = standing?.confirmedVersionNumber == null;
  const reason = current?.amendmentReason ?? null;

  if (state.phase === 'confirmed' && state.confirmation) return <section aria-label="Your confirmation" className="rounded-2xl border border-forest-200 bg-forest-50/60 px-4 py-3"><NoticeCard data={confirmedView(state.confirmation)} /></section>;

  if (!standing) return null;
  return <section aria-label="Version needs your review" className="space-y-3 rounded-2xl border border-ember-200 bg-white px-4 py-3">
    <h3 className="font-display text-[1.05rem] text-forest-800">{first ? `You haven’t confirmed version ${number} yet` : `Version ${number} needs your review`}</h3>
    <p className="text-[0.85rem] leading-snug text-sand-700">{first ? 'Read the exact current version before deciding.' : `You confirmed version ${standing.confirmedVersionNumber}. That confirmation doesn’t cover version ${number}. You haven’t confirmed version ${number} yet.`}</p>
    {(reason || current?.materialChange) && <p className="text-[0.82rem] text-sand-800">{reason && <span className="break-words"><span className="text-sand-600">Reason for the change: </span>{reason}. </span>}{current?.materialChange && <span>SecurePay marked this a material change.</span>}</p>}
    {diff && diff.changes.length > 0 && <div><p className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">What changed</p><ul className="mt-1 space-y-2">{diff.changes.map(c => <li key={c.field} className="rounded-xl bg-cream-50 px-3 py-2"><p className="text-[0.75rem] text-sand-600">{c.label}</p>{c.kind === 'changed' && <p className="text-[0.85rem] text-sand-800"><span className="text-sand-600">Earlier: </span>{c.before.text}</p>}<p className="text-[0.88rem] text-forest-800"><span className="text-sand-600">Now: </span>{c.after.text}</p></li>)}</ul></div>}
    {diffTried && !diff && <p className="text-[0.8rem] text-sand-700">SecurePay can’t safely show a complete comparison for this change yet, so read the whole current version below.</p>}

    {state.phase === 'idle' && <button type="button" className={`${BTN} bg-forest-700 text-cream-50 hover:bg-forest-800`} onClick={() => void controller.open()}>{`Review version ${number}`}</button>}
    {state.phase === 'loading' && <p role="status" className="text-[0.85rem] text-sand-600">Loading the current version…</p>}
    {state.phase === 'error' && <div role="alert" className="text-[0.85rem] text-ember-700">{state.error} <button type="button" className={`underline ${FOCUS}`} onClick={() => void controller.open()}>Try again</button></div>}
    {state.version && ['ready', 'confirming', 'uncertain'].includes(state.phase) && <div className="space-y-2">
      {state.changed && <NoticeCard data={{ type: 'NOTICE', label: 'This changed while you were looking', text: 'The current version moved on. Read this one; nothing you did applied to it.', tone: 'worth_checking' }} />}
      {state.error && state.phase === 'ready' && <p role="alert" className="text-[0.85rem] text-ember-700">{state.error}</p>}
      {state.phase === 'uncertain' && <div role="status" className="rounded-xl border border-ember-200 bg-ember-50 px-3 py-2 text-[0.85rem] text-sand-800"><p className="font-medium">We’re not sure that went through.</p><p>{state.error} Your confirmation may or may not be recorded, so it isn’t shown as done. Trying again sends the same request for the same version.</p><button type="button" className={`${BTN} mt-1.5 border border-cream-300 bg-white text-forest-700`} onClick={() => void controller.confirm()}>Check and try again</button></div>}
      <CanonicalAgreementCard data={exactVersionView(state.version)} onChoice={value => { if (value === 'confirm_version') void controller.confirm(); else if (value === 'need_change') setNeedsChanging(o => !o); }} />
      {needsChanging && <NoticeCard data={needsChangingView()} />}
      {state.phase === 'confirming' && <p role="status" className="text-[0.85rem] text-sand-600">Recording your confirmation…</p>}
    </div>}
  </section>;
}
