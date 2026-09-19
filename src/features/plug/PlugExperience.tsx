import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, HandHelping, ArrowRight, ShieldCheck } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { SecureAuthCard } from '../../components/SecureAuth';
import { Surface, SurfaceBody } from '../../components/dna/Surface';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { MoneyValue } from '../../components/dna/MoneyValue';
import { decimalMoney } from '../../decimalMoney';
import type { MarketNetworkGateway } from '../../api/securepay/marketnetwork';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import type { AppView } from '../../types';
import { createPlugController, errorText } from './controller';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';
import type { CustomerMarketRequestType } from '../../api/securepay/marketnetwork/dto';

/**
 * Customer-side "get connected with a Plug" flow (task section 6/7/18). Bolt's `PlugProfileCard` stays
 * fixture-only: it assumes a browsable, named Plug directory that does not exist on the real backend — the
 * real candidate-selection projection carries only an opaque `candidateRef`/`interestedAt` (task section 7,
 * confirmed absent: no name/domain/geography anywhere in `InterestedCandidateResponse`). This is a new,
 * narrow real screen sequence in the same visual language, not a redesign of Bolt's directory.
 */
export function PlugExperience({ gateway, attributionGateway, auth, session, agreementId, onNavigate }: {
  gateway: Pick<MarketNetworkGateway, 'createRequest' | 'candidates' | 'selectCandidate' | 'openRelationship' | 'relationshipLifecycle'>;
  attributionGateway: Pick<AgreementGateway, 'attributePlug' | 'plugAttribution' | 'referralStatus'>;
  auth: AuthGateway; session: SessionStore;
  agreementId?: string | null;
  onNavigate: (view: AppView) => void;
}) {
  const [controller] = useState(() => createPlugController({ ...gateway, attribution: attributionGateway }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const identityState = useSyncExternalStore(identityController.subscribe, identityController.getSnapshot);
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);

  useEffect(() => {
    if (sessionState.status !== 'signed-in') { controller.reset(); return; }
    if (agreementId) {
      void controller.loadExistingAttribution(agreementId);
      void controller.loadReferralStatus(agreementId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementId, sessionState.status]);

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
              else if (value === 'cancel_auth') { setIdentityController(createIdentityController(auth, session)); onNavigate('ecosystem'); }
            }}
          />
        </div>
      </div>
    );
  }

  let body: React.ReactNode;

  if (agreementId && state.existingAttribution.status === 'ready') {
    const attribution = state.existingAttribution.data;
    const referral = state.referralStatus.status === 'ready' ? state.referralStatus.data : null;
    body = (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <Surface>
          <SurfaceBody>
            <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-forest-600" /><span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Plug attribution</span></div>
            <div className="text-[0.85rem] text-forest-800">Introduced by Plug: {attribution.plugKsNumber}</div>
            <div className="text-[0.72rem] text-sand-500 mt-1">Attributed {attribution.attributedAt}</div>
            <p className="text-[0.68rem] text-sand-400 mt-2">This is permanent for this Agreement — it cannot be changed to a different Plug.</p>
          </SurfaceBody>
        </Surface>
        {referral && (
          <Surface>
            <SurfaceBody>
              <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Referral evaluation status</div>
              <p className="text-[0.85rem] text-forest-800 font-medium">{referral.state.replace(/_/g, ' ')}</p>
              {referral.reward && (
                <div className="text-[0.8rem] text-sand-600 mt-1">Referral reward: <MoneyValue amount={decimalMoney(referral.reward.amountMinor, referral.reward.currency)} size="sm" /></div>
              )}
              <p className="text-[0.72rem] text-sand-500 mt-1">Reward earned: {referral.rewardEarned ? 'yes' : 'no'} · Reward paid: {referral.rewardPaid ? 'yes' : 'no'}</p>
              <p className="text-[0.68rem] text-sand-400 mt-2 italic">Referral reward ≠ wallet balance, settlement balance, or Payment Ready. It is never released from this screen.</p>
            </SurfaceBody>
          </Surface>
        )}
      </div>
    );
  } else if (state.relationship.status === 'ready') {
    const relationship = state.relationship.data;
    body = (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <Surface className="animate-quiet-in">
          <SurfaceBody>
            <div className="flex items-center gap-2 mb-2"><HandHelping className="w-4 h-4 text-forest-500" /><span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Relationship opened</span></div>
            <p className="text-[0.85rem] text-forest-800">Status: {relationship.status}</p>
            <p className="text-[0.78rem] text-sand-600 mt-1">Contact exchange available: {relationship.contactExchangeAvailable ? 'yes' : 'no'}</p>
          </SurfaceBody>
        </Surface>
        {agreementId && (
          <>
            {state.attributionError && <StatusNotice tone="warning" icon={false}>{state.attributionError}</StatusNotice>}
            <Button
              onClick={() => void controller.attributeToAgreement(agreementId, relationship.relationshipRef)}
              disabled={state.attributionBusy}
              className="w-full flex items-center justify-center gap-2 py-3"
            >
              Attribute this Plug to this agreement
              <ArrowRight className="w-4 h-4" />
            </Button>
          </>
        )}
        <p className="text-[0.68rem] text-sand-400 italic px-2">Plug ≠ Agreement party. An introduction is not selection, acceptance, or Agreement confirmation.</p>
      </div>
    );
  } else if (state.candidates.status === 'ready' || state.candidates.status === 'empty') {
    const requestId = state.request.status === 'ready' ? state.request.data.requestId : null;
    body = (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <Surface>
          <SurfaceBody>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Interested Plugs</div>
            {state.candidates.status === 'empty' && <p className="text-[0.825rem] text-sand-500">No one has expressed interest yet.</p>}
            {state.candidates.status === 'ready' && (
              <div className="space-y-2">
                {state.candidates.data.map(c => (
                  <button
                    key={c.candidateRef}
                    onClick={() => controller.selectCandidateRef(c.candidateRef)}
                    disabled={state.selection.status === 'loading' || state.relationship.status === 'loading'}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-all disabled:opacity-50 ${state.selectedCandidateRef === c.candidateRef ? 'border-forest-400 bg-forest-50/40' : 'border-cream-200 hover:border-forest-300'}`}
                  >
                    <div className="text-[0.85rem] text-forest-800">Candidate — interested {c.interestedAt}</div>
                    <p className="text-[0.68rem] text-sand-400 mt-0.5">SecurePay does not yet expose a name or profile for this candidate.</p>
                  </button>
                ))}
              </div>
            )}
          </SurfaceBody>
        </Surface>
        {state.selection.status === 'error' && <StatusNotice tone="warning" icon={false}>{errorText(state.selection.error)}</StatusNotice>}
        {state.relationship.status === 'error' && <StatusNotice tone="warning" icon={false}>{errorText(state.relationship.error)}</StatusNotice>}
        {state.selectedCandidateRef && requestId && (
          <Button
            onClick={() => void (async () => {
              const selected = await controller.confirmSelection(requestId);
              if (selected) await controller.openRelationship(requestId);
            })()}
            disabled={state.selection.status === 'loading' || state.relationship.status === 'loading'}
            className="w-full flex items-center justify-center gap-2 py-3"
          >
            {state.selection.status === 'loading' ? 'Confirming selection…' : state.relationship.status === 'loading' ? 'Opening relationship…' : 'Connect with this candidate'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  } else {
    const requestId = state.request.status === 'ready' ? state.request.data.requestId : null;
    body = (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <Surface>
          <SurfaceBody>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-forest-50 flex items-center justify-center shrink-0"><HandHelping className="w-4.5 h-4.5 text-forest-500" /></div>
              <div className="flex-1">
                <div className="text-[0.875rem] font-medium text-forest-800">Ask SecurePay to connect you with a Plug</div>
                <p className="text-[0.72rem] text-sand-500 mt-0.5">SecurePay does not yet have a browsable Plug directory. This asks the market to find someone who can help.</p>
              </div>
            </div>
            {state.request.status === 'error' && <StatusNotice tone="warning" icon={false} className="mt-2">{errorText(state.request.error)}</StatusNotice>}
            <div className="mt-3 space-y-2">
              {(['GENERAL_SECUREPAY_HELP', 'PROPERTY_JOURNEY_HELP'] as CustomerMarketRequestType[]).map(type => (
                <button
                  key={type}
                  onClick={() => void controller.startRequest(type)}
                  disabled={state.request.status === 'loading'}
                  className="w-full rounded-xl border border-cream-200 px-4 py-3 text-left hover:border-forest-300 text-[0.825rem] text-forest-800 disabled:opacity-40"
                >
                  {state.request.status === 'loading' ? 'Starting request…' : type === 'GENERAL_SECUREPAY_HELP' ? 'General SecurePay help' : 'Property journey help'}
                </button>
              ))}
            </div>
          </SurfaceBody>
        </Surface>
        {requestId && (
          <Button onClick={() => void controller.loadCandidates(requestId)} className="w-full flex items-center justify-center gap-2 py-3">
            See who is interested
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        {agreementId && state.existingAttribution.status === 'error' && (
          <StatusNotice tone="error" icon={true}>{errorText(state.existingAttribution.error)}</StatusNotice>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view={navBarView} onNavigate={onNavigate} />
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={() => onNavigate('ecosystem')} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Help
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">{body}</div>
    </div>
  );
}
