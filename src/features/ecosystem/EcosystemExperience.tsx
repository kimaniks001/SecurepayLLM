import { useState } from 'react';
import { TradeHelpPanel } from '../../components/TradeHelpPanel';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { MasterExperience } from '../master/MasterExperience';
import { PlugExperience } from '../plug/PlugExperience';
import { ReferralExperience } from '../referral/ReferralExperience';
import type { MasterGateway } from '../../api/securepay/master';
import type { MarketNetworkGateway } from '../../api/securepay/marketnetwork';
import type { ReferralGateway } from '../../api/securepay/referral';
import type { AgreementGateway } from '../../api/securepay/agreements';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import type { AppView } from '../../types';

type Sub = 'help' | 'plug' | 'master' | 'referral';

/**
 * Real router for Referrals + Plugs + Masters (Golden Spine H). Mirrors the same "thin router over
 * per-domain Experience components" pattern `AgentExperience` already uses for Store/Community/Circle.
 * `TradeHelpPanel` is reused unchanged (its own onClick props already separate Plugs/Masters/Solutions/
 * Partners/Agent — this only wires the ones with real backend authority this phase; Solutions/Partners
 * remain the documented demo-only gap, task section 22 doctrine).
 */
export function EcosystemExperience({ masterGateway, marketNetworkGateway, referralGateway, agreementGateway, auth, session, agreementId, onNavigate, onAskAgent }: {
  masterGateway: MasterGateway;
  marketNetworkGateway: Pick<MarketNetworkGateway, 'createRequest' | 'candidates' | 'selectCandidate' | 'openRelationship' | 'relationshipLifecycle'>;
  referralGateway: ReferralGateway;
  agreementGateway: Pick<AgreementGateway, 'attributePlug' | 'plugAttribution' | 'referralStatus'>;
  auth: AuthGateway; session: SessionStore;
  /** Present only when entered from a specific Agreement's Support tab (task section 17/18). */
  agreementId?: string | null;
  onNavigate: (view: AppView) => void;
  onAskAgent: () => void;
}) {
  const [sub, setSub] = useState<Sub>(agreementId ? 'plug' : 'help');
  const [notice, setNotice] = useState<string | null>(null);

  if (sub === 'master') return <MasterExperience gateway={masterGateway} auth={auth} session={session} onNavigate={view => (view === 'ecosystem' ? setSub('help') : onNavigate(view))} />;
  if (sub === 'plug') return <PlugExperience gateway={marketNetworkGateway} attributionGateway={agreementGateway} auth={auth} session={session} agreementId={agreementId} onNavigate={view => (view === 'ecosystem' ? (agreementId ? onNavigate('agreement-detail') : setSub('help')) : onNavigate(view))} />;
  if (sub === 'referral') return <ReferralExperience gateway={referralGateway} auth={auth} session={session} onNavigate={view => (view === 'ecosystem' ? setSub('help') : onNavigate(view))} />;

  return (
    <>
      {notice && <div className="px-4 py-2"><StatusNotice tone="info" icon={false}>{notice} <button onClick={() => setNotice(null)} className="underline">Dismiss</button></StatusNotice></div>}
      <TradeHelpPanel
        onBack={() => onNavigate('signed-in')}
        onPlugs={() => setSub('plug')}
        onMasters={() => setSub('master')}
        onSolutions={() => setNotice('Formal Solutions are not available yet.')}
        onPartners={() => setNotice('Partners are not available yet.')}
        onAskAgent={onAskAgent}
        onReferrals={() => setSub('referral')}
      />
    </>
  );
}
