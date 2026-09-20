import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavBar } from '../../components/NavBar';
import { CommunityHome } from '../../components/CommunityHome';
import { CommunityObjectDetail } from '../../components/CommunityObjectDetail';
import { ErrorStateCard } from '../../components/ErrorState';
import { StatusNotice } from '../../components/dna/StatusNotice';
import type { StoreGateway } from '../../api/securepay/store';
import type { AppView, ErrorStateResponse } from '../../types';
import { createCommunityController, errorText } from './controller';
import { storeResultToCommunityObject, parseStoreOfferCommunityObjectId } from './view';

type Gateway = Pick<StoreGateway, 'search'>;

function errorView(message: string): ErrorStateResponse {
  return { type: 'ERROR_STATE', title: 'SecurePay could not load Community', text: message, primaryLabel: 'Try again', primaryValue: 'retry' };
}

/**
 * Community's only real content this phase is a bounded, truthful composition over the already-
 * productionized Store search (task sections 3/7/9) — never a copy of Question/Need/Opportunity/Work
 * Story/Discussion authority, none of which exists on the backend (docs/PRODUCTION_MIGRATION_LEDGER.md
 * section 17). Opening a Store-offer-reference card hands off through the real Store feature's own
 * `openOffer` (via `onOpenStoreOffer`) rather than rebuilding a parallel provenance/adoption path —
 * "Use this" on that offer is exactly the existing STORE_LISTING seam, never COMMUNITY_KNOWLEDGE.
 * People/business discovery and the composer/discussion actions have no real backend contract; both
 * degrade to a truthful empty state / unavailable notice rather than the fixture demo data.
 */
export function CommunityExperience({ gateway, trustedMediaOrigin, onNavigate, onOpenStoreOffer, onOpenCircle }: {
  gateway: Gateway;
  trustedMediaOrigin: string | null;
  onNavigate: (view: AppView) => void;
  onOpenStoreOffer: (canonicalKsNumber: string, offerId: string) => void;
  onOpenCircle: () => void;
}) {
  const [controller] = useState(() => createCommunityController(gateway, trustedMediaOrigin));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  useEffect(() => {
    void controller.enter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // See the identical, more consequential fix in features/store/StoreExperience.tsx: a boolean
  // "skip the first run" ref is not safe under React 18 StrictMode's dev-only mount replay, which
  // re-invokes this effect twice on initial mount and would otherwise arm a real 400ms re-search timer.
  const previousQuery = useRef(state.query);
  useEffect(() => {
    if (previousQuery.current === state.query) return;
    previousQuery.current = state.query;
    const handle = setTimeout(() => void controller.submitSearch(), 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.query]);

  const navBarView: AppView = 'community';
  const objects = state.search.status === 'ready' ? state.search.data.map(storeResultToCommunityObject) : [];
  const selected = state.selectedObjectId
    ? (state.search.status === 'ready' ? state.search.data.find(r => storeResultToCommunityObject(r).id === state.selectedObjectId) : undefined)
    : undefined;

  let body: React.ReactNode;
  if (state.view === 'object' && selected) {
    const object = storeResultToCommunityObject(selected);
    body = (
      <CommunityObjectDetail
        object={object}
        offer={selected.offer}
        onBack={() => controller.backToHome()}
        onICanHelp={() => controller.showNotice('This area is not available yet.')}
        onDiscuss={() => controller.showNotice('This area is not available yet.')}
        onViewOffer={() => {
          const ids = parseStoreOfferCommunityObjectId(object.id);
          if (ids) onOpenStoreOffer(ids.canonicalKsNumber, ids.offerId);
        }}
        onToTrade={() => controller.showNotice('This area is not available yet.')}
      />
    );
  } else if (state.search.status === 'error' && objects.length === 0) {
    body = <div className="p-6"><ErrorStateCard data={errorView(errorText(state.search.error))} onChoice={() => void controller.submitSearch()} /></div>;
  } else {
    body = (
      <CommunityHome
        query={state.query}
        onQueryChange={q => controller.setQuery(q)}
        objects={objects}
        people={[]}
        businesses={[]}
        onOpenObject={id => controller.openObject(id)}
        onOpenPerson={() => {}}
        onOpenBusiness={() => {}}
        onCreate={() => controller.showNotice('Sharing with the community is not available yet.')}
        onStartConversation={() => onNavigate('signed-in')}
        onOpenCircles={onOpenCircle}
        onOpenEcosystem={() => onNavigate('ecosystem')}
        storeSearchStatus={state.search.status === 'idle' ? undefined : state.search.status === 'loading' ? 'loading' : state.search.status === 'error' ? 'error' : 'ready'}
        storeSearchErrorText={state.search.status === 'error' ? errorText(state.search.error) : null}
        // No named-Circle/group authority exists on the backend (task: "Remove fake named-Circle copy
        // from real Community") — never name fictitious Circles or imply membership in one.
        circlesEntryLabel="Your Circle profile"
        circlesEntryDescription="See your real network activity — referrals, agreements brought in, and growth credit. Not a named Circle or group."
        // The real searchable content this phase is Store offers only (task: "Real Community search
        // copy must match real search capability") — never imply people/questions/needs/work were
        // searched when only Store offers actually were.
        searchPlaceholder="Search store offers by category or location..."
        noResultsMessage={`No store offers found for "${state.query}".`}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view={navBarView} onNavigate={onNavigate} />
      {state.notice && (
        <div className="px-4 py-2">
          <StatusNotice tone="info" icon={false}>
            {state.notice} <button onClick={() => controller.dismissNotice()} className="underline">Dismiss</button>
          </StatusNotice>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">{body}</div>
    </div>
  );
}
