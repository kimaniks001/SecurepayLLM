import { useState } from 'react';
import type { ConversationTurn, Understanding, AgentResponse } from '../types';
import { MessageBubble, AgentTyping } from './MessageBubble';
import { ConversationInput } from './ConversationInput';
import { ProviderCard } from './ProviderCard';
import { PriceContextCard } from './PriceContextCard';
import { ComparisonView } from './ComparisonView';
import { PhotoUploadControl, PhotoDisplay } from './PhotoUpload';
import { DatePickerCard } from './DatePicker';
import { AgreementPreviewCard } from './AgreementPreview';
import { CommunityResultCard } from './CommunityResult';
import { ActionConfirmationCard } from './ActionConfirmation';
import { StoreProductCard } from './StoreProductCard';
import { ProviderQuoteCard } from './ProviderQuoteCard';
import { ChoiceButtons } from './ChoiceButtons';
import { UnderstandingDrawer } from './UnderstandingDrawer';
import { NoticeCard } from './NoticeCard';
import { IdentityCheck } from './IdentityCheck';
import { MoneyHandoff } from './MoneyHandoff';
import { StorePrompt } from './StorePrompt';
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
import { LocationPickerCard } from './LocationPicker';
import { DocumentListCard } from './DocumentList';
import { NotificationCard } from './NotificationCard';
import { TransitionConfirmCard } from './TransitionConfirm';
import { SecureAuthCard } from './SecureAuth';
import { CanonicalAgreementCard } from './CanonicalAgreement';
import { AgreementSentCard } from './AgreementSent';
import { RecipientReviewCard } from './RecipientReview';
import { JoinPromptCard } from './JoinPrompt';
import { JoinedStatusCard } from './JoinedStatus';
import { AcceptancePromptCard } from './AcceptancePrompt';
import { ChangeRequestCard } from './ChangeRequest';
import { VersionUpdateCard } from './VersionUpdate';
import { AgreementEstablishedCard } from './AgreementEstablished';
import { MoneyReadyCard } from './MoneyReady';
import { ErrorStateCard } from './ErrorState';

interface ConversationWorkspaceProps {
  turns: ConversationTurn[];
  understanding: Understanding;
  isThinking: boolean;
  onSend: (text: string) => void;
  selectedProviderId: string | null;
  onSelectProvider: (id: string) => void;
  onPhotoUpload: (url: string) => void;
  onPhotoSkip: () => void;
  onDateSelect: (date: string) => void;
  onChoice: (value: string) => void;
}

const INLINE_RICH_TYPES = new Set([
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
  'PERSON_PICKER',
  'DOCUMENT_UPLOAD',
  'PROVIDER_HISTORY',
  'PRODUCT_COMPARISON',
  'COMMUNITY_DISCUSSION',
  'COMMUNITY_STORY',
  'MAP_RESULT',
  'LOCATION_PICKER',
  'DOCUMENT_LIST',
  'NOTIFICATION',
  'TRANSITION_CONFIRM',
  'SECURE_AUTH',
  'CANONICAL_AGREEMENT',
  'AGREEMENT_SENT',
  'RECIPIENT_REVIEW',
  'JOIN_PROMPT',
  'JOINED_STATUS',
  'ACCEPTANCE_PROMPT',
  'CHANGE_REQUEST',
  'VERSION_UPDATE',
  'AGREEMENT_ESTABLISHED',
  'MONEY_READY',
  'ERROR_STATE',
]);

function ResponseRenderer({
  response,
  selectedProviderId,
  onSelectProvider,
  onPhotoUpload,
  onPhotoSkip,
  onDateSelect,
  onChoice,
  index,
}: {
  response: AgentResponse;
  selectedProviderId: string | null;
  onSelectProvider: (id: string) => void;
  onPhotoUpload: (url: string) => void;
  onPhotoSkip: () => void;
  onDateSelect: (date: string) => void;
  onChoice: (value: string) => void;
  index: number;
}) {
  const staggerDelay = `${index * 0.15}s`;
  const wrap = (content: React.ReactNode) => {
    if (INLINE_RICH_TYPES.has(response.type)) {
      return <div className="md:hidden">{content}</div>;
    }
    return content;
  };

  switch (response.type) {
    case 'MESSAGE':
      return (
        <div className="animate-quiet-in" style={{ animationDelay: staggerDelay }}>
          <MessageBubble text={response.text} sender="agent" agentState="understood" />
        </div>
      );

    case 'PROVIDER_CARDS':
      return wrap(
        <div className="space-y-3">
          {response.heading && (
            <p className="text-[0.8rem] font-medium text-sand-500 uppercase tracking-wide px-1 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
              {response.heading}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {response.providers.map((provider, pi) => (
              <div
                key={provider.id}
                className="animate-reveal-stagger"
                style={{ animationDelay: `${0.2 + pi * 0.12}s` }}
              >
                <ProviderCard
                  provider={provider}
                  selected={selectedProviderId === provider.id}
                  onSelect={() => onSelectProvider(provider.id)}
                />
              </div>
            ))}
          </div>
        </div>
      );

    case 'PRICE_CONTEXT':
      return wrap(<PriceContextCard data={response} />);

    case 'COMPARISON':
      return wrap(<ComparisonView data={response} />);

    case 'PHOTO':
      return wrap(<PhotoDisplay data={response} />);

    case 'PHOTO_UPLOAD':
      return <PhotoUploadControl data={response} onUpload={onPhotoUpload} onSkip={onPhotoSkip} />;

    case 'DATE_PICKER':
      return <DatePickerCard data={response} onSelect={onDateSelect} />;

    case 'AGREEMENT_PREVIEW':
      return wrap(<AgreementPreviewCard data={response} onChoice={onChoice} />);

    case 'STORE_PRODUCT_CARDS':
      return wrap(
        <div className="space-y-3">
          {response.heading && (
            <p className="text-[0.8rem] font-medium text-sand-500 uppercase tracking-wide px-1 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
              {response.heading}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {response.products.map((product, pi) => (
              <div
                key={product.id}
                className="animate-reveal-stagger"
                style={{ animationDelay: `${0.2 + pi * 0.12}s` }}
              >
                <StoreProductCard key={product.id} product={product} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'COMMUNITY_RESULT':
      return <CommunityResultCard data={response} />;

    case 'ACTION_CONFIRMATION':
      return (
        <div className="animate-quiet-in" style={{ animationDelay: staggerDelay }}>
          <ActionConfirmationCard data={response} />
        </div>
      );

    case 'PROVIDER_QUOTE':
      return wrap(<ProviderQuoteCard data={response} />);

    case 'CHOICE_BUTTONS':
      return (
        <div className="animate-quiet-in" style={{ animationDelay: staggerDelay }}>
          <ChoiceButtons data={response} onChoice={onChoice} />
        </div>
      );

    case 'NOTICE':
      return (
        <div className="animate-quiet-in" style={{ animationDelay: staggerDelay }}>
          <NoticeCard data={response} />
        </div>
      );

    case 'IDENTITY_CHECK':
      return <IdentityCheck data={response} />;

    case 'MONEY_HANDOFF':
      return <MoneyHandoff data={response} />;

    case 'STORE_PROMPT':
      return (
        <div className="animate-quiet-in" style={{ animationDelay: staggerDelay }}>
          <StorePrompt data={response} />
        </div>
      );

    case 'CONTRIBUTION_PLAN':
      return wrap(<ContributionPlanCard data={response} />);

    case 'PURCHASE_CHECKLIST':
      return wrap(<PurchaseChecklistCard data={response} />);

    case 'CHAMA_SETUP':
      return wrap(<ChamaSetupCard data={response} />);

    case 'GOVERNANCE':
      return wrap(<GovernanceControlCard data={response} />);

    case 'QUOTE_REVIEW':
      return wrap(<QuoteReviewCard data={response} />);

    case 'AGREEMENT_RESULT':
      return wrap(<AgreementResultCard data={response} />);

    case 'PERSON_PICKER':
      return (
        <div className="animate-quiet-in" style={{ animationDelay: staggerDelay }}>
          <div className="rounded-2xl border border-cream-200 bg-white shadow-card p-4">
            <div className="text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide mb-3">{response.label}</div>
            <div className="space-y-2">
              {response.people.map((person, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-forest-50 flex items-center justify-center text-[0.7rem] font-medium text-forest-600">
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-[0.825rem] font-medium text-forest-800">{person.name}</div>
                    <div className="text-[0.7rem] text-sand-500">{person.ksn}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'DOCUMENT_UPLOAD':
      return (
        <div className="animate-quiet-in" style={{ animationDelay: staggerDelay }}>
          <div className="rounded-2xl border border-cream-200 bg-white shadow-card p-4">
            <div className="text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide mb-2">{response.label}</div>
            <div className="border-2 border-dashed border-cream-300 rounded-xl px-4 py-6 text-center">
              <p className="text-[0.825rem] text-sand-500">Drop file here or click to upload</p>
              <p className="text-[0.7rem] text-sand-400 mt-1">{response.acceptedTypes}</p>
            </div>
          </div>
        </div>
      );

    case 'PROVIDER_HISTORY':
      return wrap(<ProviderHistoryCard data={response} />);

    case 'PRODUCT_COMPARISON':
      return wrap(<ProductComparisonCard data={response} />);

    case 'COMMUNITY_DISCUSSION':
      return wrap(<CommunityDiscussionCard data={response} />);

    case 'COMMUNITY_STORY':
      return wrap(<CommunityStoryCard data={response} />);

    case 'MAP_RESULT':
      return wrap(<MapCard data={response} />);

    case 'LOCATION_PICKER':
      return wrap(<LocationPickerCard data={response} />);

    case 'DOCUMENT_LIST':
      return wrap(<DocumentListCard data={response} />);

    case 'NOTIFICATION':
      return (
        <div className="animate-quiet-in" style={{ animationDelay: staggerDelay }}>
          <NotificationCard data={response} />
        </div>
      );

    case 'TRANSITION_CONFIRM':
      return <TransitionConfirmCard data={response} onChoice={onChoice} />;

    case 'SECURE_AUTH':
      return <SecureAuthCard data={response} onChoice={onChoice} />;

    case 'CANONICAL_AGREEMENT':
      return <CanonicalAgreementCard data={response} onChoice={onChoice} />;

    case 'AGREEMENT_SENT':
      return <AgreementSentCard data={response} />;

    case 'RECIPIENT_REVIEW':
      return <RecipientReviewCard data={response} onChoice={onChoice} />;

    case 'JOIN_PROMPT':
      return <JoinPromptCard data={response} onChoice={onChoice} />;

    case 'JOINED_STATUS':
      return <JoinedStatusCard data={response} />;

    case 'ACCEPTANCE_PROMPT':
      return <AcceptancePromptCard data={response} onChoice={onChoice} />;

    case 'CHANGE_REQUEST':
      return <ChangeRequestCard data={response} />;

    case 'VERSION_UPDATE':
      return <VersionUpdateCard data={response} />;

    case 'AGREEMENT_ESTABLISHED':
      return <AgreementEstablishedCard data={response} />;

    case 'MONEY_READY':
      return <MoneyReadyCard data={response} />;

    case 'ERROR_STATE':
      return <ErrorStateCard data={response} onChoice={onChoice} />;

    default:
      return null;
  }
}

export function ConversationWorkspace({
  turns,
  understanding,
  isThinking,
  onSend,
  selectedProviderId,
  onSelectProvider,
  onPhotoUpload,
  onPhotoSkip,
  onDateSelect,
  onChoice,
}: ConversationWorkspaceProps) {
  const [understandingOpen, setUnderstandingOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-6 py-4 space-y-4 pb-4">
        {/* Understanding drawer — mobile only */}
        <div className="md:hidden mb-2">
          <UnderstandingDrawer
            understanding={understanding}
            expanded={understandingOpen}
            onToggle={() => setUnderstandingOpen((v) => !v)}
          />
        </div>

        {turns.map((turn) => (
          <div key={turn.id} className="space-y-3">
            {turn.sender === 'user' && turn.responses.length > 0 && (
              turn.responses[0].type === 'PHOTO' ? (
                <div className="flex justify-end animate-fade-in-up">
                  <div className="max-w-[60%] rounded-2xl rounded-tr-md overflow-hidden shadow-soft border border-cream-200 md:hidden">
                    <img src={(turn.responses[0] as { url: string }).url} alt="Your photo" className="w-full h-40 object-cover" />
                  </div>
                </div>
              ) : (
                <MessageBubble
                  text={(turn.responses[0] as { text: string }).text}
                  sender="user"
                />
              )
            )}
            {turn.sender === 'agent' &&
              turn.responses.map((response, i) => (
                <ResponseRenderer
                  key={i}
                  response={response}
                  selectedProviderId={selectedProviderId}
                  onSelectProvider={onSelectProvider}
                  onPhotoUpload={onPhotoUpload}
                  onPhotoSkip={onPhotoSkip}
                  onDateSelect={onDateSelect}
                  onChoice={onChoice}
                  index={i}
                />
              ))}
          </div>
        ))}

        {isThinking && <AgentTyping />}
      </div>

      <div className="px-4 md:px-6 py-3 border-t border-cream-200/60 bg-cream-50/60 backdrop-blur-sm">
        <ConversationInput onSend={onSend} />
      </div>
    </div>
  );
}
