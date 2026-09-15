import type { Circle, CircleMember, CircleEconomicActivity, IntroductionRecord, SourceReference } from './types';
import { demoCommunityObjects } from './communityData';
import { demoOffers } from './storeData';

// ─── Circle members ───────────────────

const constructionMembers: CircleMember[] = [
  {
    personId: 'person-peter',
    name: 'Peter Mwangi',
    actingCapacity: 'personal',
    membershipStatus: 'active',
    memberSince: 'Jan 2026',
    capabilities: ['plumbing', 'tiling', 'general renovation', 'painting'],
    businessAssociation: 'Nairobi Painters Co.',
    growthContributions: 5,
  },
  {
    personId: 'person-james',
    name: 'James Kimani',
    actingCapacity: 'personal',
    membershipStatus: 'active',
    memberSince: 'Jan 2026',
    capabilities: ['project coordination'],
    growthContributions: 3,
  },
  {
    personId: 'person-grace',
    name: 'Grace Wanjiku',
    actingCapacity: 'personal',
    membershipStatus: 'active',
    memberSince: 'Feb 2026',
    capabilities: ['electrical installation', 'solar'],
    growthContributions: 2,
  },
];

// ─── Economic activity ───────────────────

const constructionActivity: CircleEconomicActivity[] = [
  {
    id: 'ea-1',
    type: 'external_opportunity_introduced',
    actor: 'James Kimani',
    description: 'Introduced external renovation project requiring electrical, plumbing, and painting',
    date: '2 days ago',
    sourceReference: 'External project — residential renovation in Westlands',
  },
  {
    id: 'ea-2',
    type: 'need_shared',
    actor: 'James Kimani',
    description: 'Need: electrician to replace distribution board in Westlands',
    date: '2 days ago',
    relatedCommunityObjectId: 'co-need-2',
  },
  {
    id: 'ea-3',
    type: 'help_offered',
    actor: 'Grace Wanjiku',
    description: 'Offered help on electrical distribution board replacement',
    date: '1 day ago',
  },
  {
    id: 'ea-4',
    type: 'introduction_made',
    actor: 'Peter Mwangi',
    description: 'Introduced Jane (plumber) to James for tank repair work',
    date: '3 hours ago',
    introducerIdentity: 'Peter Mwangi',
    selectedCounterparty: 'Jane (plumber)',
  },
  {
    id: 'ea-5',
    type: 'work_passed',
    actor: 'Peter Mwangi',
    description: 'Passed plumbing enquiry to Jane — Peter does not do plumbing',
    date: '3 hours ago',
    introducerIdentity: 'Peter Mwangi',
  },
  {
    id: 'ea-6',
    type: 'store_offer_used',
    actor: 'Peter Mwangi',
    description: 'Shared Keyman Security CCTV Offer with James',
    date: '1 day ago',
    relatedOfferId: 'offer-cctv',
    introducerIdentity: 'Peter Mwangi',
  },
  {
    id: 'ea-7',
    type: 'trade_started',
    actor: 'Peter Mwangi',
    description: 'Trade started from Construction Circle painting opportunity',
    date: '5 hours ago',
    relatedCommunityObjectId: 'co-opp-1',
  },
  {
    id: 'ea-8',
    type: 'repeat_work',
    actor: 'James Kimani',
    description: 'James and Peter have worked together on 2 previous agreements',
    date: '1 week ago',
  },
];

// ─── Demo circles ───────────────────

export const demoCircles: Circle[] = [
  {
    id: 'circle-construction',
    name: 'Construction Circle',
    purpose: 'Help construction professionals and businesses discover work, share capability, pass opportunities and build trusted working relationships.',
    description: 'A trusted network for construction trade professionals in Nairobi. Share opportunities, find collaborators, pass work you cannot do, and build repeat relationships.',
    category: 'Construction',
    location: 'Nairobi',
    visibility: 'public',
    membershipMode: 'request_to_join',
    organizer: 'James Kimani',
    members: constructionMembers,
    rules: [
      'Share genuine opportunities.',
      'Do not misrepresent capability.',
      'Respect member privacy.',
      'Be clear when you are offering work.',
      'Do not misuse member information.',
    ],
    economicActivity: constructionActivity,
    createdAt: 'Jan 2026',
    isDemoState: true,
  },
  {
    id: 'circle-varsityville',
    name: 'Varsityville Business Circle',
    purpose: 'Connect businesses serving the Varsityville community for mutual support and local opportunity sharing.',
    description: 'A network of businesses operating in and around Varsityville. Share local opportunities, recommend trusted providers, and support each other.',
    category: 'Business network',
    location: 'Varsityville, Nairobi',
    visibility: 'connections',
    membershipMode: 'invite_only',
    organizer: 'Keyman Security',
    members: [
      {
        personId: 'person-peter',
        name: 'Peter Mwangi',
        actingCapacity: 'business',
        membershipStatus: 'active',
        memberSince: 'Feb 2026',
        capabilities: ['painting', 'renovation'],
        businessAssociation: 'Nairobi Painters Co.',
        growthContributions: 1,
      },
    ],
    rules: [
      'Share genuine local opportunities.',
      'Respect member privacy.',
    ],
    economicActivity: [],
    createdAt: 'Feb 2026',
    isDemoState: true,
  },
  {
    id: 'circle-creative',
    name: 'Creative Professionals',
    purpose: 'Connect creative professionals — photographers, designers, developers — for collaboration and opportunity sharing.',
    description: 'A network for creative professionals to find collaborators, share work opportunities, and build trusted working relationships.',
    category: 'Creative',
    location: 'Nairobi',
    visibility: 'public',
    membershipMode: 'open',
    organizer: 'Grace Wanjiku',
    members: [
      {
        personId: 'person-grace',
        name: 'Grace Wanjiku',
        actingCapacity: 'personal',
        membershipStatus: 'active',
        memberSince: 'Mar 2026',
        capabilities: ['photography', 'design'],
        growthContributions: 0,
      },
    ],
    rules: ['Share genuine opportunities.', 'Respect member privacy.'],
    economicActivity: [],
    createdAt: 'Mar 2026',
    isDemoState: true,
  },
];

// ─── Introduction records ───────────────────

export const demoIntroductions: IntroductionRecord[] = [
  {
    introductionId: 'intro-1',
    introducedByIdentity: 'Peter Mwangi',
    introducedPartyIdentity: 'Jane (plumber)',
    recipientIdentity: 'James Kimani',
    sourceReferenceId: 'src-need-1',
    circleId: 'circle-construction',
    communityObjectId: 'co-need-1',
    relationshipType: 'introduced',
    introducedAt: '3 hours ago',
    selectedAt: '2 hours ago',
    attributionStatus: 'trade_started',
    referralCandidate: true,
    rewardEvaluationStatus: 'NOT_EVALUATED',
  },
  {
    introductionId: 'intro-2',
    introducedByIdentity: 'Peter Mwangi',
    introducedPartyIdentity: 'Keyman Security',
    recipientIdentity: 'James Kimani',
    sourceReferenceId: 'src-offer-cctv',
    circleId: 'circle-construction',
    storeOfferId: 'offer-cctv',
    relationshipType: 'shared_offer',
    introducedAt: '1 day ago',
    attributionStatus: 'recorded',
    referralCandidate: true,
    rewardEvaluationStatus: 'NOT_EVALUATED',
  },
];

// ─── Source reference builders ───────────────────

export function createSourceFromOffer(offerId: string, introducerIdentity?: string): SourceReference {
  const offer = demoOffers.find((o) => o.id === offerId);
  if (!offer) throw new Error('Offer not found');
  const sellerOfRecord = offer.isExternalReference && offer.externalSellerName ? offer.externalSellerName : offer.storeName;
  return {
    sourceReferenceId: `src-offer-${offerId}`,
    sourceType: 'store_offer',
    sourceId: offer.id,
    sourceVersion: offer.version,
    sourceOwnerIdentity: sellerOfRecord,
    sourceActingCapacity: 'business',
    sourceStoreId: offer.storeId,
    sourceOfferId: offer.id,
    sourceIntroducerIdentity: introducerIdentity,
    selectedCounterpartyIdentity: sellerOfRecord,
    sourceSnapshot: [
      { label: 'Title', value: offer.title },
      { label: 'Price', value: offer.price },
      { label: 'Store', value: offer.storeName },
      { label: 'Version', value: offer.version },
    ],
    sourceProvenance: `Started from ${offer.storeName} Store offer${introducerIdentity ? ` — shared by ${introducerIdentity}` : ''}`,
    sourceTimestamp: new Date().toISOString(),
    adoptedCandidateFacts: [
      { label: 'Title', value: offer.title, provenance: `From ${offer.storeName} Store Offer ${offer.version}`, isAdopted: true },
      { label: 'Price', value: offer.price, provenance: `From Store Offer ${offer.version} — not yet agreed`, isAdopted: true },
      ...(offer.scope.included.length > 0 ? [{ label: 'Included', value: offer.scope.included.join(', '), provenance: `From Store Offer ${offer.version}`, isAdopted: true }] : []),
      ...(offer.serviceArea ? [{ label: 'Service area', value: offer.serviceArea, provenance: `From Store Offer ${offer.version}`, isAdopted: true }] : []),
      ...(offer.timing ? [{ label: 'Timing', value: offer.timing, provenance: `From Store Offer ${offer.version}`, isAdopted: true }] : []),
    ],
    sourceStatus: offer.lifecycle,
    sourceChanged: false,
  };
}

export function createSourceFromCommunityObject(communityObjectId: string, circleId?: string, introducerIdentity?: string): SourceReference {
  const obj = demoCommunityObjects.find((o) => o.id === communityObjectId);
  if (!obj) throw new Error('Community object not found');
  const sourceType = obj.objectType === 'need' ? 'community_need' : obj.objectType === 'opportunity' ? 'community_opportunity' : obj.objectType === 'question' ? 'community_question' : obj.objectType === 'discussion' ? 'community_discussion' : obj.objectType === 'work_story' ? 'work_story' : 'community_need';
  return {
    sourceReferenceId: `src-co-${communityObjectId}`,
    sourceType,
    sourceId: obj.id,
    sourceOwnerIdentity: obj.author,
    sourceActingCapacity: obj.authorCapacity,
    sourceCommunityObjectId: obj.id,
    sourceCircleId: circleId,
    sourceIntroducerIdentity: introducerIdentity,
    sourceSnapshot: [
      { label: 'Title', value: obj.title },
      { label: 'Type', value: obj.objectType.replace(/_/g, ' ') },
      ...(obj.generalLocation ? [{ label: 'Location', value: obj.generalLocation }] : []),
      ...(obj.budget ? [{ label: 'Budget context', value: obj.budget }] : []),
      ...(obj.timing ? [{ label: 'Timing', value: obj.timing }] : []),
    ],
    sourceProvenance: `Started from ${obj.objectType.replace(/_/g, ' ')}${circleId ? ' in Construction Circle' : ''}${introducerIdentity ? ` — introduced by ${introducerIdentity}` : ''}`,
    sourceTimestamp: new Date().toISOString(),
    adoptedCandidateFacts: [
      { label: 'Title', value: obj.title, provenance: `From Community ${obj.objectType.replace(/_/g, ' ')}`, isAdopted: true },
      ...(obj.generalLocation ? [{ label: 'Location', value: obj.generalLocation, provenance: `From Community ${obj.objectType.replace(/_/g, ' ')}`, isAdopted: true }] : []),
      ...(obj.timing ? [{ label: 'Timing', value: obj.timing, provenance: `From Community ${obj.objectType.replace(/_/g, ' ')}`, isAdopted: true }] : []),
      ...(obj.budget ? [{ label: 'Budget context', value: obj.budget, provenance: `From Community ${obj.objectType.replace(/_/g, ' ')} — not yet agreed`, isAdopted: true }] : []),
    ],
    sourceStatus: obj.status,
    sourceChanged: false,
  };
}

export function createSourceFromPerson(personId: string, personName: string): SourceReference {
  return {
    sourceReferenceId: `src-person-${personId}`,
    sourceType: 'person',
    sourceId: personId,
    sourcePersonId: personId,
    sourceOwnerIdentity: personName,
    selectedCounterpartyIdentity: personName,
    sourceSnapshot: [
      { label: 'Person', value: personName },
    ],
    sourceProvenance: `Started from ${personName}'s profile — selected as potential counterparty`,
    sourceTimestamp: new Date().toISOString(),
    adoptedCandidateFacts: [
      { label: 'Selected counterparty', value: personName, provenance: 'From person profile selection', isAdopted: true },
    ],
    sourceStatus: 'active',
    sourceChanged: false,
  };
}

export function createSourceFromWorkStory(communityObjectId: string): SourceReference {
  const obj = demoCommunityObjects.find((o) => o.id === communityObjectId);
  if (!obj) throw new Error('Work story not found');
  return {
    sourceReferenceId: `src-story-${communityObjectId}`,
    sourceType: 'work_story',
    sourceId: obj.id,
    sourceCommunityObjectId: obj.id,
    sourceSnapshot: [
      { label: 'Title', value: obj.title },
      ...(obj.generalLocation ? [{ label: 'Location', value: obj.generalLocation }] : []),
    ],
    sourceProvenance: `Started from Work Story — does not clone old agreement`,
    sourceTimestamp: new Date().toISOString(),
    adoptedCandidateFacts: [
      { label: 'Work type', value: obj.title, provenance: 'From Work Story — public facts only', isAdopted: true },
      ...(obj.generalLocation ? [{ label: 'General location', value: obj.generalLocation, provenance: 'From Work Story', isAdopted: true }] : []),
    ],
    sourceStatus: obj.status,
    sourceChanged: false,
  };
}

// ─── Lookup helpers ───────────────────

export function getCircleById(id: string): Circle | undefined {
  return demoCircles.find((c) => c.id === id);
}
