import { useEffect, useId, useSyncExternalStore } from 'react';
import { ArrowLeft, Briefcase, UserMinus, UserRound } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { Surface, SurfaceBody } from '../../components/dna/Surface';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { PageHeader } from '../../components/dna/PageHeader';
import type { AppView } from '../../types';
import { BUSINESS_NAME_MAX, type BusinessController, type BusinessState } from './controller';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50';
const primary = `inline-flex min-h-11 items-center justify-center rounded-xl bg-forest-700 px-4 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-40 transition-colors ${focusRing}`;
const secondary = `inline-flex min-h-11 items-center justify-center rounded-xl border border-forest-200 px-4 text-sm font-medium text-forest-700 hover:bg-forest-50 disabled:opacity-40 transition-colors ${focusRing}`;
const label = 'text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2';

/**
 * Phase 5 -- Business Home. Phase 4B (ADR-0022) -- the person creates a Business, sees the Businesses SecurePay
 * confirms they can act for, and chooses who they are acting as here.
 *
 * The person always stays signed in as themself. "Acting as" a Business is scoped to this page and exists only
 * after SecurePay confirmed it; every action below still names the Business and is checked again by SecurePay.
 * The list comes only from SecurePay -- nobody can type a Business KS Number to reach one.
 *
 * Phase 5 final correction (kept): no member-to-member role-assignment form, because SecurePay rejects it
 * (docs/PHASE5_LIFE_BUSINESS_WORLD.md sections E/F).
 */
export function BusinessExperience({ controller, onNavigate, onOpenJoin }: {
  controller: BusinessController;
  onNavigate: (view: AppView) => void;
  /** Phase 4C -- open The Trust Project page, which then decides for the Business the person is acting for. */
  onOpenJoin?: () => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const nameId = useId();
  const groupName = useId();
  useEffect(() => { void controller.enter(); void controller.refreshTrustProject(); }, [controller]);

  const self = state.self.data;
  const businesses = state.businesses.data ?? [];
  const acting = state.acting.kind === 'business' ? state.acting.business : null;
  const organization = acting ? state.organization.data : null;
  const selfName = self?.displayName || 'Yourself';
  const actingLabel = acting ? `Acting as ${acting.displayName ?? acting.businessKsNumber}` : `Acting as yourself${self?.displayName ? ` — ${self.displayName}` : ''}`;

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view="business" onNavigate={onNavigate} />
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4 w-full min-w-0">
        <button onClick={() => onNavigate('account')} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sand-500 hover:text-forest-600 text-[0.8rem] ${focusRing}`}>
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Account
        </button>
        <PageHeader title="Business" description="You are signed in as yourself. Create a Business, or act for one SecurePay confirms you run." />

        <Surface>
          <SurfaceBody>
            <fieldset className="min-w-0" disabled={state.switchBusy}>
              <legend className={label}>You are acting as</legend>
              <div className="space-y-1.5">
                <label className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer ${!acting ? 'border-forest-300 bg-forest-50' : 'border-cream-200'}`}>
                  <input type="radio" name={groupName} className="h-5 w-5 shrink-0 accent-forest-600" checked={!acting} onChange={() => controller.actAsSelf()} />
                  <UserRound className="w-4 h-4 shrink-0 text-forest-500" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-[0.85rem] text-forest-800 break-words">{selfName}</span>
                    <span className="block text-[0.7rem] text-sand-500 break-all">Yourself{self ? ` · ${self.ksNumber}` : ''}</span>
                  </span>
                </label>
                {businesses.map(business => {
                  const checked = acting?.businessKsNumber === business.businessKsNumber;
                  return (
                    <label key={business.businessKsNumber} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer ${checked ? 'border-forest-300 bg-forest-50' : 'border-cream-200'}`}>
                      <input type="radio" name={groupName} className="h-5 w-5 shrink-0 accent-forest-600" checked={checked} onChange={() => void controller.actAsBusiness(business.businessKsNumber)} />
                      <Briefcase className="w-4 h-4 shrink-0 text-forest-500" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-[0.85rem] text-forest-800 break-words">{business.displayName ?? business.businessKsNumber}</span>
                        <span className="block text-[0.7rem] text-sand-500 break-all">Business · {business.businessKsNumber}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <p role="status" aria-live="polite" className="text-[0.75rem] text-forest-700 mt-2 break-words">{state.switchBusy ? 'Checking with SecurePay…' : actingLabel}</p>
            {state.businesses.status === 'loading' && businesses.length === 0 && <p className="text-[0.75rem] text-sand-500 mt-1">Loading your Businesses…</p>}
            {state.businesses.status === 'ready' && businesses.length === 0 && <p className="text-[0.75rem] text-sand-500 mt-1">You don’t act for any Business yet.</p>}
            {state.businesses.status === 'error' && <StatusNotice tone="warning" icon={false} className="mt-2">SecurePay couldn’t load your Businesses just now. {state.businesses.error}</StatusNotice>}
            {state.switchError && <StatusNotice tone="warning" icon={false} className="mt-2">{state.switchError}</StatusNotice>}
          </SurfaceBody>
        </Surface>

        {acting && (
          <>
            <Surface className="animate-quiet-in">
              <SurfaceBody>
                <div className="flex items-start gap-2 mb-1 min-w-0">
                  <Briefcase className="w-4 h-4 mt-0.5 shrink-0 text-forest-500" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-[0.95rem] text-forest-800 font-medium break-words">{acting.displayName ?? acting.businessKsNumber}</div>
                    <div className="text-[0.72rem] text-sand-500 break-all">Business KS Number · {acting.businessKsNumber}</div>
                  </div>
                </div>
                <p className="text-[0.8rem] text-forest-700 mt-2">You can act for this Business. You’re its administrator.</p>
                <p className="text-[0.72rem] text-sand-500 mt-1">A Business on SecurePay isn’t legally verified, and it can’t move money.</p>
                <BusinessTrustProject name={acting.displayName ?? acting.businessKsNumber} state={state.trustProject} onOpenJoin={onOpenJoin} />
                <button onClick={() => controller.actAsSelf()} className={`${secondary} mt-3 w-full sm:w-auto`}>Switch back to yourself</button>
              </SurfaceBody>
            </Surface>

            {state.organization.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading this Business…</p>}
            {state.organization.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.organization.error}</StatusNotice>}

            {organization && (
              <>
                <Surface>
                  <SurfaceBody>
                    <div className={label}>Members</div>
                    {state.members.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading members…</p>}
                    {state.members.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.members.error}</StatusNotice>}
                    {state.members.status === 'ready' && state.members.data?.length === 0 && <p className="text-[0.78rem] text-sand-500">No members yet.</p>}
                    <ul className="divide-y divide-cream-100">
                      {state.members.data?.map(m => (
                        <li key={m.identityId} className="py-2 flex items-center justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <div className="text-[0.82rem] text-forest-800 break-all">{m.identityId}</div>
                            <div className="text-[0.68rem] text-sand-500 uppercase tracking-wide">{m.status}</div>
                          </div>
                          <button disabled={state.memberActionBusy} onClick={() => void controller.removeMember(m.identityId)} className={`inline-flex min-h-11 items-center gap-1 text-[0.75rem] text-sand-500 underline disabled:opacity-40 shrink-0 ${focusRing}`}><UserMinus className="w-3.5 h-3.5" aria-hidden="true" /> Remove</button>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[0.68rem] text-sand-400 mt-2">Membership status only — this list does not show what each member is authorised to do. Removing suspends membership; it never deletes the identity.</p>
                    {state.memberActionError && <StatusNotice tone="warning" icon={false} className="mt-2">{state.memberActionError}</StatusNotice>}

                    <div className="mt-3 pt-3 border-t border-cream-100">
                      <label htmlFor={`${nameId}-invite`} className="block text-[0.72rem] text-sand-500 mb-1">Invite a member</label>
                      <div className="flex gap-2">
                        <input id={`${nameId}-invite`} value={state.inviteKsInput} onChange={e => controller.setInviteKsInput(e.target.value)} placeholder="Their KS Number" className="flex-1 min-w-0 min-h-11 rounded-lg border border-cream-200 px-3 text-[0.85rem]" />
                        <button onClick={() => void controller.inviteMember()} disabled={!state.inviteKsInput.trim() || state.inviteBusy} className={`${primary} shrink-0`}>{state.inviteBusy ? 'Inviting…' : 'Invite'}</button>
                      </div>
                      {state.inviteError && <StatusNotice tone="warning" icon={false} className="mt-2">{state.inviteError}</StatusNotice>}
                      <p className="text-[0.68rem] text-sand-400 mt-2">An invited person becomes a member only once they accept — and membership alone grants no permission. See "Role management" below for the current state of assigning one.</p>
                    </div>
                  </SurfaceBody>
                </Surface>

                <Surface>
                  <SurfaceBody>
                    <div className={label}>Role management</div>
                    <p className="text-[0.78rem] text-sand-600">
                      Assigning roles to other members isn’t available here yet.
                    </p>
                  </SurfaceBody>
                </Surface>
              </>
            )}
          </>
        )}

        <Surface>
          <SurfaceBody>
            <h2 className={label}>Create a Business</h2>
            <p className="text-[0.78rem] text-sand-600 mb-3">Your Business gets its own KS Number, and you become its administrator. You stay signed in as yourself. Creating a Business doesn’t verify it, open a bank account or enable payments.</p>
            <label htmlFor={nameId} className="block text-[0.75rem] text-forest-800 mb-1">Business name</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id={nameId}
                value={state.create.name}
                maxLength={BUSINESS_NAME_MAX}
                autoComplete="organization"
                onChange={e => controller.setCreateName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void controller.createBusiness(); }}
                aria-invalid={state.create.error ? true : undefined}
                aria-describedby={state.create.error ? `${nameId}-error` : undefined}
                placeholder="e.g. Keyman Oak"
                className="flex-1 min-w-0 min-h-11 rounded-lg border border-cream-200 px-3 text-[0.9rem]"
              />
              <button onClick={() => void controller.createBusiness()} disabled={state.create.busy || !state.create.name.trim()} className={primary}>
                {state.create.busy ? 'Creating…' : 'Create Business'}
              </button>
            </div>
            {state.create.error && <p id={`${nameId}-error`} role="alert" className="text-[0.78rem] text-amber-800 mt-2">{state.create.error}</p>}
            {state.create.created && (
              <StatusNotice tone="success" icon={false} className="mt-3">
                <span className="block break-words">{state.create.created.displayName} is ready — Business KS Number <span className="break-all">{state.create.created.businessKsNumber}</span>. You can act for this Business.</span>
                <button onClick={() => void controller.actAsBusiness(state.create.created!.businessKsNumber)} className={`${secondary} mt-2`}>Act as {state.create.created.displayName}</button>
              </StatusNotice>
            )}
          </SurfaceBody>
        </Surface>
      </div>
    </div>
  );
}

/**
 * Phase 4C (API ADR-0023) -- the acting Business's OWN Trust Project membership. Joining is never done here: the one
 * doorway opens The Trust Project page, where the person reviews the 12 Principles and decides for the Business.
 */
function BusinessTrustProject({ name, state, onOpenJoin }: {
  name: string;
  state: BusinessState['trustProject'];
  onOpenJoin?: () => void;
}) {
  const read = state.data;
  const status = read?.membership?.status ?? null;
  return (
    <div className="mt-3 pt-3 border-t border-cream-100" data-business-trust-project={status ?? (state.status === 'ready' ? 'none' : state.status)}>
      <div className={label}>The Trust Project</div>
      {state.status === 'loading' && <p role="status" className="text-[0.78rem] text-sand-500">Checking {name}’s membership…</p>}
      {state.status === 'error' && <StatusNotice tone="warning" icon={false}>SecurePay couldn’t check {name}’s Trust Project membership just now.</StatusNotice>}
      {state.status === 'ready' && read && (
        status === 'ACTIVE'
          ? <p className="text-[0.8rem] text-forest-700 break-words">{name} is a Member of The Trust Project.</p>
          : status === 'REVOKED'
            ? <p className="text-[0.8rem] text-sand-600 break-words">Joining isn’t available for {name}.</p>
            : !read.canManage
              ? <p className="text-[0.8rem] text-sand-600 break-words">You can act for {name}, but you can’t make its Trust Project decision.</p>
              : (
                <>
                  <p className="text-[0.8rem] text-forest-800 break-words">{status === 'INVITED' ? `${name} has been invited to The Trust Project.` : `${name} has not joined The Trust Project yet.`}</p>
                  {onOpenJoin && <button onClick={onOpenJoin} className={`${secondary} mt-2 w-full sm:w-auto text-left`}>Review the 12 Principles and join for {name}</button>}
                </>
              )
      )}
    </div>
  );
}
