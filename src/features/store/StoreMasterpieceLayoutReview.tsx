import { useState } from 'react';
import { StoreHome } from '../../components/StoreHome';

/**
 * Read-only, explicitly labelled visual inspection of the REAL StoreHome
 * component embedded INSIDE the approved KS001 Living Workspace.
 *
 * This is NOT a mock publication engine, a replacement Store application,
 * a private account, or an authority to use a production API. Once the
 * preview is connected to isolated staging, Phase1LivingWorkspacePreview
 * mounts the complete StoreExperience instead.
 */
export function StoreMasterpieceLayoutReview() {
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const unavailable = (action: string) => setNotice(
    action + ' needs an authenticated isolated Store staging API. ' +
    'This preview is for checking the actual Living Workspace layout only. ' +
    'Nothing was published, sent or changed.',
  );
  return (
    <div data-p0-layout-review-only className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-cream-50">
      <div role="status" className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
        <strong>Layout review only — no live Store backend.</strong>{' '}
        This is the Store component inside the real KS001 workspace.
        Store publication, enquiry and sign-in require isolated staging before functional testing.
      </div>
      {notice && <div role="alert" className="shrink-0 border-b border-cream-200 bg-white px-4 py-3 text-xs text-forest-800">{notice}</div>}
      <StoreHome
        embedded
        offers={[]}
        stores={[]}
        query={query}
        onQueryChange={setQuery}
        searchStatus="error"
        searchErrorText="A safe staging Store API has not been connected to this visual preview. No offers have been queried."
        onOpenOffer={() => unavailable('Offer inspection')}
        onOpenStore={() => unavailable('Opening a trader shop')}
        onManageStore={() => unavailable('Store management')}
        onCreateOffer={() => unavailable('Offer creation')}
        onStartConversation={() => unavailable('Conversation handoff')}
        onAskKs001={() => unavailable('Store-to-KS001 handoff')}
      />
    </div>
  );
}
