import { useState } from 'react';
import type { AgentResponse, Understanding, Provider, StoreProduct } from '../types';
import { ProviderCard } from './ProviderCard';
import { PriceContextCard } from './PriceContextCard';
import { ComparisonView } from './ComparisonView';
import { AgreementPreviewCard } from './AgreementPreview';
import { StoreProductCard } from './StoreProductCard';
import { ProviderQuoteCard } from './ProviderQuoteCard';
import { IdentityCheck } from './IdentityCheck';
import { MoneyHandoff } from './MoneyHandoff';
import { ContributionPlanCard } from './ContributionPlan';
import { PurchaseChecklistCard } from './PurchaseChecklist';
import { ChamaSetupCard } from './ChamaSetup';
import { GovernanceControlCard } from './GovernanceControl';
import { QuoteReviewCard } from './QuoteReview';
import { AgreementResultCard } from './AgreementResult';
import { ProviderHistoryCard } from './ProviderHistory';
import { ProductComparisonCard } from './ProductComparison';
import { CommunityDiscussionCard } from './CommunityDiscussion';
import { CommunityStoryCard } from './CommunityStory';
import { MapCard } from './MapCard';
import { DocumentListCard } from './DocumentList';
import { CanonicalAgreementCard } from './CanonicalAgreement';
import { AgreementSentCard } from './AgreementSent';
import { RecipientReviewCard } from './RecipientReview';
import { JoinedStatusCard } from './JoinedStatus';
import { AgreementEstablishedCard } from './AgreementEstablished';
import { MoneyReadyCard } from './MoneyReady';
import { UnderstandingDrawer } from './UnderstandingDrawer';
import type { PanelMode } from '../mockAgent';

interface ContextPanelProps {
  lastRichResponses: AgentResponse[];
  understanding: Understanding;
  selectedProviderId: string | null;
  onSelectProvider: (id: string) => void;
  panelTitle: string;
  panelMode: PanelMode;
  onChoice?: (value: string) => void;
}

export function ContextPanel({
  lastRichResponses,
  understanding,
  selectedProviderId,
  onSelectProvider,
  panelTitle,
  panelMode,
  onChoice,
}: ContextPanelProps) {
  const [understandingOpen, setUnderstandingOpen] = useState(false);

  const richTypes = [
    'PROVIDER_CARDS',
    'STORE_PRODUCT_CARDS',
    'PRICE_CONTEXT',
    'COMPARISON',
    'AGREEMENT_PREVIEW',
    'PROVIDER_QUOTE',
    'PHOTO',
    'IDENTITY_CHECK',
    'MONEY_HANDOFF',
    'CONTRIBUTION_PLAN',
    'PURCHASE_CHECKLIST',
    'CHAMA_SETUP',
    'GOVERNANCE',
    'QUOTE_REVIEW',
    'AGREEMENT_RESULT',
    'PROVIDER_HISTORY',
    'PRODUCT_COMPARISON',
    'COMMUNITY_DISCUSSION',
    'COMMUNITY_STORY',
    'MAP_RESULT',
    'DOCUMENT_LIST',
    'CANONICAL_AGREEMENT',
    'AGREEMENT_SENT',
    'RECIPIENT_REVIEW',
    'JOINED_STATUS',
    'AGREEMENT_ESTABLISHED',
    'MONEY_READY',
  ];
  const richResponses = lastRichResponses.filter((r) => richTypes.includes(r.type));

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
      {/* Dynamic panel title */}
      <div className="flex items-center justify-between">
        <div
          key={panelTitle}
          className="text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide animate-quiet-in"
        >
          {panelTitle}
        </div>
      </div>

      {/* Understanding as secondary drawer when panel is not understanding mode */}
      {panelMode !== 'understanding' && (
        <UnderstandingDrawer
          understanding={understanding}
          expanded={understandingOpen}
          onToggle={() => setUnderstandingOpen((v) => !v)}
        />
      )}

      {/* Understanding is primary when panelMode is 'understanding' */}
      {panelMode === 'understanding' && (
        <UnderstandingDrawer
          understanding={understanding}
          expanded={true}
          onToggle={() => {}}
        />
      )}

      {/* Rich content based on panel mode — keyed for smooth transition */}
      <div key={panelMode} className="space-y-3 animate-fade-in">
        {richResponses.map((response, i) => {
          if (response.type === 'PROVIDER_CARDS' && (panelMode === 'providers' || panelMode === 'providerProfile')) {
            return (
              <div key={i} className="space-y-3">
                {response.providers.map((provider: Provider, pi: number) => (
                  <div
                    key={provider.id}
                    className="animate-reveal-stagger"
                    style={{ animationDelay: `${0.1 + pi * 0.12}s` }}
                  >
                    <ProviderCard
                      provider={provider}
                      compact
                      selected={selectedProviderId === provider.id}
                      dimmed={selectedProviderId !== null && selectedProviderId !== provider.id}
                      onSelect={() => onSelectProvider(provider.id)}
                    />
                  </div>
                ))}
              </div>
            );
          }
          if (response.type === 'PRICE_CONTEXT' && panelMode === 'price') {
            return <PriceContextCard key={i} data={response} />;
          }
          if (response.type === 'COMPARISON' && panelMode === 'comparison') {
            return <ComparisonView key={i} data={response} />;
          }
          if (response.type === 'AGREEMENT_PREVIEW' && panelMode === 'agreement') {
            return <AgreementPreviewCard key={i} data={response} onChoice={onChoice} />;
          }
          if (response.type === 'PROVIDER_QUOTE' && panelMode === 'quote') {
            return <ProviderQuoteCard key={i} data={response} />;
          }
          if (response.type === 'IDENTITY_CHECK' && panelMode === 'identity') {
            return <IdentityCheck key={i} data={response} />;
          }
          if (response.type === 'MONEY_HANDOFF' && panelMode === 'money') {
            return <MoneyHandoff key={i} data={response} />;
          }
          if (response.type === 'CONTRIBUTION_PLAN' && (panelMode === 'contribution' || panelMode === 'understanding')) {
            return <ContributionPlanCard key={i} data={response} />;
          }
          if (response.type === 'PURCHASE_CHECKLIST' && (panelMode === 'checklist' || panelMode === 'understanding')) {
            return <PurchaseChecklistCard key={i} data={response} />;
          }
          if (response.type === 'CHAMA_SETUP' && (panelMode === 'chama' || panelMode === 'understanding')) {
            return <ChamaSetupCard key={i} data={response} />;
          }
          if (response.type === 'GOVERNANCE' && (panelMode === 'governance' || panelMode === 'agreement')) {
            return <GovernanceControlCard key={i} data={response} />;
          }
          if (response.type === 'QUOTE_REVIEW' && panelMode === 'quoteReview') {
            return <QuoteReviewCard key={i} data={response} />;
          }
          if (response.type === 'AGREEMENT_RESULT' && (panelMode === 'retrieval' || panelMode === 'understanding')) {
            return <AgreementResultCard key={i} data={response} />;
          }
          if (response.type === 'PROVIDER_HISTORY' && (panelMode === 'providerHistory' || panelMode === 'providerProfile')) {
            return <ProviderHistoryCard key={i} data={response} />;
          }
          if (response.type === 'PRODUCT_COMPARISON' && panelMode === 'storeComparison') {
            return <ProductComparisonCard key={i} data={response} />;
          }
          if (response.type === 'COMMUNITY_DISCUSSION' && panelMode === 'community') {
            return <CommunityDiscussionCard key={i} data={response} />;
          }
          if (response.type === 'COMMUNITY_STORY' && panelMode === 'community') {
            return <CommunityStoryCard key={i} data={response} />;
          }
          if (response.type === 'MAP_RESULT' && panelMode === 'map') {
            return <MapCard key={i} data={response} />;
          }
          if (response.type === 'DOCUMENT_LIST' && panelMode === 'documents') {
            return <DocumentListCard key={i} data={response} />;
          }
          if (response.type === 'CANONICAL_AGREEMENT' && (panelMode === 'canonicalReview' || panelMode === 'acceptance')) {
            return <CanonicalAgreementCard key={i} data={response} onChoice={onChoice ?? (() => {})} />;
          }
          if (response.type === 'AGREEMENT_SENT' && panelMode === 'agreementSent') {
            return <AgreementSentCard key={i} data={response} />;
          }
          if (response.type === 'RECIPIENT_REVIEW' && panelMode === 'recipientReview') {
            return <RecipientReviewCard key={i} data={response} onChoice={onChoice ?? (() => {})} />;
          }
          if (response.type === 'JOINED_STATUS' && panelMode === 'joined') {
            return <JoinedStatusCard key={i} data={response} />;
          }
          if (response.type === 'AGREEMENT_ESTABLISHED' && panelMode === 'established') {
            return <AgreementEstablishedCard key={i} data={response} />;
          }
          if (response.type === 'MONEY_READY' && panelMode === 'moneyReady') {
            return <MoneyReadyCard key={i} data={response} />;
          }
          if (response.type === 'STORE_PRODUCT_CARDS' && (panelMode === 'providers' || panelMode === 'providerProfile')) {
            return (
              <div key={i} className="space-y-3">
                {response.products.map((product: StoreProduct, pi: number) => (
                  <div
                    key={product.id}
                    className="animate-reveal-stagger"
                    style={{ animationDelay: `${0.1 + pi * 0.12}s` }}
                  >
                    <StoreProductCard product={product} compact />
                  </div>
                ))}
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Empty state */}
      {richResponses.length === 0 && panelMode === 'understanding' && (
        <div className="flex flex-col items-center justify-center py-12 text-center animate-quiet-in">
          <div className="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-sand-400">
              <circle cx="16" cy="11" r="5.5" fill="currentColor" opacity="0.6" />
              <path d="M6 27c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>
          <p className="text-[0.825rem] text-sand-400 max-w-[200px] leading-relaxed">
            As you talk, relevant people, prices, and details will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
