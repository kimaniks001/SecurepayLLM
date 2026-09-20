export type ResponseType =
  | 'MESSAGE'
  | 'PROVIDER_CARDS'
  | 'STORE_PRODUCT_CARDS'
  | 'PRICE_CONTEXT'
  | 'COMPARISON'
  | 'PHOTO'
  | 'PHOTO_UPLOAD'
  | 'MAP'
  | 'DATE_PICKER'
  | 'DATE_RANGE_PICKER'
  | 'PERSON_PICKER'
  | 'AMOUNT_INPUT'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_SUMMARY'
  | 'AGREEMENT_PREVIEW'
  | 'COMMUNITY_RESULT'
  | 'ACTION_CONFIRMATION'
  | 'PROVIDER_QUOTE'
  | 'CHOICE_BUTTONS'
  | 'NOTICE'
  | 'IDENTITY_CHECK'
  | 'MONEY_HANDOFF'
  | 'STORE_PROMPT'
  | 'CONTRIBUTION_PLAN'
  | 'PURCHASE_CHECKLIST'
  | 'CHAMA_SETUP'
  | 'GOVERNANCE'
  | 'QUOTE_REVIEW'
  | 'AGREEMENT_RESULT'
  | 'PROVIDER_HISTORY'
  | 'PRODUCT_COMPARISON'
  | 'COMMUNITY_DISCUSSION'
  | 'COMMUNITY_STORY'
  | 'MAP_RESULT'
  | 'LOCATION_PICKER'
  | 'DOCUMENT_LIST'
  | 'NOTIFICATION'
  | 'TRANSITION_CONFIRM'
  | 'SECURE_AUTH'
  | 'CANONICAL_AGREEMENT'
  | 'AGREEMENT_SENT'
  | 'RECIPIENT_REVIEW'
  | 'JOIN_PROMPT'
  | 'JOINED_STATUS'
  | 'ACCEPTANCE_PROMPT'
  | 'CHANGE_REQUEST'
  | 'VERSION_UPDATE'
  | 'AGREEMENT_ESTABLISHED'
  | 'MONEY_READY'
  | 'ERROR_STATE'
  | 'ATTENTION_ITEMS'
  | 'AGREEMENT_LIST'
  | 'AGREEMENT_DETAIL_RESPONSE';

export type Sender = 'user' | 'agent';

export type AgentState = 'resting' | 'listening' | 'thinking' | 'understood' | 'finding' | 'needs_you';

export interface BaseResponse {
  type: ResponseType;
}

export interface MessageResponse extends BaseResponse {
  type: 'MESSAGE';
  text: string;
}

export interface Provider {
  id: string;
  name: string;
  trade: string;
  avatar: string;
  serviceArea: string;
  labourRange: string;
  availability: string;
  completedWork: number;
  repeatCustomers: number;
  capability: string;
  projectThumbs: string[];
  storeUrl: string;
  tags?: string[];
}

export interface StoreProduct {
  id: string;
  title: string;
  seller: string;
  sellerAvatar: string;
  price: string;
  condition: string;
  location: string;
  image: string;
  posted: string;
  verified: boolean;
}

export interface StoreProductCardsResponse extends BaseResponse {
  type: 'STORE_PRODUCT_CARDS';
  heading?: string;
  products: StoreProduct[];
}

export interface ProviderCardsResponse extends BaseResponse {
  type: 'PROVIDER_CARDS';
  heading?: string;
  providers: Provider[];
}

export interface PriceContextResponse extends BaseResponse {
  type: 'PRICE_CONTEXT';
  label: string;
  range: string;
  unit: string;
  sources: string[];
  note: string;
}

export interface ComparisonRow {
  label: string;
  values: (string | boolean)[];
}

export interface ComparisonResponse extends BaseResponse {
  type: 'COMPARISON';
  providers: Provider[];
  rows: ComparisonRow[];
}

export interface PhotoResponse extends BaseResponse {
  type: 'PHOTO';
  url: string;
  caption?: string;
}

export interface PhotoUploadResponse extends BaseResponse {
  type: 'PHOTO_UPLOAD';
  label: string;
  acceptedTypes: string;
  skipLabel?: string;
}

export interface MapResponse extends BaseResponse {
  type: 'MAP';
  label: string;
  area: string;
  markers: { label: string; sublabel: string }[];
}

export interface DatePickerResponse extends BaseResponse {
  type: 'DATE_PICKER';
  label: string;
}

export interface DateRangePickerResponse extends BaseResponse {
  type: 'DATE_RANGE_PICKER';
  label: string;
}

export interface PersonPickerResponse extends BaseResponse {
  type: 'PERSON_PICKER';
  label: string;
  people: { name: string; role: string; ksn: string }[];
}

export interface AmountInputResponse extends BaseResponse {
  type: 'AMOUNT_INPUT';
  label: string;
  currency: string;
  placeholder: string;
}

export interface DocumentUploadResponse extends BaseResponse {
  type: 'DOCUMENT_UPLOAD';
  label: string;
  acceptedTypes: string;
}

export interface DocumentSummaryResponse extends BaseResponse {
  type: 'DOCUMENT_SUMMARY';
  filename: string;
  summary: string;
}

export interface AgreementPreviewResponse extends BaseResponse {
  type: 'AGREEMENT_PREVIEW';
  title: string;
  what: string[];
  who: { name: string; role: string }[];
  money: { amount: string; note: string };
  when: string;
  materials?: string;
  stillToSettle: string[];
}

export interface CommunityResultResponse extends BaseResponse {
  type: 'COMMUNITY_RESULT';
  community: string;
  topic: string;
  excerpt: string;
  replies: number;
}

export interface ActionConfirmationResponse extends BaseResponse {
  type: 'ACTION_CONFIRMATION';
  action: string;
  detail: string;
}

export interface ProviderQuoteResponse extends BaseResponse {
  type: 'PROVIDER_QUOTE';
  providerName: string;
  providerAvatar: string;
  text: string;
  amount: string;
  includes: string[];
  excludes: string[];
  completion: string;
}

export interface ChoiceButtonsResponse extends BaseResponse {
  type: 'CHOICE_BUTTONS';
  choices: { label: string; value: string }[];
}

export interface NoticeResponse extends BaseResponse {
  type: 'NOTICE';
  label: string;
  text: string;
  tone: 'useful' | 'worth_checking' | 'important';
}

export interface IdentityCheckResponse extends BaseResponse {
  type: 'IDENTITY_CHECK';
  name: string;
  ksn: string;
  reason: string;
}

export interface MoneyHandoffResponse extends BaseResponse {
  type: 'MONEY_HANDOFF';
  text: string;
  agreementRef: string;
}

export interface StorePromptResponse extends BaseResponse {
  type: 'STORE_PROMPT';
  text: string;
  materials: string[];
}

export interface ContributionPlanResponse extends BaseResponse {
  type: 'CONTRIBUTION_PLAN';
  title: string;
  categories: { label: string; amount?: string; state: 'set' | 'unset' }[];
  target?: string;
  note?: string;
}

export interface PurchaseChecklistResponse extends BaseResponse {
  type: 'PURCHASE_CHECKLIST';
  title: string;
  items: { label: string; checked: boolean }[];
  note?: string;
}

export interface ChamaSetupResponse extends BaseResponse {
  type: 'CHAMA_SETUP';
  title: string;
  members: number;
  contribution: string;
  frequency: string;
  purpose: string;
  stillToDecide: string[];
}

export interface GovernanceResponse extends BaseResponse {
  type: 'GOVERNANCE';
  title: string;
  majorDecisions: string;
  moneyAuthority: string;
  note?: string;
}

export interface QuoteReviewResponse extends BaseResponse {
  type: 'QUOTE_REVIEW';
  filename: string;
  facts: { label: string; value: string; state: 'clear' | 'needs_clarification' | 'not_stated' }[];
  note?: string;
}

export interface AgreementResultResponse extends BaseResponse {
  type: 'AGREEMENT_RESULT';
  title: string;
  status: string;
  agreed: string;
  period: string;
  keyTerms: string[];
  provenance: string;
}

export interface ProviderHistoryResponse extends BaseResponse {
  type: 'PROVIDER_HISTORY';
  providerName: string;
  providerAvatar: string;
  trade: string;
  completedWork: number;
  repeatCustomers: number;
  relevantWork: string[];
  projectPhotos: string[];
  serviceArea: string;
  provenance: string;
}

export interface ProductComparisonResponse extends BaseResponse {
  type: 'PRODUCT_COMPARISON';
  heading: string;
  products: { name: string; store: string }[];
  rows: ComparisonRow[];
  note?: string;
}

export interface CommunityDiscussionResponse extends BaseResponse {
  type: 'COMMUNITY_DISCUSSION';
  community: string;
  topic: string;
  replies: number;
  themes: string[];
  provenance: string;
}

export interface CommunityStoryResponse extends BaseResponse {
  type: 'COMMUNITY_STORY';
  community: string;
  title: string;
  author: string;
  whatChanged: string[];
  usefulNote: string;
  imageUrl: string;
  provenance: string;
}

export interface MapResultResponse extends BaseResponse {
  type: 'MAP_RESULT';
  label: string;
  area: string;
  pins: { label: string; sublabel: string; color: 'job' | 'provider' | 'store' }[];
  note?: string;
}

export interface LocationPickerResponse extends BaseResponse {
  type: 'LOCATION_PICKER';
  label: string;
  options: string[];
}

export interface DocumentListResponse extends BaseResponse {
  type: 'DOCUMENT_LIST';
  documents: { filename: string; type: string; source: string; date: string; linkedTo?: string }[];
}

export interface NotificationResponse extends BaseResponse {
  type: 'NOTIFICATION';
  text: string;
  source: string;
  time: string;
}

export interface TransitionConfirmResponse extends BaseResponse {
  type: 'TRANSITION_CONFIRM';
  title: string;
  text: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
}

export interface SecureAuthResponse extends BaseResponse {
  type: 'SECURE_AUTH';
  title: string;
  identityName: string;
  identityKsn: string;
  reason: string;
  fields: { label: string; placeholder: string; type: 'text' | 'password' | 'otp' }[];
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
}

export interface CanonicalAgreementResponse extends BaseResponse {
  type: 'CANONICAL_AGREEMENT';
  title: string;
  version: string;
  status: string;
  parties: { name: string; role: string }[];
  work: string[];
  price: string;
  // Final Phase 4 Economy Turn 3 (Section 6) -- provenance/commercial context only, never
  // Agreement/participant/payment authority: the reviewed commercial source (e.g. a Store offer)
  // this handoff is proceeding from, if any.
  source?: {
    /** The backend's own source type, passed through unchanged; absent means unknown, never assumed to be the Store. */
    sourceType?: string | null;
    title: string; ownerKsNumber: string | null; priceLine: string; status: 'CURRENT' | 'CHANGED' | 'UNAVAILABLE'; statusLabel: string;
    /** The backend's own captured/current facts, for the shared SourceReference (Phase 2). Never reconciled in the browser. */
    capturedPriceMinor?: number | null; capturedCurrency?: string | null; capturedAvailability?: string | null;
    current?: { priceMinor: number | null; currency: string | null; availability: string | null } | null;
  };
  materials?: string;
  completion: string;
  defects?: string;
  paymentTiming?: string;
  worthSettling: { label: string; detail: string }[];
  mustSettle: { label: string; detail: string }[];
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  primaryDisabled?: boolean;
  /** One plain line saying what the primary action really does (and does not do). */
  consequence?: string;
}

export interface AgreementSentResponse extends BaseResponse {
  type: 'AGREEMENT_SENT';
  title: string;
  recipientName: string;
  steps: string[];
}

/**
 * Deep-review correction pass: generalized off the old construction/labour-shaped card
 * ("labour"/"materials"/"completion" fields, always shown) so a service, product, contribution,
 * project, or general commercial Agreement can all be represented honestly. `purpose` and
 * `proposedAmount` are optional because the public invitation contract does not always supply
 * them; a caller must never invent a value for either.
 */
export interface RecipientReviewResponse extends BaseResponse {
  type: 'RECIPIENT_REVIEW';
  inviterName: string;
  title: string;
  role: string;
  purpose: string | null;
  proposedAmount: string | null;
  expiry: string;
  /** What the next steps are, in order, so opening the link is understood as committing to nothing. */
  nextSteps?: string[];
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
}

export interface JoinPromptResponse extends BaseResponse {
  type: 'JOIN_PROMPT';
  title: string;
  text: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
}

export interface JoinedStatusResponse extends BaseResponse {
  type: 'JOINED_STATUS';
  title: string;
  text: string;
  status: string;
  /** The separate, still-true statement that nothing has been agreed yet. */
  notAgreed?: string;
}

export interface AcceptancePromptResponse extends BaseResponse {
  type: 'ACCEPTANCE_PROMPT';
  title: string;
  versionNote: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
}

export interface ChangeRequestResponse extends BaseResponse {
  type: 'CHANGE_REQUEST';
  title: string;
  changes: { label: string; from: string; to: string }[];
}

export interface VersionUpdateResponse extends BaseResponse {
  type: 'VERSION_UPDATE';
  title: string;
  version: string;
  note: string;
}

export interface AgreementEstablishedResponse extends BaseResponse {
  type: 'AGREEMENT_ESTABLISHED';
  title: string;
  work: string;
  price: string;
  completion: string;
  materials: string;
  status: string;
}

export interface MoneyReadyResponse extends BaseResponse {
  type: 'MONEY_READY';
  title: string;
  text: string;
  agreementRef: string;
}

export interface ErrorStateResponse extends BaseResponse {
  type: 'ERROR_STATE';
  title: string;
  text: string;
  primaryLabel: string;
  primaryValue: string;
}

export type AgentResponse =
  | MessageResponse
  | ProviderCardsResponse
  | StoreProductCardsResponse
  | PriceContextResponse
  | ComparisonResponse
  | PhotoResponse
  | PhotoUploadResponse
  | MapResponse
  | DatePickerResponse
  | DateRangePickerResponse
  | PersonPickerResponse
  | AmountInputResponse
  | DocumentUploadResponse
  | DocumentSummaryResponse
  | AgreementPreviewResponse
  | CommunityResultResponse
  | ActionConfirmationResponse
  | ProviderQuoteResponse
  | ChoiceButtonsResponse
  | NoticeResponse
  | IdentityCheckResponse
  | MoneyHandoffResponse
  | StorePromptResponse
  | ContributionPlanResponse
  | PurchaseChecklistResponse
  | ChamaSetupResponse
  | GovernanceResponse
  | QuoteReviewResponse
  | AgreementResultResponse
  | ProviderHistoryResponse
  | ProductComparisonResponse
  | CommunityDiscussionResponse
  | CommunityStoryResponse
  | MapResultResponse
  | LocationPickerResponse
  | DocumentListResponse
  | NotificationResponse
  | TransitionConfirmResponse
  | SecureAuthResponse
  | CanonicalAgreementResponse
  | AgreementSentResponse
  | RecipientReviewResponse
  | JoinPromptResponse
  | JoinedStatusResponse
  | AcceptancePromptResponse
  | ChangeRequestResponse
  | VersionUpdateResponse
  | AgreementEstablishedResponse
  | MoneyReadyResponse
  | ErrorStateResponse
  | AttentionItemsResponse
  | AgreementListResponse
  | AgreementDetailResponse;

export interface ConversationTurn {
  id: string;
  sender: Sender;
  responses: AgentResponse[];
}

export type UnderstandingState = 'understood' | 'candidate' | 'unresolved';

export interface UnderstandingField {
  label: string;
  value: string;
  state: UnderstandingState;
}

export interface Understanding {
  job: UnderstandingField;
  scope: UnderstandingField;
  location: UnderstandingField;
  people: UnderstandingField;
  price: UnderstandingField;
  timing: UnderstandingField;
  materials: UnderstandingField;
}

// ─── Pass 6: Signed-in agreement domain ───────────────────

export type AgreementStatus =
  | 'taking_shape'
  | 'ready_for_review'
  | 'waiting_for_me'
  | 'waiting_for_other'
  | 'active'
  | 'change_requested'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type AttentionKind =
  | 'agreement_changed'
  | 'waiting_confirmation'
  | 'document_review'
  | 'dispute_scope_confirmation'
  | 'dispute_position_needed'
  | 'dispute_match_proposed'
  | 'dispute_master_appointment'
  | 'dispute_master_opinion'
  /**
   * Real `/api/v1/me/actions` next-action codes (e.g. FUND_AGREEMENT, SUBMIT_EVIDENCE,
   * START_OBLIGATION) have no honest one-to-one mapping onto the fixture kinds above, several of
   * which are dispute-specific concepts this Golden Spine slice does not read. Every real action
   * renders under this one generic kind instead of being force-fit into a misleading specific kind;
   * the real `reason`/`category` text (backend-owned) carries the actual detail.
   */
  | 'agreement_action';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  detail: string;
  actionLabel: string;
  actionValue: string;
  agreementId: string;
}

export interface WaitingItem {
  id: string;
  title: string;
  detail: string;
  statusText: string;
  agreementId: string;
}

export interface ActivityEntry {
  id: string;
  text: string;
  time: string;
  agreementId?: string;
}

// Final Phase 3 correction (Section 9) -- Agreements Home real data, from
// GET /api/v1/me/agreements/home.
export interface ProblemItem {
  id: string;
  title: string;
  detail: string;
  stateLabel: string;
  agreementId: string;
}

export interface MoneyByCurrencyItem {
  currency: string;
  remainingFundedLabel: string;
  positionCount: number;
}

export interface AgreementPerson {
  name: string;
  role: string;
  confirmationStatus: 'confirmed_current' | 'joined_not_confirmed' | 'not_joined' | 'set_version';
  /**
   * Real-mode only: the plain-words fact SecurePay's participant + confirmation reads establish, and its kind.
   * When present it is shown INSTEAD of the fixture `confirmationStatus` label. `unknown` means a read failed --
   * it is never rendered as "not confirmed".
   */
  statusText?: string;
  statusKind?: 'current' | 'needs' | 'waiting' | 'unknown' | 'neutral';
}

export interface AgreementDocument {
  id: string;
  filename: string;
  type: string;
  source: string;
  date: string;
}

export interface AgreementChangeEntry {
  from: string;
  to: string;
  field: string;
  requestedBy: string;
  reason: string;
  status: 'accepted' | 'pending' | 'rejected';
  date: string;
}

export interface AgreementVersion {
  version: string;
  confirmedBy: string[];
  isCurrent: boolean;
}

export interface AgreementSummary {
  id: string;
  title: string;
  counterparty: string;
  counterpartyRole: string;
  amount: string;
  completion: string;
  status: AgreementStatus;
  statusLabel: string;
  nextAction: string;
  lastActivity: string;
  lastActivityTime: string;
  version: string;
  location?: string;
}

export interface AgreementDetail {
  id: string;
  title: string;
  status: AgreementStatus;
  statusLabel: string;
  version: string;
  people: AgreementPerson[];
  work: string[];
  price: string;
  materials: string;
  completion: string;
  conditions: string[];
  documents: AgreementDocument[];
  activity: { date: string; text: string }[];
  changes: AgreementChangeEntry[];
  versions: AgreementVersion[];
  amount: string;
  cancelledReason?: string;
  cancelledBy?: string;
  cancelledDate?: string;
  expiredReason?: string;
  completedDate?: string;
}

export interface AttentionItemsResponse extends BaseResponse {
  type: 'ATTENTION_ITEMS';
  items: AttentionItem[];
  waitingItems: WaitingItem[];
  recentActivity: ActivityEntry[];
}

export interface AgreementListResponse extends BaseResponse {
  type: 'AGREEMENT_LIST';
  agreements: AgreementSummary[];
}

export interface AgreementDetailResponse extends BaseResponse {
  type: 'AGREEMENT_DETAIL_RESPONSE';
  detail: AgreementDetail;
}

export type AppView = 'signed-out' | 'signed-in' | 'conversation' | 'agreements' | 'agreement-detail' | 'dispute' | 'agreement-builder' | 'money' | 'store' | 'community' | 'circle' | 'ecosystem' | 'projects' | 'vision-board' | 'account' | 'settings' | 'recovery' | 'business' | 'developer' | 'notifications' | 'support';

// ─── Pass 7B: Milestones, Obligations, Actions ───────────────────

export type MilestoneStatus = 'not_started' | 'in_progress' | 'ready_for_review' | 'complete' | 'blocked' | 'overdue' | 'cancelled';

export type CompletionSource =
  | 'self_declared'
  | 'counterparty_confirmation'
  | 'evidence_review'
  | 'inspection'
  | 'agreed_condition';

export type ActionStatus = 'upcoming' | 'needs_you' | 'waiting_on_other' | 'done' | 'overdue' | 'cancelled' | 'superseded';

export type ActionType =
  | 'provide_materials'
  | 'upload_evidence'
  | 'review_evidence'
  | 'inspect_work'
  | 'confirm_completion'
  | 'respond_to_change'
  | 'review_current_version'
  | 'provide_document'
  | 'meet_deadline'
  | 'attend_inspection'
  | 'respond_to_dispute_scope'
  | 'state_dispute_position'
  | 'review_master_opinion'
  | 'contribute_funds'
  | 'confirm_contribution'
  | 'meet_in_person';

export interface Obligation {
  id: string;
  responsibleParty: string;
  action: string;
  dueDate?: string;
  condition?: string;
  evidenceRequired?: string;
  status: ActionStatus;
  dependencyId?: string;
  completionSource?: CompletionSource;
}

export interface Milestone {
  id: string;
  title: string;
  status: MilestoneStatus;
  responsible?: string;
  work: string[];
  obligations: Obligation[];
  value?: string;
  target?: string;
  completionCondition?: string;
  evidenceRequired?: string[];
  dependencyIds?: string[];
  /**
   * Phase 3 Living Agreements: the exact, backend-preserved reason this milestone is WAITING on an
   * explicitly declared dependency (never inferred from sequenceOrder). Present only when status is
   * 'blocked' for that reason.
   */
  waitingReason?: string;
  inspectionRequired?: boolean;
  defectRule?: string;
  customerObligation?: string;
  materialsDue?: string;
  completionSource?: CompletionSource;
}

export interface AgreementAction {
  id: string;
  type: ActionType;
  label: string;
  responsible: string;
  due?: string;
  agreementId: string;
  agreementTitle: string;
  milestoneId?: string;
  milestoneTitle?: string;
  status: ActionStatus;
  supersededBy?: string;
  provenance?: string;
}

export interface ReminderRule {
  id: string;
  who: string;
  about: string;
  timing: string;
  channels: ('securepay' | 'whatsapp')[];
  actionId?: string;
  createdBy?: string;
}

export interface WhatsAppPreview {
  id: string;
  heading: string;
  body: string;
  actionText: string;
  actionUrl: string;
  isSystemNotice: boolean;
}

export interface AgreementStructure {
  agreementId: string;
  rootMilestone: Milestone;
  milestones: Milestone[];
  actions: AgreementAction[];
  reminders: ReminderRule[];
  totalValue: string;
  allocatedValue: string;
  unallocatedValue: string;
  isSimple: boolean;
}

// ─── Pass 7: Dispute resolution ───────────────────────────

export type DisputeStep =
  | 'issue_raised'
  | 'isolating_scope'
  | 'scope_confirmed'
  | 'counterparty_reviews_scope'
  | 'agreement_code'
  | 'evidence'
  | 'positions'
  | 'matching'
  | 'match_reached'
  | 'master_available'
  | 'master_cost'
  | 'master_appointment'
  | 'master_review'
  | 'master_opinion'
  | 'opinion_matching'
  | 'resolved'
  | 'unresolved';

export type DisputeCategory =
  | 'workmanship'
  | 'goods_quality'
  | 'vehicle'
  | 'payment'
  | 'scope'
  | 'other';

export interface DisputeScope {
  agreementId: string;
  agreementTitle: string;
  agreementVersion: string;
  disputedObligation: string;
  disputedArea: string;
  relatedTerm: string;
  disputedAmount: string;
  notInDispute: string[];
}

export interface DisputeEvidence {
  id: string;
  filename: string;
  type: string;
  source: string;
  date: string;
  linkedComponent: string;
}

export interface DisputePosition {
  party: string;
  monetaryAmount?: string;
  positionText: string;
}

export interface DisputeMatch {
  agreedPoints: string[];
  disagreedPoints: { label: string; james: string; peter: string }[];
}

export interface DisputeMaster {
  id: string;
  name: string;
  title: string;
  expertise: string;
  serviceArea: string;
  availability: string;
  cost: string;
  provenance: string;
}

export interface DisputeDetail {
  id: string;
  agreementId: string;
  agreementTitle: string;
  agreementVersion: string;
  step: DisputeStep;
  category: DisputeCategory;
  scope: DisputeScope;
  proposerStatement: string;
  counterpartyStatement?: string;
  evidence: DisputeEvidence[];
  positions: DisputePosition[];
  match?: DisputeMatch;
  masters?: DisputeMaster[];
  selectedMaster?: DisputeMaster;
  masterOpinion?: string;
  masterRecommendation?: string;
  resolution?: string;
  totalAgreementValue: string;
  disputedAmount: string;
  notDisputedAmount: string;
  siteInspection?: { date: string; location: string; cost: string };
  masterCost?: string;
  masterAppointmentStatus?: { james: 'agreed' | 'waiting'; peter: 'agreed' | 'waiting' };
}

// ─── Pass 8: Money authority ───────────────────────────

export type MoneyState =
  | 'not_ready'
  | 'ready'
  | 'method_selected'
  | 'payment_initiated'
  | 'pending_confirmation'
  | 'confirmed'
  | 'failed'
  | 'unknown'
  | 'unavailable'
  | 'stale'
  | 'no_money_activity';

export type PaymentReadinessStatus =
  | 'NO_EVALUATION_YET'
  | 'READY'
  | 'NOT_READY'
  | 'PARTIALLY_READY'
  | 'BLOCKED';

export type ParticipantNextAction =
  | 'FUND_AGREEMENT'
  | 'CHOOSE_METHOD'
  | 'CHECK_STATUS'
  | 'REVIEW_PAYMENT'
  | 'REFRESH'
  | 'TRY_AGAIN'
  | 'CHOOSE_ANOTHER'
  | 'VIEW_AGREEMENT'
  | 'none';

export type PaymentRail = 'mpesa_stk' | 'pesalink' | 'partner_bank' | 'other';

export type MoneyCapacity = 'personal' | 'business';

export interface RailOption {
  id: PaymentRail;
  label: string;
  description: string;
  available: boolean;
  demoOnly?: boolean;
  comingLater?: boolean;
  feeNote?: string;
}

export interface FeeBreakdown {
  agreementAmount: string;
  securePayFee?: string;
  railFee?: string;
  total: string;
  feePending?: boolean;
}

export interface MoneyActivityItem {
  id: string;
  date: string;
  text: string;
  amount?: string;
  rail?: string;
  reference?: string;
  statusLabel: string;
}

export interface MoneyAgreementLink {
  agreementId: string;
  agreementTitle: string;
  agreementVersion: string;
  amount: string;
  milestoneId?: string;
  milestoneTitle?: string;
  obligationId?: string;
}

export interface MoneyDetail {
  id: string;
  state: MoneyState;
  stateLabel: string;
  agreementLink: MoneyAgreementLink;
  amount: string;
  currency: string;
  paymentReadiness: PaymentReadinessStatus;
  outstandingReasons?: string[];
  moneyRecordCount?: number;
  nextActions: ParticipantNextAction[];
  availableRails: RailOption[];
  selectedRail?: RailOption;
  feeBreakdown?: FeeBreakdown;
  activity: MoneyActivityItem[];
  capacity: MoneyCapacity;
  capacityLabel: string;
  counterpartyName?: string;
  counterpartyReady?: boolean;
  attemptInProgress?: boolean;
  attemptReference?: string;
  isDemoState: boolean;
  staleNotice?: string;
  errorMessage?: string;
  groupParticipants?: { name: string; amount: string; agreementActionStatus: string; moneyStatus: string }[];
  disputeLinked?: boolean;
  disputeAmount?: string;
}

// ─── Pass 9: Store, Offers & SecureLinks ───────────────────

export type PriceType = 'fixed' | 'from' | 'range' | 'quote_required' | 'unit_price' | 'unlisted';
export type OfferLifecycle = 'draft' | 'published' | 'unavailable' | 'archived';
export type OfferType = 'product' | 'service' | 'package' | 'professional_service' | 'digital' | 'construction' | 'recurring' | 'customizable';

export interface StoreIdentity {
  id: string;
  name: string;
  operator: string;
  businessIdentity: string;
  serviceAreas: string[];
  verified: boolean;
  avatar?: string;
  description?: string;
}

export interface OfferMedia {
  id: string;
  url: string;
  caption: string;
  isExample: boolean;
}

export interface OfferScope {
  included: string[];
  excluded: string[];
}

export interface OfferMilestoneSeed {
  title: string;
  work: string[];
  value?: string;
  target?: string;
  completionCondition?: string;
}

export interface OfferObligationSeed {
  responsibleParty: string;
  action: string;
  condition?: string;
}

export type SecureLinkType = 'offer' | 'agreement_invitation';

export interface SecureLink {
  id: string;
  url: string;
  label: string;
  linkType: SecureLinkType;
  qrAvailable: boolean;
  whatsappShareAvailable: boolean;
  embedAvailable: boolean;
}

export interface OfferTradeSnapshot {
  offerId: string;
  offerVersion: string;
  sellerOfRecord: string;
  sellerOfRecordIdentity: string;
  storeId: string;
  storeName: string;
  displaySource: string;
  adoptedFacts: { label: string; value: string }[];
  provenanceLabel: string;
  isExternalReference: boolean;
  externalSellerName?: string;
  timestamp: string;
}

export interface StoreOffer {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  description: string;
  offerType: OfferType;
  priceType: PriceType;
  price: string;
  priceUnit?: string;
  currency: string;
  scope: OfferScope;
  media: OfferMedia[];
  serviceArea: string;
  availability: string;
  timing?: string;
  conditions: string[];
  documents: string[];
  warrantyTerms?: string;
  milestoneSeeds: OfferMilestoneSeed[];
  obligationSeeds: OfferObligationSeed[];
  customizationAllowed: boolean;
  secureLink: SecureLink;
  lifecycle: OfferLifecycle;
  version: string;
  isExternalReference: boolean;
  externalSellerName?: string;
  externalSellerIdentity?: string;
  provenanceLabel?: string;
  isDemoState: boolean;
}

export interface StoreActivityItem {
  id: string;
  date: string;
  text: string;
  kind: 'link_open' | 'trade_started' | 'enquiry' | 'offer_updated' | 'publish';
}

export interface StoreEnquiry {
  id: string;
  question: string;
  asker: string;
  date: string;
  answered: boolean;
  answer?: string;
}

// ─── Pass 10A: Community ───────────────────────────

export type CommunityObjectType =
  | 'question'
  | 'need'
  | 'opportunity'
  | 'work_story'
  | 'discussion'
  | 'experience'
  | 'store_offer_reference';

export type CommunityObjectStatus = 'active' | 'fulfilled' | 'withdrawn' | 'closed' | 'expired';

export type ActingCapacity = 'personal' | 'business';

export interface CommunityResponse {
  id: string;
  author: string;
  authorCapacity: ActingCapacity;
  text: string;
  date: string;
  kind: 'reply' | 'i_can_help' | 'follow_up' | 'share_experience';
}

export interface CommunityObject {
  id: string;
  objectType: CommunityObjectType;
  author: string;
  authorCapacity: ActingCapacity;
  createdAt: string;
  title: string;
  body: string;
  generalLocation?: string;
  capabilities?: string[];
  status: CommunityObjectStatus;
  responses: CommunityResponse[];
  relatedStoreId?: string;
  relatedOfferId?: string;
  relatedPersonIds?: string[];
  relatedBusinessIds?: string[];
  provenance: string;
  visibility: 'public' | 'connections';
  mediaCaption?: string;
  category?: string;
  budget?: string;
  timing?: string;
}

export interface CommunityPerson {
  id: string;
  name: string;
  capacity: ActingCapacity;
  capabilities: string[];
  selfDescribed: boolean;
  verifiedQualification: boolean;
  serviceArea?: string;
  businessAssociation?: string;
  publicWorkStories: number;
  communityContributions: number;
}

export interface CommunityBusiness {
  id: string;
  name: string;
  whatTheyDo: string;
  serviceAreas: string[];
  storeId?: string;
  publicWorkStories: number;
  communityContributions: number;
}

// ─── Pass 10B: Universal Source Reference ───────────────────

export type SourceType =
  | 'store_offer'
  | 'community_need'
  | 'community_opportunity'
  | 'community_question'
  | 'community_discussion'
  | 'work_story'
  | 'person'
  | 'business'
  | 'circle_activity'
  | 'circle_member'
  | 'previous_agreement'
  | 'circle_opportunity'
  | 'circle_need'
  | 'referral'
  | 'plug_introduction'
  | 'master_profile'
  | 'master_opinion'
  | 'partner'
  | 'solution';

export interface SourceFact {
  label: string;
  value: string;
  provenance: string;
  isAdopted: boolean;
}

export interface SourceReference {
  sourceReferenceId: string;
  sourceType: SourceType;
  sourceId: string;
  sourceVersion?: string;
  sourceOwnerIdentity?: string;
  sourceActingCapacity?: ActingCapacity;
  sourceStoreId?: string;
  sourceOfferId?: string;
  sourceCommunityObjectId?: string;
  sourceCircleId?: string;
  sourceAgreementId?: string;
  sourcePersonId?: string;
  sourceBusinessId?: string;
  sourceIntroducerIdentity?: string;
  sourceReferrerIdentity?: string;
  selectedCounterpartyIdentity?: string;
  sourceSnapshot: { label: string; value: string }[];
  sourceProvenance: string;
  sourceTimestamp: string;
  adoptedCandidateFacts: SourceFact[];
  referencedButNotAdoptedFacts?: SourceFact[];
  sourceStatus: string;
  sourceChanged: boolean;
}

// ─── Pass 10B: Introduction / Referral provenance ───────────────────

export type RelationshipType =
  | 'introduced'
  | 'shared_opportunity'
  | 'shared_offer'
  | 'passed_work'
  | 'referred'
  | 'recommended_capability';

export type RewardEvaluationStatus = 'NOT_EVALUATED';

export interface IntroductionRecord {
  introductionId: string;
  introducedByIdentity: string;
  introducedPartyIdentity: string;
  recipientIdentity?: string;
  sourceReferenceId: string;
  circleId?: string;
  communityObjectId?: string;
  storeOfferId?: string;
  relationshipType: RelationshipType;
  introducedAt: string;
  selectedAt?: string;
  resultingTradeId?: string;
  resultingAgreementId?: string;
  attributionStatus: 'recorded' | 'selected' | 'trade_started' | 'agreement_originated';
  referralCandidate: boolean;
  rewardEvaluationStatus: RewardEvaluationStatus;
}

// ─── Pass 10B: Circles ───────────────────────────

export type MembershipMode = 'open' | 'request_to_join' | 'invite_only';
export type MembershipStatus = 'invited' | 'requested' | 'active' | 'left' | 'removed' | 'suspended';

export interface CircleMember {
  personId: string;
  name: string;
  actingCapacity: ActingCapacity;
  membershipStatus: MembershipStatus;
  memberSince: string;
  capabilities: string[];
  businessAssociation?: string;
  growthContributions: number;
}

export type EconomicActivityType =
  | 'external_opportunity_introduced'
  | 'need_shared'
  | 'opportunity_shared'
  | 'help_offered'
  | 'introduction_made'
  | 'work_passed'
  | 'source_used_for_trade'
  | 'trade_started'
  | 'agreement_originated'
  | 'repeat_work'
  | 'store_offer_used'
  | 'work_story_used'
  | 'growth_contribution_recorded';

export interface CircleEconomicActivity {
  id: string;
  type: EconomicActivityType;
  actor: string;
  description: string;
  date: string;
  sourceReference?: string;
  relatedCommunityObjectId?: string;
  relatedOfferId?: string;
  introducerIdentity?: string;
  selectedCounterparty?: string;
}

export interface Circle {
  id: string;
  name: string;
  purpose: string;
  description: string;
  category: string;
  location: string;
  visibility: 'public' | 'connections';
  membershipMode: MembershipMode;
  organizer: string;
  members: CircleMember[];
  rules: string[];
  economicActivity: CircleEconomicActivity[];
  createdAt: string;
  isDemoState: boolean;
}

// ─── Pass 11: Trade Support Ecosystem ───────────────────

export type CandidateStatus = 'recorded' | 'candidate' | 'qualified' | 'not_qualified' | 'insufficient_evidence';
export type QualificationStatus = 'not_evaluated' | 'qualified' | 'not_qualified' | 'insufficient_evidence';
export type RewardStatus = 'not_eligible' | 'eligible_pending' | 'earned' | 'paid';

export interface ReferralEvaluation {
  referralId: string;
  introductionId: string;
  candidateStatus: CandidateStatus;
  qualificationStatus: QualificationStatus;
  reasonCodes?: string[];
  evaluatedAt?: string;
  rewardStatus: RewardStatus;
  rewardReference?: string;
}

export interface PlugProfile {
  id: string;
  identity: string;
  serviceArea: string;
  connectionDomains: string[];
  availability: string;
  publicProvenance: string;
  status: 'active' | 'inactive';
  businessAssociation?: string;
  language?: string;
}

export interface MasterProfile {
  id: string;
  identity: string;
  expertise: string[];
  qualificationRefs: string[];
  accreditationRefs: string[];
  serviceArea: string;
  availability: string;
  pricingBasis: string;
  inspectionCapability: boolean;
  status: 'active' | 'inactive';
}

export type AppointmentStatus = 'not_appointed' | 'proposed' | 'appointed' | 'opinion_delivered' | 'completed';

export interface MasterRequest {
  requestId: string;
  sourceReference?: SourceReference;
  agreementReference?: string;
  question: string;
  scope: string;
  evidenceRefs: string[];
  siteVisitRequirement: boolean;
  cost: string;
  appointmentStatus: AppointmentStatus;
  opinionReference?: string;
}

export interface MasterOpinion {
  opinionId: string;
  masterIdentity: string;
  scope: string;
  sourceAgreementVersion?: string;
  question: string;
  observations: string[];
  opinion: string;
  limitations: string[];
  createdAt: string;
  provenance: string;
}

export type PartnerType = 'bank' | 'sacco' | 'insurer' | 'inspection_firm' | 'valuation_firm' | 'laboratory' | 'legal_provider' | 'logistics_provider' | 'identity_provider' | 'other';

export interface PartnerProfile {
  partnerId: string;
  identity: string;
  partnerType: PartnerType;
  institutionalStatus: string;
  accreditationRefs: string[];
  serviceAreas: string[];
  solutions: string[];
  storeId?: string;
  contactPath?: string;
}

export type SolutionType = 'fund' | 'insure' | 'verify' | 'inspect' | 'value' | 'guarantee' | 'deliver' | 'legal_support' | 'identity_compliance' | 'lab_testing' | 'other_professional';

export type SolutionPricingType = 'fixed' | 'from' | 'quote_required' | 'unit_price';

export interface Solution {
  solutionId: string;
  partnerId: string;
  partnerName: string;
  solutionType: SolutionType;
  title: string;
  description: string;
  requirements: string[];
  pricingType: SolutionPricingType;
  price?: string;
  serviceArea: string;
  timing: string;
  status: 'available' | 'unavailable' | 'quote_required';
  provenance: string;
  whatItCanEstablish: string;
  whatItCannotEstablish: string;
}
