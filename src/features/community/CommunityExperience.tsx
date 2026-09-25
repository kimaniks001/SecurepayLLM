import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavBar } from '../../components/NavBar';
import { CommunityHome } from '../../components/CommunityHome';
import { CommunityObjectDetail } from '../../components/CommunityObjectDetail';
import { CommunityCreatePanel } from '../../components/CommunityCreatePanel';
import { ErrorStateCard } from '../../components/ErrorState';
import { StatusNotice } from '../../components/dna/StatusNotice';
import type { StoreGateway } from '../../api/securepay/store';
import type { CommunityGateway } from '../../api/securepay/community';
import type { AppView, ErrorStateResponse } from '../../types';
import { createCommunityController, errorText, REAL_COMPOSE_TYPES } from './controller';
import { storeResultToCommunityObject, parseStoreOfferCommunityObjectId, realObjectToCommunityObject } from './view';

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
export function CommunityExperience({ gateway, communityGateway, trustedMediaOrigin, onNavigate, onOpenStoreOffer, onOpenCircle }: {
  gateway: Gateway;
  communityGateway: CommunityGateway;
  trustedMediaOrigin: string | null;
  onNavigate: (view: AppView) => void;
  onOpenStoreOffer: (canonicalKsNumber: string, offerId: string) => void;
  onOpenCircle: () => void;
}) {
  const [controller] = useState(() => createCommunityController(gateway, communityGateway, trustedMediaOrigin));
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
  const realObjects = state.feed.status === 'ready' ? state.feed.data.map(realObjectToCommunityObject) : [];
  const storeObjects = state.search.status === 'ready' ? state.search.data.map(storeResultToCommunityObject) : [];
  const objects = [...realObjects, ...storeObjects];
  const selectedStore = state.selectedObjectId && !state.selectedRealObject
    ? (state.search.status === 'ready' ? state.search.data.find(r => storeResultToCommunityObject(r).id === state.selectedObjectId) : undefined)
    : undefined;

  let body: React.ReactNode;
  if (state.view === 'compose') {
    body = (
      <CommunityCreatePanel
        options={REAL_COMPOSE_TYPES}
        objectType={state.draft.objectType}
        title={state.draft.title}
        body={state.draft.body}
        locationLabel={state.draft.locationLabel}
        submitting={state.draft.submitting}
        error={state.draft.error}
        onSelectType={type => controller.setComposeType(type)}
        onTitleChange={value => controller.setComposeField('title', value)}
        onBodyChange={value => controller.setComposeField('body', value)}
        onLocationChange={value => controller.setComposeField('locationLabel', value)}
        onSubmit={() => void controller.submitCompose()}
        onCancel={() => controller.cancelComposer()}
      />
    );
  } else if (state.view === 'object' && state.selectedRealObject) {
    const object = realObjectToCommunityObject(state.selectedRealObject);
    const isOwn = state.ownObjectIds.has(state.selectedRealObject.id);
    body = (
      <CommunityObjectDetail
        object={object}
        offer={null}
        onBack={() => controller.backToHome()}
        onICanHelp={() => controller.showNotice('This area is not available yet.')}
        onDiscuss={() => controller.showNotice('This area is not available yet.')}
        onViewOffer={() => {}}
        onToTrade={() => controller.showNotice('This area is not available yet.')}
        onClose={isOwn ? () => void controller.closeObject(object.id) : undefined}
      />
    );
  } else if (state.view === 'object' && selectedStore) {
    const object = storeResultToCommunityObject(selectedStore);
    body = (
      <CommunityObjectDetail
        object={object}
        offer={selectedStore.offer}
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
  } else if (state.search.status === 'error' && state.feed.status !== 'ready' && objects.length === 0) {
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
        onCreate={() => controller.openComposer()}
        onStartConversation={() => onNavigate('signed-in')}
        onOpenCircles={onOpenCircle}
        onOpenEcosystem={() => onNavigate('ecosystem')}
        storeSearchStatus={state.search.status === 'idle' ? undefined : state.search.status === 'loading' ? 'loading' : state.search.status === 'error' ? 'error' : 'ready'}
        storeSearchErrorText={state.search.status === 'error' ? errorText(state.search.error) : null}
        // No named-Circle/group authority exists on the backend (task: "Remove fake named-Circle copy
        // from real Community") — never name fictitious Circles or imply membership in one.
        circlesEntryLabel="Your Circle profile"
        circlesEntryDescription="See your real network activity — referrals, agreements brought in, and growth credit. Not a named Circle or group."
        // Phase 6 Slice 1 -- the feed above (Questions/Needs/Opportunities/Work Stories/Discussions) is
        // real and always shown; the search box still searches Store offers only (real full-text
        // Community search is Slice 5) -- copy says exactly that, never more.
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
