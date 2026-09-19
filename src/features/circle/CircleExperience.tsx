import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Users, TrendingUp, ShieldCheck } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { SecureAuthCard } from '../../components/SecureAuth';
import { ErrorStateCard } from '../../components/ErrorState';
import { Surface, SurfaceBody } from '../../components/dna/Surface';
import { PageHeader } from '../../components/dna/PageHeader';
import type { CircleGateway } from '../../api/securepay/circle';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import type { AppView, ErrorStateResponse } from '../../types';
import { createCircleController, errorText } from './controller';
import { circleVerificationStatusLabel } from '../../circleLabels';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';

function errorView(message: string): ErrorStateResponse {
  return { type: 'ERROR_STATE', title: 'SecurePay could not load your Circle profile', text: message, primaryLabel: 'Try again', primaryValue: 'retry' };
}

/**
 * The real Circle experience is deliberately narrow: `GET /api/v1/circle/me` (task section 4) is the
 * entire verified backend Circle contract this phase exposes — a self-scoped identity/referral read,
 * never a named group. Bolt's rich named-Circle screens (CircleHome, CircleDiscoveryList,
 * CircleMemberDirectory, CircleEconomicSummary, CircleCreateFlow, CircleJoinFlow) stay fixture-only and
 * are never imported here (see docs/PRODUCTION_MIGRATION_LEDGER.md section 17) — this component renders
 * only the real profile plus a truthful notice for the named-Circle gap, using the same visual language
 * (not a redesign, no new component library).
 *
 * Final Phase 4 Economy correction (programme decision): the former synthetic weighted-score tile
 * is retired — it conflicted with the locked no-gamification doctrine. Only real, separately-
 * computed factual counts (traders referred, referrals activated, Agreements brought in) remain.
 */
export function CircleExperience({ gateway, auth, session, onNavigate, onAskAgent }: {
  gateway: Pick<CircleGateway, 'me'>; auth: AuthGateway; session: SessionStore;
  onNavigate: (view: AppView) => void;
  onAskAgent: () => void;
}) {
  const [controller] = useState(() => createCircleController(gateway));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const identityState = useSyncExternalStore(identityController.subscribe, identityController.getSnapshot);
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);

  useEffect(() => {
    // Runs only when sign-in status actually changes (or on mount), never on every render. A previous
    // identity's profile must never survive into a new session: signing out resets it back to idle
    // (session.clear() carries no identity to decode, so this is authority-boundary-safe — see
    // api/securepay/session.ts), and every transition into signed-in (including re-authentication after
    // a session refresh/loss) reloads the caller's own current self-scoped profile from scratch.
    if (sessionState.status === 'signed-in') void controller.load();
    else controller.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.status]);

  const navBarView: AppView = 'community';

  if (sessionState.status !== 'signed-in') {
    const authData = secureAuthView(identityState);
    return (
      <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
        <NavBar view={navBarView} onNavigate={onNavigate} />
        <div className="flex-1 flex items-center justify-center p-6">
          <SecureAuthCard
            data={authData}
            values={identityState.phase === 'otp' ? [identityState.otp] : [identityState.ksNumber, identityState.password]}
            disabled={identityState.busy}
            errorText={identityState.error}
            onFieldChange={(index, value) => {
              if (identityState.phase === 'otp') identityController.setOtp(value);
              else if (index === 0) identityController.setKsNumber(value);
              else identityController.setPassword(value);
            }}
            onChoice={value => {
              if (value === 'submit_credentials') void identityController.submitCredentials();
              else if (value === 'submit_otp') void identityController.submitOtp();
              else if (value === 'reset_credentials') identityController.reset();
              else if (value === 'cancel_auth') { setIdentityController(createIdentityController(auth, session)); onNavigate('conversation'); }
            }}
          />
        </div>
      </div>
    );
  }

  let body: React.ReactNode;
  if (state.profile.status === 'error') {
    body = <div className="p-6"><ErrorStateCard data={errorView(errorText(state.profile.error))} onChoice={() => void controller.load()} /></div>;
  } else if (state.profile.status !== 'ready') {
    body = <p role="status" className="text-sm text-sand-500 text-center py-10">Loading your Circle profile…</p>;
  } else {
    const profile = state.profile.data;
    body = (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
          <button onClick={() => onNavigate('community')} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            Community
          </button>
          <PageHeader title="Your Circle profile" />
        </div>

        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
          <Surface className="animate-quiet-in">
            <SurfaceBody>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-forest-500" />
                <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Identity</span>
              </div>
              <div className="text-[0.95rem] font-medium text-forest-800">{profile.displayName || profile.canonicalKsNumber}</div>
              <div className="text-[0.78rem] text-sand-500 mt-0.5">{profile.canonicalKsNumber}</div>
              <div className="mt-3 flex items-center gap-1.5 text-[0.78rem] text-sand-600">
                <ShieldCheck className="w-3.5 h-3.5 text-sand-400" />
                {circleVerificationStatusLabel[profile.verificationStatus]}
              </div>
              <div className="text-[0.72rem] text-sand-400 mt-1">SecurePay identity since {profile.memberSince}</div>
            </SurfaceBody>
          </Surface>

          <Surface>
            <SurfaceBody>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-forest-500" />
                <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Real network activity</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-cream-50 px-3 py-2.5">
                  <div className="text-[0.95rem] font-medium text-forest-800">{profile.referredTraderCount}</div>
                  <div className="text-[0.68rem] text-sand-500">Traders referred</div>
                </div>
                <div className="rounded-xl bg-cream-50 px-3 py-2.5">
                  <div className="text-[0.95rem] font-medium text-forest-800">{profile.activatedReferredTraderCount}</div>
                  <div className="text-[0.68rem] text-sand-500">Referrals activated</div>
                </div>
                <div className="rounded-xl bg-cream-50 px-3 py-2.5">
                  <div className="text-[0.95rem] font-medium text-forest-800">{profile.agreementsBroughtInCount}</div>
                  <div className="text-[0.68rem] text-sand-500">Agreements brought in</div>
                </div>
              </div>
            </SurfaceBody>
          </Surface>

          <button
            onClick={onAskAgent}
            className="w-full rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-3 text-left hover:bg-cream-50 transition-colors"
          >
            <span className="text-[0.825rem] font-medium text-forest-600">Ask SecurePay to find help in the community</span>
            <p className="text-[0.72rem] text-sand-400 mt-0.5">SecurePay can look for real people, businesses, and offers that match what you need</p>
          </button>

          <Surface>
            <SurfaceBody>
              <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Named Circles</div>
              <p className="text-[0.825rem] text-sand-600">
                Named Circles — discovery, member directories, joining, creating, and a Circle-scoped economic
                story — are not available yet. SecurePay does not currently record Circle membership as a
                named group; only the real activity above is authoritative.
              </p>
            </SurfaceBody>
          </Surface>

          <p className="text-[0.68rem] text-sand-400 italic px-2">
            Referred trader count ≠ followers. Activated referrals ≠ reputation. Agreements brought in ≠
            revenue. Identity status ≠ professional qualification.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view={navBarView} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col overflow-hidden">{body}</div>
    </div>
  );
}
