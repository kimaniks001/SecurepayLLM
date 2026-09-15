import type { StoreIdentity, StoreOffer, StoreActivityItem, StoreEnquiry, SecureLink, OfferTradeSnapshot } from './types';

// ─── Store identities ───────────────────

export const demoStores: StoreIdentity[] = [
  {
    id: 'store-keyman',
    name: 'Keyman Security',
    operator: 'Keyman Oak Ltd',
    businessIdentity: 'Business KS identity — authoritative',
    serviceAreas: ['Nairobi', 'Kiambu', 'Machakos'],
    verified: true,
    description: 'Security systems installation and maintenance. CCTV, access control, and alarm systems for homes and businesses.',
  },
  {
    id: 'store-painter',
    name: 'Nairobi Painters Co.',
    operator: 'Nairobi Painters Ltd',
    businessIdentity: 'Business KS identity — authoritative',
    serviceAreas: ['Nairobi'],
    verified: true,
    description: 'Professional interior and exterior painting for residential and commercial properties.',
  },
  {
    id: 'store-daniel',
    name: 'Daniel\'s Tech Store',
    operator: 'Daniel Mwangi',
    businessIdentity: 'Personal KS identity — authoritative',
    serviceAreas: ['Nairobi', 'Online'],
    verified: false,
    description: 'Quality used and refurbished electronics. Phones, laptops, and accessories.',
  },
];

// ─── SecureLinks ───────────────────

function makeSecureLink(id: string, label: string): SecureLink {
  return {
    id: `sl-${id}`,
    url: `securepay.ke/s/${id}`,
    label,
    linkType: 'offer',
    qrAvailable: true,
    whatsappShareAvailable: true,
    embedAvailable: true,
  };
}

// ─── Demo offers ───────────────────

export const demoOffers: StoreOffer[] = [
  {
    id: 'offer-cctv',
    storeId: 'store-keyman',
    storeName: 'Keyman Security',
    title: '4-Camera CCTV Package',
    description: 'Supply and installation of 4 HD CCTV cameras with DVR, cabling, and mobile app configuration. Includes site survey, equipment, installation, and 1-year warranty on equipment.',
    offerType: 'package',
    priceType: 'fixed',
    price: 'KES 85,000',
    currency: 'KES',
    scope: {
      included: ['4 HD cameras', '1 DVR with 1TB storage', 'All cabling and mounting', 'Mobile app configuration', 'Site survey', '1-year equipment warranty'],
      excluded: ['Additional cameras', 'Network upgrade', 'Permit fees'],
    },
    media: [
      { id: 'm-cctv-1', url: '', caption: 'Previous CCTV installation example', isExample: true },
    ],
    serviceArea: 'Nairobi, Kiambu, Machakos',
    availability: 'Available',
    timing: 'Installation within 3-5 days of site visit',
    conditions: ['Site visit required before installation', 'Customer provides stable power supply', 'Indoor and outdoor camera placement per agreement'],
    documents: ['Equipment specification sheet'],
    warrantyTerms: '1-year equipment warranty. Workmanship defects corrected within 14 days of notification.',
    milestoneSeeds: [
      { title: 'Site survey', work: ['Assess camera placement and cabling routes'], target: 'Within 2 days', completionCondition: 'Survey complete and placement agreed' },
      { title: 'Equipment installation', work: ['Install cameras, DVR, and cabling'], target: 'Within 5 days of survey', completionCondition: 'All equipment installed and tested' },
      { title: 'Configuration & handover', work: ['Mobile app setup', 'Customer walkthrough'], target: 'Same day as installation completion', completionCondition: 'Customer confirms system operational' },
    ],
    obligationSeeds: [
      { responsibleParty: 'Keyman Security', action: 'Supply 4 HD cameras and DVR', condition: 'Equipment matches specification sheet' },
      { responsibleParty: 'Keyman Security', action: 'Install and configure system', condition: 'Mobile app operational' },
      { responsibleParty: 'Customer', action: 'Provide stable power supply', condition: 'Power available at installation time' },
    ],
    customizationAllowed: true,
    secureLink: makeSecureLink('cctv', '4-Camera CCTV Package'),
    lifecycle: 'published',
    version: 'v1',
    isExternalReference: false,
    isDemoState: true,
  },
  {
    id: 'offer-painting',
    storeId: 'store-painter',
    storeName: 'Nairobi Painters Co.',
    title: '3-Bedroom Interior Painting',
    description: 'Professional interior painting for a 3-bedroom house. Two coats, surface preparation, and furniture protection included. Customer supplies paint.',
    offerType: 'service',
    priceType: 'fixed',
    price: 'KES 75,000',
    priceUnit: 'customer supplies paint',
    currency: 'KES',
    scope: {
      included: ['Surface preparation', 'Two coats application', 'Furniture protection', 'Cleanup', 'Wall, ceiling, and trim painting'],
      excluded: ['Paint and materials', 'Wall repairs beyond minor patching', 'Removal of wallpaper'],
    },
    media: [
      { id: 'm-paint-1', url: '', caption: 'Previous interior painting example', isExample: true },
    ],
    serviceArea: 'Nairobi',
    availability: 'Available',
    timing: '3-4 days after start date',
    conditions: ['Customer supplies paint and materials', 'Rooms must be cleared of fragile items', 'Water and electricity access required'],
    documents: [],
    warrantyTerms: 'Workmanship defects corrected within 30 days of completion.',
    milestoneSeeds: [
      { title: 'Preparation', work: ['Surface preparation', 'Furniture protection'], target: 'Day 1', completionCondition: 'Surfaces prepared and furniture protected' },
      { title: 'Painting', work: ['Two coats on walls, ceilings, and trim'], target: 'Days 2-3', completionCondition: 'All surfaces painted with two coats' },
      { title: 'Inspection', work: ['Customer inspection', 'Touch-ups'], target: 'Day 4', completionCondition: 'Customer confirms satisfactory completion' },
    ],
    obligationSeeds: [
      { responsibleParty: 'Nairobi Painters Co.', action: 'Prepare surfaces and protect furniture', condition: 'Surfaces ready for painting' },
      { responsibleParty: 'Nairobi Painters Co.', action: 'Apply two coats to all agreed surfaces', condition: 'Even coverage, no drips' },
      { responsibleParty: 'Customer', action: 'Provide paint and materials', condition: 'Paint on site before start date' },
    ],
    customizationAllowed: true,
    secureLink: makeSecureLink('painting', '3-Bedroom Interior Painting'),
    lifecycle: 'published',
    version: 'v2',
    isExternalReference: false,
    isDemoState: true,
  },
  {
    id: 'offer-iphone',
    storeId: 'store-daniel',
    storeName: 'Daniel\'s Tech Store',
    title: 'iPhone 15 Pro 256GB',
    description: 'Used iPhone 15 Pro 256GB in excellent condition. Battery health 94%. Original box and accessories included. No iCloud lock. IMEI verified.',
    offerType: 'product',
    priceType: 'fixed',
    price: 'KES 125,000',
    currency: 'KES',
    scope: {
      included: ['iPhone 15 Pro 256GB', 'Original box', 'Charging cable', 'Original documentation'],
      excluded: ['Warranty beyond inspection', 'Accessories not listed'],
    },
    media: [],
    serviceArea: 'Nairobi',
    availability: 'Available',
    timing: 'Meet in person for inspection',
    conditions: ['IMEI verification before payment', 'No iCloud lock', 'Battery health 94%', 'Inspection before payment'],
    documents: [],
    milestoneSeeds: [],
    obligationSeeds: [
      { responsibleParty: 'Daniel', action: 'Bring iPhone 15 Pro', condition: 'IMEI matches, no iCloud lock' },
      { responsibleParty: 'Customer', action: 'Inspect device', condition: 'IMEI + iCloud + battery health checks' },
    ],
    customizationAllowed: false,
    secureLink: makeSecureLink('iphone', 'iPhone 15 Pro 256GB'),
    lifecycle: 'published',
    version: 'v1',
    isExternalReference: false,
    isDemoState: true,
  },
  {
    id: 'offer-external',
    storeId: 'store-keyman',
    storeName: 'Keyman Security',
    title: 'Solar CCTV System (by ABC Solar)',
    description: 'Solar-powered CCTV system supplied and installed by ABC Solar Ltd. Displayed in Keyman Security Store. Actual seller and contracting party is ABC Solar Ltd.',
    offerType: 'package',
    priceType: 'quote_required',
    price: 'Quote after site visit',
    currency: 'KES',
    scope: {
      included: ['Solar panels', 'CCTV cameras', 'Battery storage', 'Installation'],
      excluded: ['Grid connection', 'Permit fees'],
    },
    media: [],
    serviceArea: 'Nationwide',
    availability: 'Requires site visit',
    timing: 'Quote within 3 days of site visit',
    conditions: ['Site visit required', 'Actual seller is ABC Solar Ltd, not Keyman Security'],
    documents: [],
    milestoneSeeds: [],
    obligationSeeds: [],
    customizationAllowed: true,
    secureLink: makeSecureLink('solar', 'Solar CCTV System'),
    lifecycle: 'published',
    version: 'v1',
    isExternalReference: true,
    externalSellerName: 'ABC Solar Ltd',
    externalSellerIdentity: 'Business KS identity — ABC Solar authoritative',
    provenanceLabel: 'Displayed in Keyman Security Store — supplied by ABC Solar Ltd',
    isDemoState: true,
  },
  {
    id: 'offer-unavailable',
    storeId: 'store-keyman',
    storeName: 'Keyman Security',
    title: '8-Camera Premium CCTV Package',
    description: 'Premium 8-camera package with remote monitoring. Temporarily unavailable due to equipment supply constraints.',
    offerType: 'package',
    priceType: 'fixed',
    price: 'KES 165,000',
    currency: 'KES',
    scope: { included: [], excluded: [] },
    media: [],
    serviceArea: 'Nairobi',
    availability: 'Temporarily unavailable',
    conditions: [],
    documents: [],
    milestoneSeeds: [],
    obligationSeeds: [],
    customizationAllowed: false,
    secureLink: makeSecureLink('premium-cctv', '8-Camera Premium CCTV Package'),
    lifecycle: 'unavailable',
    version: 'v1',
    isExternalReference: false,
    isDemoState: true,
  },
  {
    id: 'offer-survey',
    storeId: 'store-keyman',
    storeName: 'Keyman Security',
    title: 'Land Survey Package',
    description: 'Professional land survey with certified surveyor. Includes boundary marking, survey report, and digital maps.',
    offerType: 'professional_service',
    priceType: 'from',
    price: 'From KES 35,000',
    currency: 'KES',
    scope: {
      included: ['Boundary survey', 'Survey report', 'Digital maps', 'Boundary marking'],
      excluded: ['Title deed processing', 'Dispute resolution'],
    },
    media: [],
    serviceArea: 'Nairobi, Kiambu',
    availability: 'Made to order',
    timing: '5-7 working days',
    conditions: ['Site access required', 'Existing title documents helpful'],
    documents: ['Surveyor credentials'],
    milestoneSeeds: [],
    obligationSeeds: [
      { responsibleParty: 'Keyman Security', action: 'Conduct land survey', condition: 'Survey report delivered' },
    ],
    customizationAllowed: true,
    secureLink: makeSecureLink('survey', 'Land Survey Package'),
    lifecycle: 'published',
    version: 'v1',
    isExternalReference: false,
    isDemoState: true,
  },
];

// ─── Store activity ───────────────────

export const demoStoreActivity: StoreActivityItem[] = [
  { id: 'sa-1', date: 'Today', text: 'Someone opened CCTV Package SecureLink', kind: 'link_open' },
  { id: 'sa-2', date: 'Today', text: 'James started a trade from Painting Package', kind: 'trade_started' },
  { id: 'sa-3', date: 'Yesterday', text: 'Offer updated: 3-Bedroom Interior Painting v2', kind: 'offer_updated' },
  { id: 'sa-4', date: '2 days ago', text: 'New enquiry on Survey Package', kind: 'enquiry' },
  { id: 'sa-5', date: '3 days ago', text: 'Offer published: 4-Camera CCTV Package', kind: 'publish' },
];

// ─── Store enquiries ───────────────────

export const demoEnquiries: StoreEnquiry[] = [
  { id: 'eq-1', question: 'Does the CCTV package include cabling for outdoor cameras?', asker: 'Anonymous visitor', date: 'Yesterday', answered: true, answer: 'Yes, all cabling for both indoor and outdoor cameras is included in the package price.' },
  { id: 'eq-2', question: 'Can I get the painting done in only 2 rooms instead of 3?', asker: 'James K.', date: '2 days ago', answered: false },
];

// ─── Lookup helpers ───────────────────

export function getStoreById(id: string): StoreIdentity | undefined {
  return demoStores.find((s) => s.id === id);
}

export function getOfferById(id: string): StoreOffer | undefined {
  return demoOffers.find((o) => o.id === id);
}

export function getOffersByStore(storeId: string): StoreOffer[] {
  return demoOffers.filter((o) => o.storeId === storeId);
}

export function searchOffers(query: string): StoreOffer[] {
  const q = query.toLowerCase().trim();
  if (!q) return demoOffers.filter((o) => o.lifecycle === 'published');
  return demoOffers.filter((o) =>
    o.lifecycle === 'published' &&
    (o.title.toLowerCase().includes(q) ||
     o.description.toLowerCase().includes(q) ||
     o.storeName.toLowerCase().includes(q) ||
     o.serviceArea.toLowerCase().includes(q) ||
     o.offerType.toLowerCase().includes(q))
  );
}

// ─── Offer comparison data ───────────────────

export const cctvComparison = {
  heading: 'CCTV Package Comparison',
  offers: [
    { id: 'offer-cctv', name: '4-Camera CCTV Package', store: 'Keyman Security' },
    { id: 'offer-survey', name: 'Land Survey Package', store: 'Keyman Security' },
  ],
  rows: [
    { label: 'Cameras', values: ['4 HD cameras', 'N/A'] },
    { label: 'Installation', values: [true, false] },
    { label: 'Price', values: ['KES 85,000', 'From KES 35,000'] },
    { label: 'Service area', values: ['Nairobi, Kiambu, Machakos', 'Nairobi, Kiambu'] },
    { label: 'Warranty', values: ['1-year equipment', 'N/A'] },
    { label: 'Site visit', values: [true, true] },
  ],
  note: 'Factual comparison. No scoring or ranking. Choose based on your needs.',
};

// ─── Offer → Trade snapshot ───────────────────

export function createOfferTradeSnapshot(offer: StoreOffer): OfferTradeSnapshot {
  const sellerOfRecord = offer.isExternalReference && offer.externalSellerName
    ? offer.externalSellerName
    : offer.storeName;
  const sellerOfRecordIdentity = offer.isExternalReference && offer.externalSellerIdentity
    ? offer.externalSellerIdentity
    : 'Business KS identity — authoritative';

  return {
    offerId: offer.id,
    offerVersion: offer.version,
    sellerOfRecord,
    sellerOfRecordIdentity,
    storeId: offer.storeId,
    storeName: offer.storeName,
    displaySource: offer.isExternalReference ? `Displayed in ${offer.storeName} Store` : 'Store-owned offer',
    adoptedFacts: [
      { label: 'Title', value: offer.title },
      { label: 'Price', value: offer.price },
      ...(offer.scope.included.length > 0 ? [{ label: 'Included', value: offer.scope.included.join(', ') }] : []),
      ...(offer.scope.excluded.length > 0 ? [{ label: 'Not included', value: offer.scope.excluded.join(', ') }] : []),
      ...(offer.serviceArea ? [{ label: 'Service area', value: offer.serviceArea }] : []),
      ...(offer.timing ? [{ label: 'Timing', value: offer.timing }] : []),
      ...(offer.warrantyTerms ? [{ label: 'Warranty', value: offer.warrantyTerms }] : []),
    ],
    provenanceLabel: offer.isExternalReference
      ? `Started from ${offer.storeName} Store offer — seller of record: ${sellerOfRecord}`
      : `Started from ${offer.storeName} Store offer`,
    isExternalReference: offer.isExternalReference,
    externalSellerName: offer.externalSellerName,
    timestamp: new Date().toISOString(),
  };
}
