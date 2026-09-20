import { useSyncExternalStore } from 'react';
import { ArrowLeft, Briefcase, UserMinus } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { Surface, SurfaceBody } from '../../components/dna/Surface';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { PageHeader } from '../../components/dna/PageHeader';
import type { AppView } from '../../types';
import type { BusinessController } from './controller';

/**
 * Phase 5 -- Business Home: which Business you're acting for, who can act, and what they can
 * actually do. Reuses the real Organization/RBAC engine directly -- membership status is never
 * treated as equivalent to full authority (see the "What members can do" section, sourced only from
 * `authoritySummary`, never inferred from membership alone). Role assignment beyond the founding
 * admin is real maker-checker: initiating one never claims the role is granted immediately.
 */
export function BusinessExperience({ controller, onNavigate }: {
  controller: BusinessController;
  onNavigate: (view: AppView) => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const organization = state.organization.data;

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view="signed-in" onNavigate={onNavigate} />
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4 w-full">
        <button onClick={() => onNavigate('account')} className="flex items-center gap-1.5 text-sand-500 hover:text-forest-600 text-[0.8rem]">
          <ArrowLeft className="w-3.5 h-3.5" /> Account
        </button>
        <PageHeader title="Business" description="Acting for a Business is not the same as acting personally. Every action below happens as this Business, never your personal identity." />

        <Surface>
          <SurfaceBody>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Which Business</div>
            <div className="flex gap-2">
              <input value={state.businessKsNumber} onChange={e => controller.setBusinessKsNumber(e.target.value)} placeholder="Business KS Number" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
              <Button variant="secondary" onClick={() => void controller.load(state.businessKsNumber.trim())} disabled={!state.businessKsNumber.trim() || state.organization.status === 'loading'} className="px-4">Open</Button>
            </div>
            <p className="text-[0.72rem] text-sand-500 mt-2">Not activated yet? <button onClick={() => void controller.activate(state.businessKsNumber.trim())} disabled={!state.businessKsNumber.trim()} className="text-forest-700 underline disabled:opacity-40 disabled:no-underline">Activate this Business KS Number</button> — only the Business's own owner (or an authorised internal actor) can do this.</p>
            {state.organization.status === 'error' && <StatusNotice tone="warning" icon={false} className="mt-2">{state.organization.error}</StatusNotice>}
          </SurfaceBody>
        </Surface>

        {organization && (
          <>
            <Surface className="animate-quiet-in">
              <SurfaceBody>
                <div className="flex items-center gap-2 mb-1"><Briefcase className="w-4 h-4 text-forest-500" /><span className="text-[0.85rem] text-forest-800 font-medium">{organization.businessKsNumber}</span></div>
                <p className="text-[0.72rem] text-sand-500">Organization activated {new Date(organization.activatedAt).toLocaleDateString()}</p>
              </SurfaceBody>
            </Surface>

            <Surface>
              <SurfaceBody>
                <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">What you can do here</div>
                {state.authority.status === 'loading' && <p role="status" className="text-sm text-sand-500">Checking your permissions…</p>}
                {state.authority.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.authority.error}</StatusNotice>}
                {state.authority.status === 'ready' && state.authority.data && (
                  state.authority.data.permissions.length === 0
                    ? <p className="text-[0.78rem] text-sand-500">No permissions are currently granted to you for this Business.</p>
                    : <div className="flex flex-wrap gap-1.5">{state.authority.data.permissions.map(p => <span key={p} className="text-[0.68rem] text-forest-700 bg-forest-50 border border-forest-100 rounded-full px-2 py-0.5">{p.replace(/_/g, ' ').toLowerCase()}</span>)}</div>
                )}
                <p className="text-[0.68rem] text-sand-400 italic mt-2">This is your own authority for this Business only — never assumed from membership alone, and never widened by being on this page.</p>
              </SurfaceBody>
            </Surface>

            <Surface>
              <SurfaceBody>
                <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Members</div>
                {state.members.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading members…</p>}
                {state.members.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.members.error}</StatusNotice>}
                {state.members.status === 'ready' && state.members.data?.length === 0 && <p className="text-[0.78rem] text-sand-500">No members yet.</p>}
                <ul className="divide-y divide-cream-100">
                  {state.members.data?.map(m => (
                    <li key={m.identityId} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[0.82rem] text-forest-800">{m.identityId}</div>
                        <div className="text-[0.68rem] text-sand-500 uppercase tracking-wide">{m.status}</div>
                      </div>
                      <button disabled={state.memberActionBusy} onClick={() => void controller.removeMember(m.identityId)} className="flex items-center gap-1 text-[0.75rem] text-sand-500 underline disabled:opacity-40 shrink-0"><UserMinus className="w-3.5 h-3.5" /> Remove</button>
                    </li>
                  ))}
                </ul>
                <p className="text-[0.68rem] text-sand-400 mt-2">Membership status only — this list does not show what each member is authorised to do. Removing suspends membership; it never deletes the identity.</p>
                {state.memberActionError && <StatusNotice tone="warning" icon={false} className="mt-2">{state.memberActionError}</StatusNotice>}

                <div className="mt-3 pt-3 border-t border-cream-100">
                  <div className="text-[0.72rem] text-sand-500 mb-1">Invite a member</div>
                  <div className="flex gap-2">
                    <input value={state.inviteKsInput} onChange={e => controller.setInviteKsInput(e.target.value)} placeholder="Their KS Number" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
                    <Button onClick={() => void controller.inviteMember()} disabled={!state.inviteKsInput.trim() || state.inviteBusy} className="px-4">{state.inviteBusy ? 'Inviting…' : 'Invite'}</Button>
                  </div>
                  {state.inviteError && <StatusNotice tone="warning" icon={false} className="mt-2">{state.inviteError}</StatusNotice>}
                  <p className="text-[0.68rem] text-sand-400 mt-2">An invited person becomes a member only once they accept — and membership alone grants no permission until a role is separately assigned and approved (below).</p>
                </div>
              </SurfaceBody>
            </Surface>

            <Surface>
              <SurfaceBody>
                <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Assign a role (maker-checker)</div>
                <p className="text-[0.78rem] text-sand-600 mb-2">Assigning a role beyond the first admin always requires a second, different person to approve it before it takes effect — you cannot approve your own request.</p>
                <input value={state.roleAssignmentInput.subjectIdentityId} onChange={e => controller.setRoleAssignmentInput({ subjectIdentityId: e.target.value })} placeholder="Member's identity id" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mb-2" />
                <input value={state.roleAssignmentInput.roleCode} onChange={e => controller.setRoleAssignmentInput({ roleCode: e.target.value })} placeholder="Role code (e.g. ORGANIZATION_ADMIN)" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mb-2" />
                {state.roleAssignmentError && <StatusNotice tone="warning" icon={false} className="mb-2">{state.roleAssignmentError}</StatusNotice>}
                <Button variant="secondary" onClick={() => void controller.initiateRoleAssignment()} disabled={!state.roleAssignmentInput.subjectIdentityId.trim() || !state.roleAssignmentInput.roleCode.trim() || state.roleAssignmentBusy} className="w-full py-2.5">
                  {state.roleAssignmentBusy ? 'Requesting…' : 'Request this role assignment'}
                </Button>
                {state.lastInitiatedProtectedActionId && (
                  <StatusNotice tone="info" className="mt-2">
                    Requested. Share this reference with whoever will approve it: <span className="font-medium">{state.lastInitiatedProtectedActionId}</span>. SecurePay does not yet show a list of requests waiting for your approval — approval happens by reference, not from an inbox here.
                  </StatusNotice>
                )}
              </SurfaceBody>
            </Surface>
          </>
        )}
      </div>
    </div>
  );
}
