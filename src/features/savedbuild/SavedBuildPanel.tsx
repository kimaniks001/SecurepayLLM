import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { SecureAuthCard } from '../../components/SecureAuth';
import { secureAuthView } from '../identity/view';
import type { IdentityController } from '../identity/controller';
import type { SavedBuildController } from './controller';

/**
 * KS001 Upgrade Phase 2 (Section 14/15/21) -- the "Save for later" identity prompt. Shown ONLY at the
 * moment of saving (never a signed-out wall in front of BUILD itself, matching HandoffPanel's own
 * doctrine). Signing in here proves identity only -- it never creates an Agreement, invites anyone, or
 * connects money.
 */
export function SavedBuildPanel({ savedBuild, identity }: { savedBuild: SavedBuildController; identity: IdentityController }) {
  const state = useSyncExternalStore(savedBuild.subscribe, savedBuild.getSnapshot, savedBuild.getSnapshot);
  const identityState = useSyncExternalStore(identity.subscribe, identity.getSnapshot, identity.getSnapshot);

  useEffect(() => {
    if (state.phase === 'identity-required' && identityState.phase === 'signed-in') {
      void savedBuild.continueAfterIdentity();
      identity.reset();
    }
  }, [state.phase, identityState.phase, savedBuild, identity]);

  if (state.phase !== 'identity-required') return null;
  const authData = secureAuthView(identityState, {
    title: 'Sign in to save this',
    reason: 'Signing in only proves who you are, so SecurePay knows whose saved work this is. It does not create an Agreement, invite anyone, or connect money.',
    secondaryLabel: 'Back to conversation',
  });
  return (
    <div className="space-y-3">
      <SecureAuthCard
        data={authData}
        values={identityState.phase === 'otp' ? [identityState.otp] : [identityState.ksNumber, identityState.password]}
        disabled={identityState.busy}
        errorText={identityState.error}
        onFieldChange={(index, value) => {
          if (identityState.phase === 'otp') identity.setOtp(value);
          else if (index === 0) identity.setKsNumber(value);
          else identity.setPassword(value);
        }}
        onChoice={value => {
          if (value === 'submit_credentials') void identity.submitCredentials();
          else if (value === 'submit_otp') void identity.submitOtp();
          else if (value === 'reset_credentials') identity.reset();
          else if (value === 'cancel_auth') { savedBuild.reset(); identity.reset(); }
        }}
      />
    </div>
  );
}

const STATE_LABEL: Record<string, string> = { BUILDING: 'Just getting started', REVIEWABLE_WITH_OPEN_ITEMS: 'Worth a look', UNDERSTOOD: 'Ready to review' };

/**
 * Section 17 -- the restrained "Continue Building" section for the signed-in Home. Lists the person's
 * own saved builds only (server-enforced); clicking one resumes the SAME conversationId, never a clone.
 * No percentage bars, no gamification -- "N things still to decide," never a completion score.
 */
export function ContinueBuildingList({ savedBuild, onResume }: { savedBuild: SavedBuildController; onResume: (conversationId: string) => void }) {
  const state = useSyncExternalStore(savedBuild.subscribe, savedBuild.getSnapshot, savedBuild.getSnapshot);
  useEffect(() => { void savedBuild.list(); }, [savedBuild]);

  if (state.phase === 'listing' && state.builds.length === 0) return <p className="text-[0.85rem] text-sand-500 px-1">Checking your saved builds…</p>;
  if (state.builds.length === 0) return null;

  return (
    <section aria-label="Continue building" className="space-y-2">
      <h3 className="px-1 text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Continue building</h3>
      <ul className="overflow-hidden rounded-2xl border border-cream-200 bg-white/80 divide-y divide-cream-100 shadow-soft">
        {state.builds.map(build => (
          <li key={build.savedBuildId}>
            <button
              type="button"
              disabled={state.phase === 'resuming'}
              onClick={async () => { const conversationId = await savedBuild.resume(build.savedBuildId); if (conversationId) onResume(conversationId); }}
              className="flex w-full min-h-[3.25rem] items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-forest-50/60 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.95rem] text-forest-800">{build.title ?? 'Untitled build'}</span>
                <span className="mt-0.5 block text-[0.78rem] text-sand-600">
                  {STATE_LABEL[build.sufficiencyState] ?? 'Being built'}
                  {build.openMatterCount > 0 && ` · ${build.openMatterCount} thing${build.openMatterCount === 1 ? '' : 's'} still to decide`}
                </span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-sand-400">›</span>
            </button>
          </li>
        ))}
      </ul>
      {state.error && <p role="alert" className="px-1 text-[0.8rem] text-ember-700">{state.error}</p>}
    </section>
  );
}
