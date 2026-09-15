import type { CommunityObject, CommunityPerson, CommunityBusiness } from './types';

// ─── People ───────────────────

export const demoPeople: CommunityPerson[] = [
  {
    id: 'person-peter',
    name: 'Peter Mwangi',
    capacity: 'personal',
    capabilities: ['plumbing', 'tiling', 'general renovation'],
    selfDescribed: true,
    verifiedQualification: false,
    serviceArea: 'Nairobi, Kilimani',
    businessAssociation: 'Nairobi Painters Co.',
    publicWorkStories: 3,
    communityContributions: 12,
  },
  {
    id: 'person-james',
    name: 'James Kimani',
    capacity: 'personal',
    capabilities: ['project coordination'],
    selfDescribed: true,
    verifiedQualification: false,
    serviceArea: 'Nairobi',
    publicWorkStories: 2,
    communityContributions: 5,
  },
  {
    id: 'person-grace',
    name: 'Grace Wanjiku',
    capacity: 'personal',
    capabilities: ['electrical installation', 'solar'],
    selfDescribed: true,
    verifiedQualification: true,
    serviceArea: 'Nairobi, Westlands',
    publicWorkStories: 1,
    communityContributions: 8,
  },
];

// ─── Businesses ───────────────────

export const demoBusinesses: CommunityBusiness[] = [
  {
    id: 'biz-keyman',
    name: 'Keyman Security',
    whatTheyDo: 'Security systems installation — CCTV, access control, alarms',
    serviceAreas: ['Nairobi', 'Kiambu', 'Machakos'],
    storeId: 'store-keyman',
    publicWorkStories: 4,
    communityContributions: 7,
  },
  {
    id: 'biz-flowfix',
    name: 'FlowFix Plumbing Ltd',
    whatTheyDo: 'Residential and commercial plumbing',
    serviceAreas: ['Nairobi'],
    publicWorkStories: 2,
    communityContributions: 3,
  },
  {
    id: 'biz-brightwire',
    name: 'BrightWire Electrical Ltd',
    whatTheyDo: 'Residential and commercial electrical installation',
    serviceAreas: ['Nairobi', 'Westlands'],
    publicWorkStories: 1,
    communityContributions: 4,
  },
];

// ─── Community objects ───────────────────

export const demoCommunityObjects: CommunityObject[] = [
  // Journey 1: Leaking water tank — Question
  {
    id: 'co-question-1',
    objectType: 'question',
    author: 'James Kimani',
    authorCapacity: 'personal',
    createdAt: '2 hours ago',
    title: 'My water tank is leaking around the fitting. What should I check before calling someone?',
    body: 'The plastic tank on the roof has started dripping from the outlet fitting. I can see water running down the pipe. Is this something I can tighten myself or do I need a plumber?',
    generalLocation: 'Kilimani, Nairobi',
    capabilities: ['plumbing'],
    status: 'active',
    responses: [
      { id: 'r1', author: 'Peter Mwangi', authorCapacity: 'personal', text: 'Check if the fitting is threaded or push-fit. Threaded can be tightened with a spanner — turn clockwise gently. If it\'s push-fit, the seal may be worn and needs replacing. Don\'t overtighten plastic.', date: '1 hour ago', kind: 'reply' },
      { id: 'r2', author: 'FlowFix Plumbing Ltd', authorCapacity: 'business', text: 'Common issue with plastic tanks. The washer inside the fitting degrades over time. If tightening doesn\'t help, the washer needs replacing — a small job. We can help if you need it.', date: '45 min ago', kind: 'reply' },
    ],
    provenance: 'Posted by James Kimani',
    visibility: 'public',
    category: 'plumbing',
  },

  // Journey 3: Construction opportunity
  {
    id: 'co-opp-1',
    objectType: 'opportunity',
    author: 'Nairobi Painters Co.',
    authorCapacity: 'business',
    createdAt: '1 day ago',
    title: 'Two painters required — five days next week in Westlands',
    body: 'We need two experienced painters for a commercial painting job in Westlands next week. Five days, interior painting, all materials provided. Please express interest if available.',
    generalLocation: 'Westlands, Nairobi',
    capabilities: ['painting'],
    status: 'active',
    responses: [
      { id: 'r3', author: 'Peter Mwangi', authorCapacity: 'personal', text: 'I can help. I have interior painting experience and am available next week.', date: '20 hours ago', kind: 'i_can_help' },
    ],
    provenance: 'Posted as Nairobi Painters Co.',
    visibility: 'public',
    category: 'painting',
    budget: 'KES 4,000/day per painter',
    timing: 'Next week, 5 days',
  },

  // Journey 4: Work Story
  {
    id: 'co-story-1',
    objectType: 'work_story',
    author: 'James Kimani',
    authorCapacity: 'personal',
    createdAt: '3 days ago',
    title: 'Bathroom retiling — waterproofing inspection before tiling mattered',
    body: 'Peter and I completed a bathroom retiling project in Kilimani. The work involved removal, surface preparation, tiling, and finishing. The biggest lesson: inspecting waterproofing before tiling caught an issue that would have been far more expensive to fix later.',
    generalLocation: 'Kilimani, Nairobi',
    capabilities: ['tiling', 'waterproofing'],
    status: 'active',
    responses: [
      { id: 'r4', author: 'Grace Wanjiku', authorCapacity: 'personal', text: 'Good point. Waterproofing before tiling is critical. We always inspect before proceeding on wet areas.', date: '2 days ago', kind: 'share_experience' },
    ],
    provenance: 'Shared from completed work — James Kimani',
    visibility: 'public',
    mediaCaption: 'Completed bathroom retiling',
    category: 'tiling',
  },

  // Journey 5: Store offer reference
  {
    id: 'co-offer-ref-1',
    objectType: 'store_offer_reference',
    author: 'Keyman Security',
    authorCapacity: 'business',
    createdAt: '5 days ago',
    title: '4-Camera CCTV Package — KES 85,000',
    body: 'Supply and installation of 4 HD CCTV cameras with DVR, cabling, and mobile app configuration. Site survey included. 1-year equipment warranty.',
    status: 'active',
    responses: [],
    relatedStoreId: 'store-keyman',
    relatedOfferId: 'offer-cctv',
    provenance: 'From Keyman Security Store',
    visibility: 'public',
    category: 'security',
  },

  // Journey 6: Expertise question
  {
    id: 'co-question-2',
    objectType: 'question',
    author: 'James Kimani',
    authorCapacity: 'personal',
    createdAt: '1 day ago',
    title: 'Are these wall cracks structural or cosmetic?',
    body: 'I have diagonal cracks appearing above my door frame. They\'re about 2mm wide. Should I be worried or is this normal settling?',
    generalLocation: 'Nairobi',
    capabilities: ['structural engineering'],
    status: 'active',
    responses: [
      { id: 'r5', author: 'Grace Wanjiku', authorCapacity: 'personal', text: 'Diagonal cracks above door frames can be settlement or structural. Width matters — under 3mm is often cosmetic, but the pattern matters more than width alone. A structural inspection would give you certainty.', date: '20 hours ago', kind: 'reply' },
    ],
    provenance: 'Posted by James Kimani',
    visibility: 'public',
    category: 'structural',
  },

  // Journey 7: Direct community trade — Need
  {
    id: 'co-need-1',
    objectType: 'need',
    author: 'James Kimani',
    authorCapacity: 'personal',
    createdAt: '3 hours ago',
    title: 'Need plumber today in Kilimani — leaking water tank fitting',
    body: 'My water tank is leaking from the outlet fitting. I\'ve tried tightening but it needs a new washer. Need someone today if possible.',
    generalLocation: 'Kilimani, Nairobi',
    capabilities: ['plumbing'],
    status: 'active',
    responses: [
      { id: 'r6', author: 'Peter Mwangi', authorCapacity: 'personal', text: 'I can help. I\'m in Kilimani today and can replace the washer. Should be a quick job.', date: '2 hours ago', kind: 'i_can_help' },
    ],
    provenance: 'Posted by James Kimani',
    visibility: 'public',
    category: 'plumbing',
    timing: 'Today',
  },

  // Discussion
  {
    id: 'co-disc-1',
    objectType: 'discussion',
    author: 'Grace Wanjiku',
    authorCapacity: 'personal',
    createdAt: '4 days ago',
    title: 'Should homeowners buy materials themselves or let contractors supply?',
    body: 'I\'ve seen both approaches work and fail. When homeowners buy, they sometimes get the wrong spec. When contractors supply, the markup can be significant. What\'s the community experience?',
    status: 'active',
    responses: [
      { id: 'r7', author: 'Peter Mwangi', authorCapacity: 'personal', text: 'I prefer to supply because I know the spec. But I always show the customer the receipts. Transparency matters more than who buys.', date: '3 days ago', kind: 'reply' },
      { id: 'r8', author: 'James Kimani', authorCapacity: 'personal', text: 'For my bathroom retiling, I bought the tiles and Peter supplied adhesive and grout. Worked well because I could choose the tiles I wanted.', date: '3 days ago', kind: 'share_experience' },
    ],
    provenance: 'Posted by Grace Wanjiku',
    visibility: 'public',
    category: 'general',
  },

  // Learning — used iPhone
  {
    id: 'co-learn-1',
    objectType: 'experience',
    author: 'James Kimani',
    authorCapacity: 'personal',
    createdAt: '1 week ago',
    title: 'What to check before buying a used phone',
    body: 'Before buying a used iPhone, check: 1) IMEI is clean and not blacklisted, 2) no iCloud lock — sign out and sign back in, 3) battery health in Settings, 4) all buttons and cameras work, 5) water damage indicators. Always inspect before payment.',
    status: 'active',
    responses: [],
    provenance: 'Posted by James Kimani',
    visibility: 'public',
    category: 'electronics',
  },

  // Need — electrician
  {
    id: 'co-need-2',
    objectType: 'need',
    author: 'Anonymous',
    authorCapacity: 'personal',
    createdAt: '6 hours ago',
    title: 'Electrician required for shop fit-out in Westlands',
    body: 'Need an electrician to replace a failed distribution board and install lighting for a small shop. Work should take 1-2 days.',
    generalLocation: 'Westlands, Nairobi',
    capabilities: ['electrical installation'],
    status: 'active',
    responses: [],
    provenance: 'Posted by Anonymous',
    visibility: 'public',
    category: 'electrical',
    timing: 'This week',
  },
];

// ─── Lookup helpers ───────────────────

export function getCommunityObjectById(id: string): CommunityObject | undefined {
  return demoCommunityObjects.find((o) => o.id === id);
}

export function getPersonById(id: string): CommunityPerson | undefined {
  return demoPeople.find((p) => p.id === id);
}

export function getBusinessById(id: string): CommunityBusiness | undefined {
  return demoBusinesses.find((b) => b.id === id);
}

export function searchCommunity(query: string): CommunityObject[] {
  const q = query.toLowerCase().trim();
  if (!q) return demoCommunityObjects;
  return demoCommunityObjects.filter((o) =>
    o.title.toLowerCase().includes(q) ||
    o.body.toLowerCase().includes(q) ||
    (o.category || '').toLowerCase().includes(q) ||
    (o.generalLocation || '').toLowerCase().includes(q) ||
    (o.capabilities || []).some((c) => c.toLowerCase().includes(q))
  );
}

export function searchPeopleAndBusinesses(query: string): { people: CommunityPerson[]; businesses: CommunityBusiness[] } {
  const q = query.toLowerCase().trim();
  if (!q) return { people: demoPeople, businesses: demoBusinesses };
  return {
    people: demoPeople.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.capabilities.some((c) => c.toLowerCase().includes(q)) ||
      (p.serviceArea || '').toLowerCase().includes(q)
    ),
    businesses: demoBusinesses.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      b.whatTheyDo.toLowerCase().includes(q) ||
      b.serviceAreas.some((s) => s.toLowerCase().includes(q))
    ),
  };
}

// ─── Community attention items for signed-in home ───────────────────

export const communityAttentionItems = [
  {
    id: 'catt-1',
    kind: 'document_review' as const,
    title: 'Peter replied to your Need',
    detail: 'Peter Mwangi offered to help with your leaking water tank',
    actionLabel: 'View response',
    actionValue: 'view_response',
    agreementId: 'co-need-1',
  },
  {
    id: 'catt-2',
    kind: 'waiting_confirmation' as const,
    title: 'Someone offered help on your painting Opportunity',
    detail: 'Peter Mwangi expressed interest in the painting opportunity',
    actionLabel: 'View interest',
    actionValue: 'view_interest',
    agreementId: 'co-opp-1',
  },
];
