import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Check, Link2 } from 'lucide-react';
import { INVITABLE_STATUSES, INVITE_ROLES, isPlausibleKs, normalizeKs, type InviteController } from './controller';
import type { AgreementInvitationDto } from '../../api/securepay/agreements';

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300';
const BTN = `min-h-11 rounded-full px-4 text-[0.85rem] font-medium ${FOCUS}`;
const PRIMARY = `${BTN} bg-forest-700 text-cream-50 hover:bg-forest-800 disabled:opacity-40`;
const SECONDARY = `${BTN} border border-cream-300 bg-white text-forest-700 hover:border-forest-300 disabled:opacity-40`;

const dateOf = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
const roleWords = (code: string) => INVITE_ROLES.find(r => r.code === code)?.label ?? (code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' '));

/** What SecurePay's invitation status actually says -- ISSUED means not yet opened, VIEWED means the link was opened. Neither means joined. */
export function invitationStatusText(item: AgreementInvitationDto, now = Date.now()): string {
  const expired = item.status === 'EXPIRED' || ((item.status === 'ISSUED' || item.status === 'VIEWED') && new Date(item.expiresAt).getTime() < now);
  if (item.status === 'JOINED') return 'Someone joined with this invitation';
  if (item.status === 'REVOKED') return 'Revoked — the link no longer works';
  if (expired) return 'Expired';
  if (item.status === 'VIEWED') return `Link opened · nobody has joined with it · expires ${dateOf(item.expiresAt)}`;
  if (item.status === 'ISSUED') return `Not opened yet · expires ${dateOf(item.expiresAt)}`;
  // An unrecognised status must not be passed off as any known one.
  return 'Invitation status unavailable';
}
/** Mutation authority fails closed: only a recognised, still-usable status offers Revoke. */
const usable = (item: AgreementInvitationDto, now = Date.now()) => (item.status === 'ISSUED' || item.status === 'VIEWED') && new Date(item.expiresAt).getTime() >= now;

/**
 * Invite someone -- in the People area. Creating an invitation creates a doorway and nothing else: it does not
 * send anything, does not add anyone who has joined, and asks nobody to confirm.
 */
export function InvitePanel({ controller, agreementStatus, isCreator }: { controller: InviteController; agreementStatus: string; isCreator: boolean }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  const region = useRef<HTMLDivElement>(null);
  // The People area renders in both the desktop tab and the mobile section (one is hidden by CSS): load once, focus only the visible one.
  const uid = useId();
  useEffect(() => { if (controller.getSnapshot().list.status === 'idle') void controller.loadList(); }, [controller]);
  useEffect(() => { const el = region.current; if (el && el.offsetParent !== null && ['issued', 'issued-earlier', 'uncertain', 'error'].includes(state.phase)) el.focus(); }, [state.phase]);
  useEffect(() => { if (state.phase !== 'issued') setCopy('idle'); }, [state.phase]);
  if (!isCreator) return null;

  const invitable = (INVITABLE_STATUSES as readonly string[]).includes(agreementStatus);
  const busy = state.phase === 'issuing';
  const locked = state.phase === 'uncertain' || busy; // the request being retried must not change under it

  const copyLink = async () => {
    const link = state.issued?.link;
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopy('copied'); } catch { setCopy('failed'); }
  };

  const list = state.list.status === 'ready' ? state.list.items : null;

  return <section aria-label="Invite someone" className="mt-4 border-t border-cream-200 pt-4">
    {agreementStatus === 'DRAFT' && <div className="space-y-2">
      <p className="text-[0.85rem] leading-snug text-sand-700">This Agreement is still a draft. Before you can invite anyone, it has to be marked as proposed. That invites nobody and tells nobody.</p>
      <button type="button" className={SECONDARY} disabled={state.proposing} onClick={() => void controller.propose()}>Propose this Agreement</button>
      {state.proposing && <p role="status" className="text-[0.8rem] text-sand-600">Updating the Agreement…</p>}
      {state.proposeError && <p role="alert" className="text-[0.8rem] text-ember-700">{state.proposeError}</p>}
    </div>}

    {invitable && state.phase === 'closed' && <button type="button" className={PRIMARY} onClick={() => controller.open()}>Invite someone</button>}

    {invitable && ['form', 'issuing', 'uncertain', 'error'].includes(state.phase) && <form onSubmit={e => { e.preventDefault(); void controller.issue(); }} className="space-y-3">
      <h3 className="font-display text-[1.05rem] text-forest-800">Who should take part in this Agreement?</h3>
      <div className="flex gap-2" role="radiogroup" aria-label="How do you know them">
        <button type="button" role="radio" aria-checked={state.targetMode === 'KS_NUMBER'} disabled={locked} onClick={() => controller.setTargetMode('KS_NUMBER')}
          className={`min-h-9 rounded-full px-3.5 text-[0.8rem] font-medium ${FOCUS} ${state.targetMode === 'KS_NUMBER' ? 'bg-forest-700 text-cream-50' : 'border border-cream-300 bg-white text-forest-700'}`}>I know their KS Number</button>
        <button type="button" role="radio" aria-checked={state.targetMode === 'CONTACT'} disabled={locked} onClick={() => controller.setTargetMode('CONTACT')}
          className={`min-h-9 rounded-full px-3.5 text-[0.8rem] font-medium ${FOCUS} ${state.targetMode === 'CONTACT' ? 'bg-forest-700 text-cream-50' : 'border border-cream-300 bg-white text-forest-700'}`}>I have their phone or email</button>
      </div>
      {state.targetMode === 'KS_NUMBER' ? (
        <div>
          <label htmlFor={`${uid}-ks`} className="block text-[0.8rem] text-sand-700">Their KS Number</label>
          <div className="mt-1 flex gap-2">
            <input id={`${uid}-ks`} value={state.ksNumber} disabled={locked} onChange={e => controller.setKs(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-describedby={`${uid}-ks-help`}
              className={`min-h-11 flex-1 rounded-xl border border-cream-300 bg-white px-3 text-[0.95rem] text-forest-800 ${FOCUS}`} />
            <button type="button" className={SECONDARY} disabled={locked || state.ksPreview.status === 'checking' || !isPlausibleKs(state.ksNumber)} onClick={() => void controller.checkKs()}>
              {state.ksPreview.status === 'checking' ? 'Checking…' : 'Check'}
            </button>
          </div>
          <p id={`${uid}-ks-help`} className="mt-1 text-[0.75rem] text-sand-600">SecurePay checks this KS Number against real SecurePay identities before you can invite them. Only the account with this KS Number will be able to join.</p>
          {/* KS001 Upgrade Phase 4 (Section 10) -- the bounded confirmation before issuance is ever allowed. */}
          {state.ksPreview.status === 'found' && state.ksPreview.checked === normalizeKs(state.ksNumber) && (
            <div role="status" className="mt-2 rounded-xl border border-forest-200 bg-forest-50/60 px-3 py-2">
              <p className="text-[0.85rem] font-medium text-forest-800">{state.ksPreview.target.displayName ?? 'A SecurePay identity'}</p>
              <p className="text-[0.75rem] text-sand-600">{state.ksPreview.target.canonicalKsNumber ?? state.ksPreview.checked}</p>
            </div>
          )}
          {state.ksPreview.status === 'not-found' && state.ksPreview.checked === normalizeKs(state.ksNumber) && (
            <p role="alert" className="mt-2 text-[0.8rem] text-ember-700">SecurePay couldn’t find an active identity with that KS Number. Check it carefully, or ask them to bring a KS Number first.</p>
          )}
          {state.ksPreview.status === 'error' && state.ksPreview.checked === normalizeKs(state.ksNumber) && (
            <p role="alert" className="mt-2 text-[0.8rem] text-sand-700">SecurePay couldn’t check that KS Number just now. <button type="button" className={`underline ${FOCUS}`} onClick={() => void controller.checkKs()}>Try again</button></p>
          )}
        </div>
      ) : (
        <div>
          {/* KS001 Upgrade Phase 4 continuation (Section 8/10) -- deliberately NO check/preview step here:
              SecurePay must never confirm whether a phone/email already has a SecurePay account. */}
          <div className="flex gap-2" role="radiogroup" aria-label="Phone or email">
            <button type="button" role="radio" aria-checked={state.contactChannel === 'SMS'} disabled={locked} onClick={() => controller.setContactChannel('SMS')}
              className={`min-h-9 rounded-full px-3.5 text-[0.8rem] font-medium ${FOCUS} ${state.contactChannel === 'SMS' ? 'bg-forest-700 text-cream-50' : 'border border-cream-300 bg-white text-forest-700'}`}>Phone</button>
            <button type="button" role="radio" aria-checked={state.contactChannel === 'EMAIL'} disabled={locked} onClick={() => controller.setContactChannel('EMAIL')}
              className={`min-h-9 rounded-full px-3.5 text-[0.8rem] font-medium ${FOCUS} ${state.contactChannel === 'EMAIL' ? 'bg-forest-700 text-cream-50' : 'border border-cream-300 bg-white text-forest-700'}`}>Email</button>
          </div>
          <label htmlFor={`${uid}-contact`} className="mt-2 block text-[0.8rem] text-sand-700">{state.contactChannel === 'EMAIL' ? 'Their email' : 'Their phone number'}</label>
          <input id={`${uid}-contact`} value={state.contactDestination} disabled={locked} onChange={e => controller.setContactDestination(e.target.value)}
            type={state.contactChannel === 'EMAIL' ? 'email' : 'tel'} autoComplete="off" aria-describedby={`${uid}-contact-help`}
            className={`mt-1 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-3 text-[0.95rem] text-forest-800 ${FOCUS}`} />
          <p id={`${uid}-contact-help`} className="mt-1 text-[0.75rem] text-sand-600">If they don’t have SecurePay yet, they’ll get their own KS Number using this exact contact before they can join.</p>
        </div>
      )}
      <div>
        <label htmlFor={`${uid}-role`} className="block text-[0.8rem] text-sand-700">Their role in this Agreement</label>
        <select id={`${uid}-role`} value={state.roleCode ?? ''} disabled={locked} onChange={e => controller.setRole(e.target.value)} aria-describedby={`${uid}-role-help`}
          className={`mt-1 min-h-11 w-full rounded-xl border border-cream-300 bg-white px-3 text-[0.95rem] text-forest-800 ${FOCUS}`}>
          <option value="" disabled>Choose a role</option>
          {INVITE_ROLES.map(role => <option key={role.code} value={role.code}>{role.label}</option>)}
        </select>
        <p id={`${uid}-role-help`} className="mt-1 text-[0.75rem] text-sand-600">This is the part they’d take in the Agreement, so choose it deliberately.</p>
      </div>
      <p className="text-[0.8rem] leading-snug text-sand-700">Creating an invitation makes a link you can share. It doesn’t send anything, and nobody has joined or agreed to anything.</p>
      <div ref={region} tabIndex={-1} className="focus:outline-none">
        {busy && <p role="status" className="text-[0.85rem] text-sand-600">Creating the invitation…</p>}
        {state.phase === 'uncertain' && <div role="status" className="rounded-xl border border-ember-200 bg-ember-50 px-3 py-2.5 text-[0.85rem] text-sand-800">
          <p className="font-medium">We’re not sure that went through.</p>
          <p>{state.error} An invitation may or may not exist. Trying again sends the same request, so it can’t create two.</p>
        </div>}
        {state.phase === 'error' && state.error && <p role="alert" className="rounded-xl border border-ember-200 bg-ember-50 px-3 py-2.5 text-[0.85rem] text-sand-800">{state.error}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={PRIMARY} disabled={busy || (state.phase !== 'uncertain' && (!state.roleCode || (state.targetMode === 'KS_NUMBER' ? !(state.ksPreview.status === 'found' && state.ksPreview.checked === normalizeKs(state.ksNumber)) : !state.contactDestination.trim())))}>{state.phase === 'uncertain' ? 'Check and try again' : 'Create invitation'}</button>
        <button type="button" className={SECONDARY} disabled={busy} onClick={() => controller.reset()}>Cancel</button>
      </div>
    </form>}

    {state.phase === 'issued' && state.issued?.link && <div ref={region} tabIndex={-1} className="space-y-2 rounded-2xl border border-forest-200 bg-forest-50/60 px-4 py-3 focus:outline-none">
      <h3 className="font-display text-[1.05rem] text-forest-800">Invitation ready</h3>
      {state.issued.targetKind === 'CONTACT' && state.issued.targetHint && (
        <p className="text-[0.8rem] text-sand-600">For: {state.issued.targetHint}</p>
      )}
      <p className="text-[0.85rem] leading-snug text-sand-700">The invitation link is ready for you to share. Nothing has been sent, and no one has joined.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={PRIMARY} onClick={() => void copyLink()}><span className="inline-flex items-center gap-1.5"><Link2 className="h-4 w-4" aria-hidden="true" />Copy invitation link</span></button>
        <button type="button" className={SECONDARY} onClick={() => controller.reset()}>Done</button>
      </div>
      <p role="status" className="min-h-[1.25rem] text-[0.8rem] text-forest-800">{copy === 'copied' ? <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden="true" />Link copied. Copying doesn’t send it to anyone.</span> : copy === 'failed' ? 'Couldn’t copy. Your browser blocked it.' : ''}</p>
      <p className="text-[0.75rem] leading-snug text-sand-600">SecurePay shows this link only now. If you leave without copying it, revoke this invitation below and create a new one.</p>
    </div>}

    {state.phase === 'issued-earlier' && state.issued && (() => {
      const id = state.issued.invitationId;
      // The exact id SecurePay returned -- never a list guess. "Revoked" is read from the list entry with THAT id.
      const revoked = state.list.status === 'ready' && state.list.items.some(item => item.id === id && item.status === 'REVOKED');
      return <div ref={region} tabIndex={-1} className="space-y-2 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 focus:outline-none">
        <h3 className="font-display text-[1.05rem] text-forest-800">{revoked ? 'That invitation is revoked' : 'This invitation already exists'}</h3>
        {revoked
          ? <p className="text-[0.85rem] leading-snug text-sand-700">The link from that attempt no longer works. You can create a new invitation when you’re ready.</p>
          : <p className="text-[0.85rem] leading-snug text-sand-700">SecurePay created it on an earlier attempt and can’t show its link again. You can revoke exactly this invitation, then create a new one.</p>}
        <div className="flex flex-wrap gap-2">
          {!revoked && <button type="button" className={PRIMARY} disabled={state.revokingId !== null} onClick={() => void controller.revoke(id)}>Revoke this invitation</button>}
          {revoked && <button type="button" className={PRIMARY} onClick={() => { controller.reset(); controller.open(); }}>Create a new invitation</button>}
          <button type="button" className={SECONDARY} onClick={() => controller.reset()}>Done</button>
        </div>
        {state.revokeError && <p role="alert" className="text-[0.8rem] text-ember-700">{state.revokeError}</p>}
      </div>;
    })()}

    <div className="mt-4">
      <h3 className="text-[0.7rem] font-medium uppercase tracking-wide text-sand-500">Invitations</h3>
      {state.list.status === 'loading' && <p role="status" className="mt-1 text-[0.8rem] text-sand-600">Loading invitations…</p>}
      {state.list.status === 'error' && <p className="mt-1 text-[0.8rem] text-sand-700">Invitations couldn’t be loaded just now. <button type="button" className={`underline ${FOCUS}`} onClick={() => void controller.loadList()}>Try again</button></p>}
      {list && list.length === 0 && <p className="mt-1 text-[0.8rem] text-sand-600">No invitations have been created for this Agreement.</p>}
      {state.revokeError && <p role="alert" className="mt-1 text-[0.8rem] text-ember-700">{state.revokeError}</p>}
      {list && list.length > 0 && <ul className="mt-2 space-y-2">{list.map(item => <li key={item.id} className="rounded-xl border border-cream-200 px-3 py-2">
        <p className="text-[0.85rem] font-medium text-forest-800">Invitation for {roleWords(item.roleCode)}</p>
        <p className="text-[0.78rem] text-sand-600">Created {dateOf(item.issuedAt)} · {invitationStatusText(item)}</p>
        {usable(item) && <button type="button" className={`${SECONDARY} mt-1.5`} disabled={state.revokingId !== null} onClick={() => void controller.revoke(item.id)} aria-label={`Revoke the invitation for ${roleWords(item.roleCode)} created ${dateOf(item.issuedAt)}`}>Revoke this invitation</button>}
      </li>)}</ul>}
      {list && list.length > 0 && <p className="mt-1.5 text-[0.72rem] leading-snug text-sand-500">Revoking stops a link from working. It doesn’t remove anyone who has already joined.</p>}
    </div>
  </section>;
}
