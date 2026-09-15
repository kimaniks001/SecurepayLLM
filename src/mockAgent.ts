/**
 * Mock Agent Adapter
 *
 * Demo-only layer that simulates the future SecurePay Agent API.
 * Routes user messages to pre-authored demo responses by intent.
 * In production, this entire module is replaced by real API calls.
 */

import type {
  AgentResponse,
  AgentState,
  Understanding,
  Provider,
  StoreProduct,
} from './types';

// ─── Types ──────────────────────────────────────────────

export type Intent =
  | 'tiling'
  | 'plumbing'
  | 'electrical'
  | 'purchase'
  | 'funeral'
  | 'chama'
  | 'document'
  | 'retrieval'
  | 'recipient'
  | 'open';

export type PanelMode =
  | 'understanding'
  | 'photo'
  | 'price'
  | 'providers'
  | 'comparison'
  | 'providerProfile'
  | 'quote'
  | 'agreement'
  | 'identity'
  | 'money'
  | 'contribution'
  | 'checklist'
  | 'chama'
  | 'governance'
  | 'quoteReview'
  | 'retrieval'
  | 'providerHistory'
  | 'storeComparison'
  | 'community'
  | 'map'
  | 'documents'
  | 'transition'
  | 'secureAuth'
  | 'canonicalReview'
  | 'agreementSent'
  | 'recipientReview'
  | 'join'
  | 'joined'
  | 'acceptance'
  | 'changeRequest'
  | 'versionUpdate'
  | 'established'
  | 'moneyReady'
  | 'error';

export interface AgentReply {
  responses: AgentResponse[];
  understanding: Understanding;
  agentState: AgentState;
  selectedProviderId?: string | null;
  panelTitle: string;
  panelMode: PanelMode;
}

export interface ConversationContext {
  intent: Intent | null;
  step: number;
  selectedProviderId: string | null;
}

// ─── Empty understanding ─────────────────────────────────

export const emptyUnderstanding: Understanding = {
  job: { label: 'Job', value: '', state: 'unresolved' },
  scope: { label: 'Scope', value: '', state: 'unresolved' },
  location: { label: 'Location', value: '', state: 'unresolved' },
  people: { label: 'People', value: 'You — customer', state: 'understood' },
  price: { label: 'Price', value: '', state: 'unresolved' },
  timing: { label: 'Timing', value: '', state: 'unresolved' },
  materials: { label: 'Materials', value: '', state: 'unresolved' },
};

// ─── Tiling providers (golden demo) ──────────────────────

const tilingProviders: Provider[] = [
  {
    id: 'tile-p1',
    name: 'Peter Mwangi',
    trade: 'Tiling & bathroom finishes',
    avatar: 'https://images.pexels.com/photos/13392786/pexels-photo-13392786.png?auto=compress&cs=tinysrgb&h=200&w=200',
    serviceArea: 'Westlands • Kilimani • Lavington',
    labourRange: 'KES 950–1,100 / m²',
    availability: 'From 18 September',
    completedWork: 23,
    repeatCustomers: 8,
    capability: 'Floor and wall tiling, waterproofing, tile removal and disposal. Works with ceramic, porcelain and natural stone.',
    projectThumbs: [
      'https://images.pexels.com/photos/6444240/pexels-photo-6444240.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/7587289/pexels-photo-7587289.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/10486084/pexels-photo-10486084.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    ],
    storeUrl: '#',
    tags: ['Bathroom finishes', 'Tile removal', 'Wall tiling'],
  },
  {
    id: 'tile-p2',
    name: 'David Otieno',
    trade: 'Tile installation & flooring',
    avatar: 'https://images.pexels.com/photos/19399318/pexels-photo-19399318.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    serviceArea: 'Nairobi',
    labourRange: 'KES 850–1,000 / m²',
    availability: 'This week',
    completedWork: 11,
    repeatCustomers: 3,
    capability: 'Tile installation and flooring. Specialises in floor tiles, surface levelling and grout work.',
    projectThumbs: [
      'https://images.pexels.com/photos/11806486/pexels-photo-11806486.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/11806490/pexels-photo-11806490.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/22589689/pexels-photo-22589689.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    ],
    storeUrl: '#',
    tags: ['Flooring', 'Tile installation', 'Surface levelling'],
  },
  {
    id: 'tile-p3',
    name: 'Mutua Interiors',
    trade: 'Bathrooms & interior finishing',
    avatar: 'https://images.pexels.com/photos/1368483/pexels-photo-1368483.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    serviceArea: 'Nairobi / Kiambu',
    labourRange: 'KES 1,100–1,250 / m²',
    availability: 'From 22 September',
    completedWork: 31,
    repeatCustomers: 12,
    capability: 'Full bathroom finishing including tiling, waterproofing, fittings and complete interior renovation.',
    projectThumbs: [
      'https://images.pexels.com/photos/8134805/pexels-photo-8134805.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/35868664/pexels-photo-35868664.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/19666087/pexels-photo-19666087.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    ],
    storeUrl: '#',
    tags: ['Full bathrooms', 'Interior finishing', 'Waterproofing'],
  },
];

const tilingPhotoUrl = 'https://images.pexels.com/photos/29181495/pexels-photo-29181495.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

const tilingMaterials: StoreProduct[] = [
  { id: 'mat-1', title: 'Ceramic floor tiles 30×30cm', seller: 'TileHub Nairobi', sellerAvatar: 'https://images.pexels.com/photos/6444240/pexels-photo-6444240.jpeg?auto=compress&cs=tinysrgb&h=200&w=200', price: 'KES 1,200 / box', condition: 'New', location: 'Industrial Area', image: 'https://images.pexels.com/photos/6444240/pexels-photo-6444240.jpeg?auto=compress&cs=tinysrgb&h=400&w=400', posted: '3 days ago', verified: true },
  { id: 'mat-2', title: 'Tile adhesive 25kg', seller: 'BuildMart KE', sellerAvatar: 'https://images.pexels.com/photos/7587289/pexels-photo-7587289.jpeg?auto=compress&cs=tinysrgb&h=200&w=200', price: 'KES 1,850', condition: 'New', location: 'Mombasa Road', image: 'https://images.pexels.com/photos/7587289/pexels-photo-7587289.jpeg?auto=compress&cs=tinysrgb&h=400&w=400', posted: '1 day ago', verified: true },
  { id: 'mat-3', title: 'Grout — white 5kg', seller: 'TileHub Nairobi', sellerAvatar: 'https://images.pexels.com/photos/6444240/pexels-photo-6444240.jpeg?auto=compress&cs=tinysrgb&h=200&w=200', price: 'KES 650', condition: 'New', location: 'Industrial Area', image: 'https://images.pexels.com/photos/10486084/pexels-photo-10486084.jpeg?auto=compress&cs=tinysrgb&h=400&w=400', posted: '5 days ago', verified: false },
];

// ─── Plumbing data ───────────────────────────────────────

const plumbingProviders: Provider[] = [
  {
    id: 'plumb-p1',
    name: 'Samuel Otieno',
    trade: 'Plumbing & water systems',
    avatar: 'https://images.pexels.com/photos/5126090/pexels-photo-5126090.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    serviceArea: 'Nairobi — Eastlands, Buruburu, Donholm',
    labourRange: 'KES 2,500–4,000 / visit',
    availability: 'Same-day available',
    completedWork: 11,
    repeatCustomers: 4,
    capability: 'Water tank repairs, pipe leaks, fittings and replacements.',
    projectThumbs: [
      'https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/29226620/pexels-photo-29226620.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    ],
    storeUrl: '#',
    tags: ['Tank repair', 'Pipe leaks', 'Fittings'],
  },
  {
    id: 'plumb-p2',
    name: 'Mary Wanjiru',
    trade: 'Plumbing & drainage',
    avatar: 'https://images.pexels.com/photos/8312669/pexels-photo-8312669.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    serviceArea: 'Nairobi — Ruaka, Kiambu, Nyali',
    labourRange: 'KES 2,000–3,500 / visit',
    availability: 'Available tomorrow',
    completedWork: 7,
    repeatCustomers: 2,
    capability: 'Residential plumbing, tank installation, leak detection and pipe repair.',
    projectThumbs: [
      'https://images.pexels.com/photos/9389356/pexels-photo-9389356.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/27566315/pexels-photo-27566315.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    ],
    storeUrl: '#',
    tags: ['Leak detection', 'Tank installation', 'Drainage'],
  },
  {
    id: 'plumb-p3',
    name: 'Joseph Kamau',
    trade: 'Domestic water systems',
    avatar: 'https://images.pexels.com/photos/8961342/pexels-photo-8961342.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    serviceArea: 'Nairobi — Karen, Langata, Ngong',
    labourRange: 'KES 2,800–4,500 / visit',
    availability: 'Booking 2 days out',
    completedWork: 15,
    repeatCustomers: 6,
    capability: 'Domestic water systems, tank installation, pump repair and full pipe fitting.',
    projectThumbs: [
      'https://images.pexels.com/photos/27566315/pexels-photo-27566315.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/29226620/pexels-photo-29226620.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    ],
    storeUrl: '#',
    tags: ['Water systems', 'Pump repair', 'Tank installation'],
  },
];

const plumbingPhotoUrl = 'https://images.pexels.com/photos/27566315/pexels-photo-27566315.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

// ─── Electrical data ──────────────────────────────────────

const electricalProviders: Provider[] = [
  {
    id: 'elec-p1',
    name: 'David Kiprop',
    trade: 'Electrical repair & installation',
    avatar: 'https://images.pexels.com/photos/36482485/pexels-photo-36482485.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    serviceArea: 'Nairobi — Westlands, Parklands, Muthaiga',
    labourRange: 'KES 1,500–3,000 / visit',
    availability: 'Available this week',
    completedWork: 8,
    repeatCustomers: 3,
    capability: 'Socket repair and replacement, wiring, fault diagnosis and safety inspections.',
    projectThumbs: [
      'https://images.pexels.com/photos/4981794/pexels-photo-4981794.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/3615735/pexels-photo-3615735.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/7937305/pexels-photo-7937305.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    ],
    storeUrl: '#',
  },
  {
    id: 'elec-p2',
    name: 'Faith Njeri',
    trade: 'Electrical wiring & safety',
    avatar: 'https://images.pexels.com/photos/10850674/pexels-photo-10850674.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    serviceArea: 'Nairobi — Embakasi, Syokimau, Mlolongo',
    labourRange: 'KES 1,200–2,800 / visit',
    availability: 'Booking 3 days out',
    completedWork: 5,
    repeatCustomers: 1,
    capability: 'Residential wiring, socket installation, circuit breaker replacement.',
    projectThumbs: [
      'https://images.pexels.com/photos/442160/pexels-photo-442160.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/7937305/pexels-photo-7937305.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
      'https://images.pexels.com/photos/4981794/pexels-photo-4981794.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    ],
    storeUrl: '#',
  },
];

// ─── Purchase data ──────────────────────────────────────
// (Purchase journey uses seller-named approach, not store listings)

// ─── Intent detection ────────────────────────────────────

function detectIntent(message: string): Intent {
  const m = message.toLowerCase();
  if (/\b(funeral|mum passed|mum died|mother passed|mother died|condolence|bereavement|passed away|contribution)\b/.test(m)) return 'funeral';
  if (/\b(chama|group|saving|invest together|rotating|merry.?go.?round)\b/.test(m)) return 'chama';
  if (/\b(quotation|quote review|document review|review.*quote|review.*document|upload.*quote)\b/.test(m)) return 'document';
  if (/\b(tile|tiling|bathroom|retile|retil)\b/.test(m)) return 'tiling';
  if (/\b(show.*agreement|find.*agreement|past agreement|previous agreement|peter.*renovated|kitchen.*renovation|agreement.*peter|what.*agree.*defect)\b/.test(m)) return 'retrieval';
  if (/\b(securelink|recipient|peter.*invite|invited.*review|demo\/recipient)\b/.test(m)) return 'recipient';
  if (/\b(plumb|leak|tank|pipe|tap|drain|water)\b/.test(m)) return 'plumbing';
  if (/\b(electric|socket|wiring|plug|power|light|fault)\b/.test(m)) return 'electrical';
  if (/\b(buy|purchase|sell|phone|iphone|laptop|used|shop|store|product)\b/.test(m)) return 'purchase';
  return 'open';
}

// ─── Tiling journey (preserved from Pass 1/2) ────────────

function tilingJourney(step: number, _message: string, _selectedProviderId: string | null): AgentReply | null {
  const understoodFull: Understanding = {
    ...emptyUnderstanding,
    job: { label: 'Job', value: 'Bathroom retiling', state: 'understood' },
    scope: { label: 'Scope', value: 'Floor + walls, remove existing tiles', state: 'understood' },
    people: { label: 'Provider', value: 'Peter Mwangi — provider', state: 'understood' },
    price: { label: 'Price', value: 'KES 68,000 labour', state: 'understood' },
    materials: { label: 'Materials', value: 'Customer buys tiles, adhesive, grout', state: 'understood' },
    timing: { label: 'Timing', value: 'Complete by 20 October 2026', state: 'understood' },
  };

  switch (step) {
    case 0:
      return {
        responses: [{ type: 'MESSAGE', text: 'Sure. Are you replacing existing tiles or tiling a new bathroom?' }],
        understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Bathroom tiling', state: 'understood' } },
        agentState: 'thinking', panelTitle: 'What SecurePay understands', panelMode: 'understanding',
      };
    case 1:
      return {
        responses: [
          { type: 'MESSAGE', text: 'That helps. Removing the existing tiles, disposing of them and preparing the surface can affect both price and time. If you have a photo, I can help you think through the scope.' },
          { type: 'PHOTO_UPLOAD', label: 'Add bathroom photo', acceptedTypes: 'JPG, PNG, HEIC', skipLabel: "I don't have one right now" },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Bathroom retiling', state: 'understood' }, scope: { label: 'Scope', value: 'Floor + walls, replacing', state: 'candidate' } },
        agentState: 'understood', panelTitle: 'Photo & scope', panelMode: 'photo',
      };
    case 2:
      return {
        responses: [
          { type: 'PHOTO', url: tilingPhotoUrl, caption: 'Your bathroom' },
          { type: 'MESSAGE', text: 'From the photo, I would treat this as a medium bathroom. The main cost areas are likely to be old-tile removal, disposal, surface preparation and installing the new tiles.' },
          { type: 'MESSAGE', text: "You haven't said who will buy the tiles, adhesive and grout yet. We can settle that later." },
          { type: 'MESSAGE', text: 'I can give you some current price context before you talk to anyone.' },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Show price context', value: 'show_price' }] },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Bathroom retiling', state: 'understood' }, scope: { label: 'Scope', value: 'Floor + walls, existing tiles removed', state: 'understood' }, materials: { label: 'Materials', value: 'Not decided yet', state: 'unresolved' } },
        agentState: 'understood', panelTitle: 'Photo & scope', panelMode: 'photo',
      };
    case 3:
      return {
        responses: [
          { type: 'PRICE_CONTEXT', label: 'Current listed labour', range: 'KES 850–1,200', unit: 'per m²', sources: ['6 current SecurePay demo listings', 'Nairobi area'], note: 'Old tile removal: Often quoted separately. Surface preparation: May affect the final quote. Materials: Usually separate from labour.' },
          { type: 'MESSAGE', text: 'Would you like to see people whose listed work matches this kind of job?' },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Show me', value: 'show_providers' }, { label: 'Define the job more first', value: 'define_more' }] },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Bathroom retiling', state: 'understood' }, scope: { label: 'Scope', value: 'Floor + walls, existing tiles removed', state: 'understood' }, materials: { label: 'Materials', value: 'Not decided yet', state: 'unresolved' } },
        agentState: 'understood', panelTitle: 'Price context', panelMode: 'price',
      };
    case 4:
      return {
        responses: [
          { type: 'MESSAGE', text: 'I found three people whose listed work is close to what you described.' },
          { type: 'PROVIDER_CARDS', heading: 'Matching tilers', providers: tilingProviders },
          { type: 'CHOICE_BUTTONS', choices: [{ label: "What's the difference?", value: 'ask_difference' }] },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Bathroom retiling', state: 'understood' }, scope: { label: 'Scope', value: 'Floor + walls, existing tiles removed', state: 'understood' }, materials: { label: 'Materials', value: 'Not decided yet', state: 'unresolved' } },
        agentState: 'understood', panelTitle: 'Matching tilers', panelMode: 'providers',
      };
    case 5:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Peter includes old-tile removal in this type of work. David has a lower listed rate but it is installation-only. Mutua Interiors shows more complete bathroom finishing.' },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Compare all three', value: 'compare_all' }] },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Bathroom retiling', state: 'understood' }, scope: { label: 'Scope', value: 'Floor + walls, existing tiles removed', state: 'understood' }, materials: { label: 'Materials', value: 'Not decided yet', state: 'unresolved' } },
        agentState: 'understood', panelTitle: 'Matching tilers', panelMode: 'providers',
      };
    case 6:
      return {
        responses: [
          { type: 'COMPARISON', providers: tilingProviders, rows: [
            { label: 'Labour', values: ['950–1100', '850–1000', '1100–1250'] },
            { label: 'Old tile removal', values: ['Included', 'Separate', 'Included'] },
            { label: 'Surface prep', values: ['Included', 'Separate', 'Included'] },
            { label: 'Materials', values: ['Separate', 'Separate', 'Separate'] },
            { label: 'Availability', values: ['18 Sep', 'This week', '22 Sep'] },
            { label: 'Relevant work', values: ['Bathrooms', 'Flooring', 'Full bathrooms'] },
            { label: 'SecurePay history', values: ['23', '11', '31'] },
          ] },
          { type: 'MESSAGE', text: 'Listed prices are not final quotations.' },
          { type: 'CHOICE_BUTTONS', choices: [
            { label: 'View Peter', value: 'view_peter' },
            { label: 'View David', value: 'view_david' },
            { label: 'View Mutua', value: 'view_mutua' },
            { label: 'Back to results', value: 'back_to_results' },
          ] },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Bathroom retiling', state: 'understood' }, scope: { label: 'Scope', value: 'Floor + walls, existing tiles removed', state: 'understood' }, materials: { label: 'Materials', value: 'Not decided yet', state: 'unresolved' } },
        agentState: 'understood', panelTitle: 'Compare providers', panelMode: 'comparison',
      };
    case 7:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Peter looks closest to what you are after. Before you contact him, there are two things I would suggest making clear: whether disposal of the old tiles is included, and who buys the adhesive and grout.' },
          { type: 'CHOICE_BUTTONS', choices: [
            { label: 'Talk to Peter', value: 'talk_to_peter' },
            { label: 'View more work', value: 'view_peter_work' },
            { label: 'Back to comparison', value: 'back_to_comparison' },
          ] },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Bathroom retiling', state: 'understood' }, scope: { label: 'Scope', value: 'Floor + walls, existing tiles removed', state: 'understood' }, people: { label: 'Provider', value: 'Peter Mwangi — being considered', state: 'candidate' }, price: { label: 'Price', value: "Not agreed — listed: KES 950–1,100 / m²", state: 'candidate' }, materials: { label: 'Materials', value: 'Still to decide', state: 'unresolved' }, timing: { label: 'Timing', value: 'Still to decide', state: 'unresolved' } },
        agentState: 'understood', panelTitle: 'Peter Mwangi', panelMode: 'providerProfile',
      };
    case 8:
      return {
        responses: [
          { type: 'ACTION_CONFIRMATION', action: 'Peter Mwangi', detail: "Okay. I'll keep Peter as the provider you are considering." },
          { type: 'MESSAGE', text: "I'll let Peter know you're interested. He can respond with a quote or questions." },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Bathroom retiling', state: 'understood' }, scope: { label: 'Scope', value: 'Floor + walls, remove existing tiles', state: 'understood' }, people: { label: 'Provider', value: 'Peter Mwangi — being considered', state: 'candidate' }, price: { label: 'Price', value: "Not agreed — listed: KES 950–1,100 / m²", state: 'candidate' }, materials: { label: 'Materials', value: 'Still to decide', state: 'unresolved' }, timing: { label: 'Timing', value: 'Still to decide', state: 'unresolved' } },
        agentState: 'understood', panelTitle: 'What SecurePay understands', panelMode: 'understanding',
      };
    case 9:
      return {
        responses: [
          { type: 'PROVIDER_QUOTE', providerName: 'Peter Mwangi', providerAvatar: tilingProviders[0].avatar, text: 'Labour will be KES 68,000 including removal and disposal of the old tiles. Customer buys tiles, adhesive and grout. I can finish by 20 October.', amount: 'KES 68,000', includes: ['Tile removal', 'Disposal', 'Surface preparation', 'Installation'], excludes: ['Tiles', 'Adhesive', 'Grout'], completion: '20 October 2026' },
          { type: 'MESSAGE', text: "Peter's offer settles several things we were still missing." },
          { type: 'NOTICE', label: 'Worth checking', text: "He hasn't said what happens if tiles need to be redone because of workmanship defects. That is worth settling before you agree.", tone: 'worth_checking' },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Bathroom retiling', state: 'understood' }, scope: { label: 'Scope', value: 'Floor + walls, remove existing tiles', state: 'understood' }, people: { label: 'Provider', value: 'Peter Mwangi — provider', state: 'understood' }, price: { label: 'Price', value: 'KES 68,000 labour', state: 'understood' }, materials: { label: 'Materials', value: 'Customer buys tiles, adhesive, grout', state: 'understood' }, timing: { label: 'Timing', value: 'Complete by 20 October 2026', state: 'understood' } },
        agentState: 'understood', panelTitle: "Peter's offer", panelMode: 'quote',
      };
    case 10:
      return {
        responses: [
          { type: 'AGREEMENT_PREVIEW', title: 'Bathroom retiling with Peter', what: ['Remove existing floor and wall tiles', 'Dispose of old tiles', 'Prepare surfaces', 'Install replacement tiles'], who: [{ name: 'You', role: 'customer' }, { name: 'Peter Mwangi', role: 'service provider' }], money: { amount: 'KES 68,000 labour', note: 'Materials separate' }, materials: 'Customer buys tiles, adhesive and grout', when: 'Complete by 20 October 2026', stillToSettle: ['How should workmanship defects be corrected?', 'When should payments be made?'] },
          { type: 'STORE_PROMPT', text: 'If you want, I can show you current SecurePay Store listings for tiles, adhesive and grout.', materials: ['Tiles', 'Adhesive', 'Grout'] },
          { type: 'STORE_PRODUCT_CARDS', heading: 'Materials on SecurePay Store', products: tilingMaterials },
          { type: 'CHOICE_BUTTONS', choices: [
            { label: 'Keep talking', value: 'keep_talking' },
            { label: 'Compare materials', value: 'compare_materials' },
            { label: 'See community discussion', value: 'show_community' },
            { label: 'View on map', value: 'show_map' },
            { label: 'Review what we have', value: 'review_agreement' },
            { label: 'Continue with this', value: 'continue_with_this' },
          ] },
        ],
        understanding: understoodFull, agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement',
      };
    case 13: // Store comparison
      return {
        responses: [
          { type: 'MESSAGE', text: 'Here is a comparison of adhesive and grout from three SecurePay Store listings near you. These are for planning — they are not part of your agreement until you choose to use them.' },
          {
            type: 'PRODUCT_COMPARISON',
            heading: 'Compare materials',
            products: [
              { name: 'TileBond Pro', store: 'BuildHub Westlands' },
              { name: 'TileBond Pro', store: 'Tile Centre Ngara' },
              { name: 'TileBond Pro', store: 'Kilimani Hardware' },
            ],
            rows: [
              { label: 'Adhesive 20kg', values: ['2,450', '2,300', '2,600'] },
              { label: 'Grout 5kg', values: ['850', '800', '900'] },
              { label: 'Pickup', values: ['Today', 'Tomorrow', 'Today'] },
              { label: 'Delivery', values: [true, true, false] },
              { label: 'Location', values: ['Westlands', 'Ngara', 'Kilimani'] },
            ],
            note: 'Store B is slightly cheaper, but Store A is closer and has same-day pickup. — Demo SecurePay Store listings',
          },
          { type: 'CHOICE_BUTTONS', choices: [
            { label: 'Back to this trade', value: 'back_to_agreement' },
            { label: 'Keep talking', value: 'keep_talking' },
          ] },
        ],
        understanding: understoodFull,
        agentState: 'understood',
        panelTitle: 'Compare materials',
        panelMode: 'storeComparison',
      };
    case 14: // Community discussion
      return {
        responses: [
          { type: 'MESSAGE', text: 'There is an active discussion in the Construction Community about tiling pricing this month. This is community knowledge — not part of your agreement.' },
          {
            type: 'COMMUNITY_DISCUSSION',
            community: 'Construction Community',
            topic: 'How are fundis pricing bathroom tiling this month?',
            replies: 18,
            themes: ['per m² pricing', 'disposal', 'labour-only quotes'],
            provenance: 'From the SecurePay Construction Circle — demo',
          },
          {
            type: 'COMMUNITY_STORY',
            community: 'Construction Community',
            title: 'Bathroom renovation in Kilimani',
            author: 'A SecurePay provider',
            whatChanged: ['Old tiles removed', 'Wall preparation', 'New porcelain tiles installed'],
            usefulNote: 'Removal was priced separately from installation.',
            imageUrl: 'https://images.pexels.com/photos/6444240/pexels-photo-6444240.jpeg?auto=compress&cs=tinysrgb&h=300&w=400',
            provenance: 'From the SecurePay Construction Circle — demo',
          },
          { type: 'CHOICE_BUTTONS', choices: [
            { label: 'Back to this trade', value: 'back_to_agreement' },
            { label: 'Keep talking', value: 'keep_talking' },
          ] },
        ],
        understanding: understoodFull,
        agentState: 'understood',
        panelTitle: 'Community discussion',
        panelMode: 'community',
      };
    case 15: // Map
      return {
        responses: [
          { type: 'MESSAGE', text: 'Peter works in Westlands, Kilimani and Lavington. Your job is in Westlands, so he is within his listed service area. This is for your reference — not part of your agreement.' },
          {
            type: 'MAP_RESULT',
            label: 'Service area & job location',
            area: 'Nairobi — Westlands area',
            pins: [
              { label: 'Job location', sublabel: 'Westlands', color: 'job' },
              { label: 'Peter — service area', sublabel: 'Westlands, Kilimani, Lavington', color: 'provider' },
              { label: 'BuildHub', sublabel: 'Adhesive pickup', color: 'store' },
            ],
            note: 'Peter is within 3km of the job location. BuildHub is nearby for material pickup. — Demo location context',
          },
          { type: 'CHOICE_BUTTONS', choices: [
            { label: 'Back to this trade', value: 'back_to_agreement' },
            { label: 'Keep talking', value: 'keep_talking' },
          ] },
        ],
        understanding: understoodFull,
        agentState: 'understood',
        panelTitle: 'Map',
        panelMode: 'map',
      };
    case 11: // Transition confirm — "You're about to make this secure"
      return {
        responses: [
          {
            type: 'TRANSITION_CONFIRM',
            title: "You're about to make this secure",
            text: 'SecurePay has helped you work out the trade. The next step connects this understanding to your SecurePay identity so the agreement can be set securely.',
            primaryLabel: 'Continue securely',
            primaryValue: 'continue_securely',
            secondaryLabel: 'Not yet — keep talking',
            secondaryValue: 'back_to_agreement',
          },
        ],
        understanding: understoodFull, agentState: 'needs_you', panelTitle: 'Making this secure', panelMode: 'transition',
      };
    case 12: // Secure identity
      return {
        responses: [
          {
            type: 'SECURE_AUTH',
            title: 'Secure Identity',
            identityName: 'James Kimani',
            identityKsn: 'KS001••••',
            reason: 'This connects the agreement to the correct SecurePay identity.',
            fields: [
              { label: 'KSNumber', placeholder: 'KS001...', type: 'text' },
              { label: 'Password', placeholder: '••••••••', type: 'password' },
              { label: 'OTP', placeholder: 'Enter code', type: 'otp' },
            ],
            primaryLabel: 'Confirm identity',
            primaryValue: 'confirm_identity',
            secondaryLabel: 'Use another identity',
            secondaryValue: 'use_another',
          },
        ],
        understanding: understoodFull, agentState: 'needs_you', panelTitle: 'Secure identity', panelMode: 'secureAuth',
      };
    case 20: // Canonical agreement review
      return {
        responses: [
          { type: 'MESSAGE', text: 'Identity confirmed. Now review exactly what you are about to set securely.' },
          {
            type: 'CANONICAL_AGREEMENT',
            title: 'Bathroom retiling with Peter Mwangi',
            version: 'Demo v1',
            status: 'Not yet set',
            parties: [{ name: 'James Kimani', role: 'Customer' }, { name: 'Peter Mwangi', role: 'Provider' }],
            work: ['Remove old bathroom floor and wall tiles', 'Dispose of removed tiles', 'Prepare surfaces', 'Install replacement tiles'],
            price: 'KES 68,000 labour',
            materials: 'Customer supplies tiles, adhesive and grout',
            completion: 'By 20 October 2026',
            worthSettling: [
              { label: 'Defect correction', detail: 'You have not yet agreed what happens if workmanship needs to be redone.' },
              { label: 'Payment timing', detail: 'When payments should be made has not been settled.' },
            ],
            mustSettle: [],
            primaryLabel: 'Set this securely',
            primaryValue: 'set_securely',
            secondaryLabel: 'Back to review',
            secondaryValue: 'back_to_review',
          },
        ],
        understanding: understoodFull, agentState: 'needs_you', panelTitle: 'Agreement review', panelMode: 'canonicalReview',
      };
    case 21: // "You are about to set this version" + send
      return {
        responses: [
          { type: 'MESSAGE', text: 'You are about to set this version.' },
          { type: 'MESSAGE', text: 'Bathroom retiling with Peter Mwangi — KES 68,000 labour, complete by 20 Oct 2026. This does not mean Peter has agreed yet.' },
          {
            type: 'CHOICE_BUTTONS',
            choices: [
              { label: 'Set and send to Peter', value: 'send_to_peter' },
              { label: 'Back to review', value: 'back_to_review' },
            ],
          },
        ],
        understanding: understoodFull, agentState: 'needs_you', panelTitle: 'Set and send', panelMode: 'canonicalReview',
      };
    case 22: // Agreement sent to Peter
      return {
        responses: [
          {
            type: 'AGREEMENT_SENT',
            title: 'Agreement sent to Peter',
            recipientName: 'Peter',
            steps: ['Review the invitation', 'Identify himself', 'Join the agreement', 'Confirm the exact agreement version'],
          },
        ],
        understanding: understoodFull, agentState: 'understood', panelTitle: 'Sent to Peter', panelMode: 'agreementSent',
      };
    default:
      return { responses: [{ type: 'MESSAGE', text: 'Is there anything else you would like to settle before this goes to Peter?' }], understanding: understoodFull, agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement' };
  }
}

// ─── Funeral contribution journey ─────────────────────────

function funeralJourney(step: number, _message: string, _selectedProviderId: string | null): AgentReply | null {
  const understood: Understanding = {
    ...emptyUnderstanding,
    job: { label: 'Purpose', value: 'Funeral contribution for Mum', state: 'understood' },
    scope: { label: 'Covers', value: 'Hospital balance, transport, food, funeral expenses', state: 'understood' },
    people: { label: 'Organizers', value: 'Not set', state: 'unresolved' },
    price: { label: 'Target', value: '', state: 'unresolved' },
  };

  switch (step) {
    case 0:
      return {
        responses: [
          { type: 'MESSAGE', text: "I'm sorry for your loss. I can help you organize the contribution clearly so the family doesn't have to keep everything in their heads." },
          { type: 'MESSAGE', text: 'Do you already know what the contribution needs to cover, or should we work that out together?' },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Purpose', value: 'Funeral contribution', state: 'understood' } },
        agentState: 'listening', panelTitle: 'What SecurePay understands', panelMode: 'understanding',
      };
    case 1:
      return {
        responses: [
          { type: 'MESSAGE', text: 'That helps. If you want, I can help you set a target from those costs rather than choosing a number blindly.' },
          { type: 'CONTRIBUTION_PLAN', title: 'Contribution plan', categories: [
            { label: 'Hospital balance', state: 'unset' },
            { label: 'Transport', state: 'unset' },
            { label: 'Food', state: 'unset' },
            { label: 'Tent & chairs', state: 'unset' },
            { label: 'Burial costs', state: 'unset' },
            { label: 'Other', state: 'unset' },
          ], note: 'Set amounts for each category and SecurePay will total them for you.' },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Set a target', value: 'set_target' }, { label: 'We already have a number', value: 'have_number' }] },
        ],
        understanding: { ...understood, scope: { label: 'Covers', value: 'Hospital, transport, food, funeral expenses', state: 'understood' } },
        agentState: 'understood', panelTitle: 'Contribution plan', panelMode: 'contribution',
      };
    case 2:
      return {
        responses: [
          { type: 'MESSAGE', text: 'KES 450,000. Got it.' },
          { type: 'CONTRIBUTION_PLAN', title: 'Contribution plan', categories: [
            { label: 'Hospital balance', state: 'unset' },
            { label: 'Transport', state: 'unset' },
            { label: 'Food', state: 'unset' },
            { label: 'Tent & chairs', state: 'unset' },
            { label: 'Burial costs', state: 'unset' },
            { label: 'Other', state: 'unset' },
          ], target: 'KES 450,000', note: 'You can break this down by category later.' },
          { type: 'MESSAGE', text: 'Who should help organize and approve spending?' },
          { type: 'PERSON_PICKER', label: 'Add organizers', people: [
            { name: 'James Kimani', role: 'Organizer', ksn: 'KS001...' },
            { name: 'Grace Wanjiru', role: 'Organizer', ksn: 'KS014...' },
          ] },
        ],
        understanding: { ...understood, price: { label: 'Target', value: 'KES 450,000', state: 'understood' }, people: { label: 'Organizers', value: 'Not set', state: 'unresolved' } },
        agentState: 'needs_you', panelTitle: 'Family organizers', panelMode: 'contribution',
      };
    case 3:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Good. James and Grace are now organizers. They can approve spending against the contribution.' },
          { type: 'AGREEMENT_PREVIEW', title: 'Funeral contribution', what: ['Collect contributions from family', 'Approve spending for hospital, transport, food and funeral expenses', 'Track spending against KES 450,000 target'], who: [{ name: 'James Kimani', role: 'organizer' }, { name: 'Grace Wanjiru', role: 'organizer' }], money: { amount: 'KES 450,000 target', note: 'Spending tracked against categories' }, when: 'As needed', stillToSettle: ['How are spending decisions approved?', 'What happens if contributions exceed the target?'] },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Keep talking', value: 'keep_talking' }, { label: 'Continue with this', value: 'continue_with_this' }] },
        ],
        understanding: { ...understood, price: { label: 'Target', value: 'KES 450,000', state: 'understood' }, people: { label: 'Organizers', value: 'James Kimani, Grace Wanjiru', state: 'understood' } },
        agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement',
      };
    case 4:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Before this goes live, SecurePay needs to confirm your identity.' },
          { type: 'IDENTITY_CHECK', name: 'James Kimani', ksn: 'KS001...', reason: 'This connects the contribution to the correct SecurePay identity.' },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Continue', value: 'confirm_identity' }, { label: 'Use another identity', value: 'use_another' }] },
        ],
        understanding: { ...understood, price: { label: 'Target', value: 'KES 450,000', state: 'understood' }, people: { label: 'Organizers', value: 'James Kimani, Grace Wanjiru', state: 'understood' } },
        agentState: 'needs_you', panelTitle: 'Secure identity', panelMode: 'identity',
      };
    case 5:
      return {
        responses: [
          { type: 'MESSAGE', text: 'You and the organizers now have a reviewed contribution plan. When you are ready, SecurePay can help you collect and track contributions.' },
          { type: 'MONEY_HANDOFF', text: 'SecurePay can help you collect contributions, approve spending, and track everything against the KES 450,000 target.', agreementRef: 'Funeral contribution — KES 450,000' },
        ],
        understanding: { ...understood, price: { label: 'Target', value: 'KES 450,000', state: 'understood' }, people: { label: 'Organizers', value: 'James Kimani, Grace Wanjiru', state: 'understood' } },
        agentState: 'understood', panelTitle: 'Money', panelMode: 'money',
      };
    default:
      return { responses: [{ type: 'MESSAGE', text: 'Is there anything else you would like to settle?' }], understanding: { ...understood, price: { label: 'Target', value: 'KES 450,000', state: 'understood' }, people: { label: 'Organizers', value: 'James Kimani, Grace Wanjiru', state: 'understood' } }, agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement' };
  }
}

// ─── Purchase journey (used iPhone) ───────────────────────

function purchaseJourney(step: number, _message: string, _selectedProviderId: string | null): AgentReply | null {
  const understood: Understanding = {
    ...emptyUnderstanding,
    job: { label: 'Item', value: 'Used iPhone 15 Pro', state: 'understood' },
    people: { label: 'Seller', value: '', state: 'unresolved' },
    price: { label: 'Price', value: '', state: 'unresolved' },
    location: { label: 'Meeting', value: '', state: 'unresolved' },
    timing: { label: 'Date', value: '', state: 'unresolved' },
  };

  switch (step) {
    case 0:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Sure. Do you already have a seller, or are you still looking?' },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Item', value: 'Used iPhone 15 Pro', state: 'understood' } },
        agentState: 'thinking', panelTitle: 'What SecurePay understands', panelMode: 'understanding',
      };
    case 1:
      return {
        responses: [
          { type: 'MESSAGE', text: 'KES 125,000 from Daniel. Got it.' },
          { type: 'NOTICE', label: 'Worth checking', text: 'Before you agree, there are a few things worth checking on a used iPhone: iCloud lock, battery health, storage, physical condition, and whether the IMEI matches the device.', tone: 'worth_checking' },
          { type: 'PURCHASE_CHECKLIST', title: 'Before you pay', items: [
            { label: 'iCloud lock removed', checked: false },
            { label: 'Battery health', checked: false },
            { label: 'Storage confirmed', checked: false },
            { label: 'Physical condition', checked: false },
            { label: 'IMEI matches device', checked: false },
            { label: 'Accessories included', checked: false },
            { label: 'Receipt / proof of ownership', checked: false },
          ], note: 'Check these before payment moves. SecurePay can hold payment until you confirm.' },
        ],
        understanding: { ...understood, people: { label: 'Seller', value: 'Daniel', state: 'understood' }, price: { label: 'Price', value: 'KES 125,000', state: 'understood' } },
        agentState: 'understood', panelTitle: 'Purchase checklist', panelMode: 'checklist',
      };
    case 2:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Westlands on 20 September. Got it.' },
          { type: 'MESSAGE', text: 'If you only want payment to move after you inspect it, SecurePay can hold the KES 125,000 until you confirm the device checks out.' },
          { type: 'AGREEMENT_PREVIEW', title: 'Used iPhone 15 Pro purchase', what: ['Buy used iPhone 15 Pro from Daniel', 'Inspect device before payment', 'Payment released after buyer confirms'], who: [{ name: 'You', role: 'buyer' }, { name: 'Daniel', role: 'seller' }], money: { amount: 'KES 125,000', note: 'Held until inspection confirmed' }, when: '20 September 2026, Westlands', stillToSettle: ['What happens if the device fails inspection?', 'Is there a return window?'] },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Keep talking', value: 'keep_talking' }, { label: 'Continue with this', value: 'continue_with_this' }] },
        ],
        understanding: { ...understood, people: { label: 'Seller', value: 'Daniel', state: 'understood' }, price: { label: 'Price', value: 'KES 125,000', state: 'understood' }, location: { label: 'Meeting', value: 'Westlands', state: 'understood' }, timing: { label: 'Date', value: '20 September 2026', state: 'understood' } },
        agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement',
      };
    case 3:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Before you and Daniel continue, SecurePay needs to confirm your identity.' },
          { type: 'IDENTITY_CHECK', name: 'James Kimani', ksn: 'KS001...', reason: 'This connects the purchase to the correct SecurePay identity.' },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Continue', value: 'confirm_identity' }, { label: 'Use another identity', value: 'use_another' }] },
        ],
        understanding: { ...understood, people: { label: 'Seller', value: 'Daniel', state: 'understood' }, price: { label: 'Price', value: 'KES 125,000', state: 'understood' }, location: { label: 'Meeting', value: 'Westlands', state: 'understood' }, timing: { label: 'Date', value: '20 September 2026', state: 'understood' } },
        agentState: 'needs_you', panelTitle: 'Secure identity', panelMode: 'identity',
      };
    case 4:
      return {
        responses: [
          { type: 'MESSAGE', text: 'You and Daniel now have a reviewed agreement. When you are ready, SecurePay can hold the payment until you confirm the device.' },
          { type: 'MONEY_HANDOFF', text: 'SecurePay can hold KES 125,000 and release it to Daniel only after you confirm the iPhone passes inspection.', agreementRef: 'Used iPhone 15 Pro — KES 125,000' },
        ],
        understanding: { ...understood, people: { label: 'Seller', value: 'Daniel', state: 'understood' }, price: { label: 'Price', value: 'KES 125,000', state: 'understood' }, location: { label: 'Meeting', value: 'Westlands', state: 'understood' }, timing: { label: 'Date', value: '20 September 2026', state: 'understood' } },
        agentState: 'understood', panelTitle: 'Money', panelMode: 'money',
      };
    default:
      return { responses: [{ type: 'MESSAGE', text: 'Is there anything else you would like to settle before the meeting?' }], understanding: { ...understood, people: { label: 'Seller', value: 'Daniel', state: 'understood' }, price: { label: 'Price', value: 'KES 125,000', state: 'understood' }, location: { label: 'Meeting', value: 'Westlands', state: 'understood' }, timing: { label: 'Date', value: '20 September 2026', state: 'understood' } }, agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement' };
  }
}

// ─── Chama journey ───────────────────────────────────────

function chamaJourney(step: number, _message: string, _selectedProviderId: string | null): AgentReply | null {
  const understood: Understanding = {
    ...emptyUnderstanding,
    job: { label: 'Group', value: 'Investment chama', state: 'understood' },
    scope: { label: 'Members', value: '8', state: 'understood' },
    price: { label: 'Contribution', value: 'KES 20,000 / member / month', state: 'understood' },
    people: { label: 'Governance', value: '', state: 'unresolved' },
  };

  switch (step) {
    case 0:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Great. What are you hoping the group will do together — regular saving, investing together, rotating payouts, or something else?' },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Group', value: 'Chama', state: 'understood' }, scope: { label: 'Members', value: '8', state: 'understood' } },
        agentState: 'listening', panelTitle: 'What SecurePay understands', panelMode: 'understanding',
      };
    case 1:
      return {
        responses: [
          { type: 'MESSAGE', text: 'That helps. Eight members investing together at KES 20,000 each per month.' },
          { type: 'CHAMA_SETUP', title: 'Greenfields Investment Group', members: 8, contribution: 'KES 20,000', frequency: '/ member / month', purpose: 'Invest together', stillToDecide: ['When contributions begin', 'Governance threshold for major decisions', 'Who can authorize money movement', 'Visibility for members'] },
          { type: 'NOTICE', label: 'Useful to settle', text: "You'll probably want to separate two things: who can approve major group decisions, and who is allowed to authorize money movement. They don't have to be the same rule.", tone: 'useful' },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Set governance rules', value: 'set_governance' }, { label: 'Keep talking', value: 'keep_talking' }] },
        ],
        understanding: { ...understood, price: { label: 'Contribution', value: 'KES 20,000 / member / month', state: 'understood' } },
        agentState: 'understood', panelTitle: 'Chama setup', panelMode: 'chama',
      };
    case 2:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Good. Five of eight for major decisions, and two elected officials for money movement.' },
          { type: 'GOVERNANCE', title: 'Governance rules', majorDecisions: '5 of 8 members', moneyAuthority: '2 elected officials', note: 'These rules can be changed later by a major-decision vote.' },
          { type: 'AGREEMENT_PREVIEW', title: 'Greenfields Investment Group', what: ['8 members contribute KES 20,000 monthly', 'Invest together as a group', 'Major decisions require 5 of 8 members', 'Money movement requires 2 elected officials'], who: [{ name: '8 members', role: 'contributors' }], money: { amount: 'KES 160,000 / month', note: 'KES 20,000 per member' }, when: 'Monthly contributions', stillToSettle: ['When do contributions begin?', 'Who are the 2 elected officials?', 'What investments are allowed?'] },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Keep talking', value: 'keep_talking' }, { label: 'Continue with this', value: 'continue_with_this' }] },
        ],
        understanding: { ...understood, people: { label: 'Governance', value: '5 of 8 major decisions, 2 money officials', state: 'understood' } },
        agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement',
      };
    case 3:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Before this group goes live, SecurePay needs to confirm your identity.' },
          { type: 'IDENTITY_CHECK', name: 'James Kimani', ksn: 'KS001...', reason: 'This connects the chama to the correct SecurePay identity.' },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Continue', value: 'confirm_identity' }, { label: 'Use another identity', value: 'use_another' }] },
        ],
        understanding: { ...understood, people: { label: 'Governance', value: '5 of 8 major decisions, 2 money officials', state: 'understood' } },
        agentState: 'needs_you', panelTitle: 'Secure identity', panelMode: 'identity',
      };
    case 4:
      return {
        responses: [
          { type: 'MESSAGE', text: 'You now have a reviewed group structure. When you are ready, SecurePay can help you collect monthly contributions and manage group money.' },
          { type: 'MONEY_HANDOFF', text: 'SecurePay can collect KES 20,000 from each member monthly, enforce the 2-official money rule, and keep everything visible to the group.', agreementRef: 'Greenfields Investment Group — KES 160,000 / month' },
        ],
        understanding: { ...understood, people: { label: 'Governance', value: '5 of 8 major decisions, 2 money officials', state: 'understood' } },
        agentState: 'understood', panelTitle: 'Money', panelMode: 'money',
      };
    default:
      return { responses: [{ type: 'MESSAGE', text: 'Is there anything else you would like to settle before the group starts?' }], understanding: { ...understood, people: { label: 'Governance', value: '5 of 8 major decisions, 2 money officials', state: 'understood' } }, agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement' };
  }
}

// ─── Document review journey ─────────────────────────────

function documentJourney(step: number, _message: string, _selectedProviderId: string | null): AgentReply | null {
  const understood: Understanding = {
    ...emptyUnderstanding,
    job: { label: 'Task', value: 'Review quotation', state: 'understood' },
    scope: { label: 'Document', value: 'Renovation quotation', state: 'understood' },
    price: { label: 'Labour', value: 'KES 180,000', state: 'candidate' },
    materials: { label: 'Materials', value: 'KES 340,000', state: 'candidate' },
    timing: { label: 'Completion', value: '6 weeks', state: 'candidate' },
  };

  switch (step) {
    case 0:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Yes. Upload it and I will help you separate what is clear from what may still need agreement.' },
          { type: 'DOCUMENT_UPLOAD', label: 'Upload quotation', acceptedTypes: 'PDF, JPG, PNG' },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Task', value: 'Review quotation', state: 'understood' } },
        agentState: 'listening', panelTitle: 'What SecurePay understands', panelMode: 'understanding',
      };
    case 1:
      return {
        responses: [
          { type: 'MESSAGE', text: "I have read the quotation. Here is what I found." },
          { type: 'QUOTE_REVIEW', filename: 'Peter_Quote_Sept.pdf', facts: [
            { label: 'Labour', value: 'KES 180,000', state: 'clear' },
            { label: 'Materials', value: 'KES 340,000', state: 'clear' },
            { label: 'Completion', value: '6 weeks', state: 'clear' },
            { label: 'Deposit', value: '50% upfront', state: 'clear' },
            { label: 'Defect / correction rule', value: 'Not mentioned', state: 'not_stated' },
            { label: 'Start date', value: 'Not specified', state: 'not_stated' },
            { label: 'Material substitutions', value: 'Not addressed', state: 'not_stated' },
            { label: 'Variation / additional cost approval', value: 'Not addressed', state: 'needs_clarification' },
          ], note: 'From quotation — not yet agreed. Extracted facts should be confirmed before use.' },
          { type: 'NOTICE', label: 'Worth checking', text: 'The price is clear, but I would not treat the quotation as complete yet. It does not say how additional costs are approved or what happens if workmanship needs correction.', tone: 'worth_checking' },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Use these details in my trade', value: 'use_details' }, { label: 'Keep reviewing', value: 'keep_reviewing' }] },
        ],
        understanding: understood,
        agentState: 'understood', panelTitle: 'Quote review', panelMode: 'quoteReview',
      };
    case 2:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Okay. I have moved the clear facts into your trade context. The items that need clarification are marked so you can raise them with Peter.' },
          { type: 'AGREEMENT_PREVIEW', title: 'Renovation with Peter', what: ['Labour — KES 180,000', 'Materials — KES 340,000', 'Completion — 6 weeks', 'Deposit — 50% upfront'], who: [{ name: 'You', role: 'customer' }, { name: 'Peter', role: 'contractor' }], money: { amount: 'KES 520,000 total', note: 'From quotation — not yet agreed' }, when: '6 weeks from start', stillToSettle: ['Defect / correction rule', 'Exact start date', 'Material substitution policy', 'How are additional costs approved?'] },
          { type: 'CHOICE_BUTTONS', choices: [{ label: 'Keep talking', value: 'keep_talking' }, { label: 'Continue with this', value: 'continue_with_this' }] },
        ],
        understanding: { ...understood, price: { label: 'Total', value: 'KES 520,000 (from quotation)', state: 'candidate' } },
        agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement',
      };
    default:
      return { responses: [{ type: 'MESSAGE', text: 'Is there anything else in the quotation you would like to check?' }], understanding: understood, agentState: 'understood', panelTitle: 'Quote review', panelMode: 'quoteReview' };
  }
}

// ─── Agreement retrieval journey ─────────────────────────

function retrievalJourney(step: number, _message: string, _selectedProviderId: string | null): AgentReply | null {
  switch (step) {
    case 0:
      return {
        responses: [
          { type: 'MESSAGE', text: 'I found one agreement that looks like the one you mean.' },
          { type: 'AGREEMENT_RESULT', title: 'Kitchen renovation with Peter Mwangi', status: 'Completed', agreed: 'KES 320,000 labour', period: '5 Oct – 30 Nov 2026', keyTerms: ['Materials separate', 'Major changes require approval', 'Defects corrected before final payment'], provenance: 'From your completed SecurePay agreement' },
          { type: 'CHOICE_BUTTONS', choices: [
            { label: 'What did we agree about defects?', value: 'ask_defects' },
            { label: 'Show payments', value: 'show_payments' },
            { label: 'Show documents', value: 'show_documents' },
          ] },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Agreement', value: 'Kitchen renovation with Peter', state: 'understood' }, people: { label: 'Provider', value: 'Peter Mwangi', state: 'understood' }, price: { label: 'Agreed', value: 'KES 320,000 labour', state: 'understood' }, timing: { label: 'Period', value: '5 Oct – 30 Nov 2026', state: 'understood' } },
        agentState: 'understood', panelTitle: 'Agreement found', panelMode: 'retrieval',
      };
    case 1:
      return {
        responses: [
          { type: 'MESSAGE', text: 'Peter was to correct any defects found before final handover, before the final payment was released. That was agreed as part of the original terms.' },
          { type: 'CHOICE_BUTTONS', choices: [
            { label: 'Show payments', value: 'show_payments' },
            { label: 'Open full agreement', value: 'open_agreement' },
          ] },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Agreement', value: 'Kitchen renovation with Peter', state: 'understood' }, people: { label: 'Provider', value: 'Peter Mwangi', state: 'understood' }, price: { label: 'Agreed', value: 'KES 320,000 labour', state: 'understood' }, timing: { label: 'Period', value: '5 Oct – 30 Nov 2026', state: 'understood' } },
        agentState: 'understood', panelTitle: 'Agreement found', panelMode: 'retrieval',
      };
    default:
      return { responses: [{ type: 'MESSAGE', text: 'Is there anything else you would like to know about this agreement?' }], understanding: { ...emptyUnderstanding, job: { label: 'Agreement', value: 'Kitchen renovation with Peter', state: 'understood' }, people: { label: 'Provider', value: 'Peter Mwangi', state: 'understood' }, price: { label: 'Agreed', value: 'KES 320,000 labour', state: 'understood' }, timing: { label: 'Period', value: '5 Oct – 30 Nov 2026', state: 'understood' } }, agentState: 'understood', panelTitle: 'Agreement found', panelMode: 'retrieval' };
  }
}

// ─── Plumbing journey ────────────────────────────────────

function plumbingJourney(step: number, _message: string, selectedProviderId: string | null): AgentReply | null {
  switch (step) {
    case 0:
      return {
        responses: [
          { type: 'MESSAGE', text: "You worked with Kamau Plumbing six months ago. Would you like to look at him again, or see other plumbers?" },
          { type: 'AGREEMENT_RESULT', title: 'Previous work with Kamau Plumbing', status: 'Completed', agreed: 'KES 8,500', period: 'March 2026', keyTerms: ['Kitchen leak repair', 'Same-day visit', '30-day warranty'], provenance: 'From your completed SecurePay agreement' },
          { type: 'CHOICE_BUTTONS', choices: [
            { label: 'View Kamau', value: 'view_kamau' },
            { label: 'Find other plumbers', value: 'find_others' },
          ] },
        ],
        understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Repair leaking water tank', state: 'understood' }, people: { label: 'Previous provider', value: 'Kamau Plumbing', state: 'candidate' } },
        agentState: 'understood', panelTitle: 'Previous provider', panelMode: 'retrieval',
      };
    case 1:
      return { responses: [{ type: 'MESSAGE', text: 'Sure. Is the tank itself leaking, or is the leak coming from a pipe or connection around it?' }, { type: 'PHOTO_UPLOAD', label: 'Share a photo of the tank or leak', acceptedTypes: 'JPG, PNG, HEIC', skipLabel: "I don't have one right now" }], understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Repair leaking water tank', state: 'understood' }, scope: { label: 'Issue', value: 'Leak source described', state: 'candidate' } }, agentState: 'understood', panelTitle: 'Photo & scope', panelMode: 'photo' as PanelMode };
    case 2:
      return { responses: [{ type: 'PHOTO', url: plumbingPhotoUrl, caption: 'Your water tank' }, { type: 'MESSAGE', text: 'The leak looks like it may be around a connection rather than the tank body, but a plumber should confirm that on site.' }, { type: 'MESSAGE', text: 'I can show you plumbers working around your area.' }, { type: 'PROVIDER_CARDS', heading: 'Plumbers who match', providers: plumbingProviders }], understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Repair leaking water tank', state: 'understood' }, scope: { label: 'Issue', value: 'Leak source described', state: 'understood' } }, agentState: 'understood', panelTitle: 'Matching plumbers', panelMode: 'providers' as PanelMode };
    case 3: { const p = plumbingProviders.find((x) => x.id === selectedProviderId) || plumbingProviders[0]; return { responses: [{ type: 'ACTION_CONFIRMATION', action: `${p.name} selected`, detail: "I'll keep them in mind." }, { type: 'MESSAGE', text: `${p.name.split(' ')[0]} looks like the plumber you want. Would you like to agree on a time for them to come and inspect?` }, { type: 'DATE_PICKER', label: 'When would you like the plumber to visit?' }], understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Repair leaking water tank', state: 'understood' }, scope: { label: 'Issue', value: 'Leak source described', state: 'understood' }, location: { label: 'Location', value: 'Nairobi area', state: 'understood' }, people: { label: 'People', value: `You — customer\n${p.name} — provider`, state: 'candidate' }, price: { label: 'Price', value: 'KES 3,000 visit (est.)', state: 'candidate' } }, agentState: 'understood', panelTitle: 'What SecurePay understands', panelMode: 'understanding' }; }
    case 4:
      return { responses: [{ type: 'MESSAGE', text: 'Got it — a visit before the end of the week.' }, { type: 'AGREEMENT_PREVIEW', title: 'Tank repair with Samuel', what: ['Inspect tank and identify leak', 'Replace seal or affected section', 'Test for leaks after repair'], who: [{ name: 'Samuel', role: 'Plumber' }, { name: 'You', role: 'Customer' }], money: { amount: 'KES 3,000 visit + parts', note: 'Parts priced after inspection' }, when: 'Visit before end of week', stillToSettle: ['Exact cost of parts after inspection', 'Warranty on the repair work'] }], understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Repair leaking water tank', state: 'understood' }, scope: { label: 'Issue', value: 'Leak source described', state: 'understood' }, location: { label: 'Location', value: 'Nairobi area', state: 'understood' }, people: { label: 'People', value: 'You — customer\nSamuel Otieno — provider', state: 'understood' }, price: { label: 'Price', value: 'KES 3,000 visit + parts', state: 'understood' }, timing: { label: 'Timing', value: 'Visit before end of week', state: 'understood' } }, agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement' as PanelMode };
    default:
      return { responses: [{ type: 'MESSAGE', text: "Anything else you'd like to settle before the plumber comes?" }], understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Repair leaking water tank', state: 'understood' }, scope: { label: 'Issue', value: 'Leak source described', state: 'understood' }, location: { label: 'Location', value: 'Nairobi area', state: 'understood' }, people: { label: 'People', value: 'You — customer\nSamuel Otieno — provider', state: 'understood' }, price: { label: 'Price', value: 'KES 3,000 visit + parts', state: 'understood' }, timing: { label: 'Timing', value: 'Visit before end of week', state: 'understood' } }, agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement' as PanelMode };
  }
}

// ─── Electrical journey ──────────────────────────────────

function electricalJourney(step: number, _message: string, selectedProviderId: string | null): AgentReply | null {
  switch (step) {
    case 0:
      return { responses: [{ type: 'MESSAGE', text: 'Sure. How many sockets are affected, and are any of them completely dead or just intermittent?' }], understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Repair house sockets', state: 'understood' } }, agentState: 'thinking', panelTitle: 'What SecurePay understands', panelMode: 'understanding' };
    case 1:
      return { responses: [{ type: 'MESSAGE', text: 'That helps. Socket faults can be a wiring issue, a breaker problem, or the sockets themselves. I can show you electricians who work in your area.' }, { type: 'PROVIDER_CARDS', heading: 'Matching electricians', providers: electricalProviders }], understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Repair house sockets', state: 'understood' }, scope: { label: 'Scope', value: 'Socket count described', state: 'candidate' } }, agentState: 'understood', panelTitle: 'Matching electricians', panelMode: 'providers' as PanelMode };
    case 2: { const p = electricalProviders.find((x) => x.id === selectedProviderId) || electricalProviders[0]; return { responses: [{ type: 'ACTION_CONFIRMATION', action: `${p.name} selected`, detail: "I'll keep them in mind." }, { type: 'MESSAGE', text: `${p.name.split(' ')[0]} looks like the electrician you want. Would you like to agree on a time for them to come and inspect?` }, { type: 'DATE_PICKER', label: 'When would you like the electrician to visit?' }], understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Repair house sockets', state: 'understood' }, scope: { label: 'Scope', value: 'Socket count described', state: 'understood' }, location: { label: 'Location', value: 'Nairobi area', state: 'understood' }, people: { label: 'People', value: `You — customer\n${p.name} — provider`, state: 'candidate' }, price: { label: 'Price', value: 'KES 2,500 visit (est.)', state: 'candidate' } }, agentState: 'understood', panelTitle: 'What SecurePay understands', panelMode: 'understanding' }; }
    case 3:
      return { responses: [{ type: 'MESSAGE', text: 'Got it.' }, { type: 'AGREEMENT_PREVIEW', title: 'Socket repair with David', what: ['Inspect affected sockets', 'Diagnose fault', 'Repair or replace affected sockets'], who: [{ name: 'David', role: 'Electrician' }, { name: 'You', role: 'Customer' }], money: { amount: 'KES 2,500 visit + parts', note: 'Parts priced after diagnosis' }, when: 'Visit this week', stillToSettle: ['Total cost if multiple sockets need replacement', 'Whether a full wiring inspection is needed'] }], understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Repair house sockets', state: 'understood' }, scope: { label: 'Scope', value: 'Socket count described', state: 'understood' }, location: { label: 'Location', value: 'Nairobi area', state: 'understood' }, people: { label: 'People', value: 'You — customer\nDavid Kiprop — provider', state: 'understood' }, price: { label: 'Price', value: 'KES 2,500 visit + parts', state: 'understood' }, timing: { label: 'Timing', value: 'Visit this week', state: 'understood' } }, agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement' as PanelMode };
    default:
      return { responses: [{ type: 'MESSAGE', text: 'If the fault turns out to be a wiring issue, that would change the scope.' }], understanding: { ...emptyUnderstanding, job: { label: 'Job', value: 'Repair house sockets', state: 'understood' }, scope: { label: 'Scope', value: 'Socket count described', state: 'understood' }, location: { label: 'Location', value: 'Nairobi area', state: 'understood' }, people: { label: 'People', value: 'You — customer\nDavid Kiprop — provider', state: 'understood' }, price: { label: 'Price', value: 'KES 2,500 visit + parts', state: 'understood' }, timing: { label: 'Timing', value: 'Visit this week', state: 'understood' } }, agentState: 'understood', panelTitle: 'Agreement taking shape', panelMode: 'agreement' as PanelMode };
  }
}

// ─── Open / unknown intent ───────────────────────────────

// ─── Recipient journey (Peter receives SecureLink) ─────

const recipientChoiceSteps: Record<string, number> = {
  continue_review: 1, not_me: 99,
  confirm_identity: 2, use_another: 1,
  join_agreement: 3, leave: 99,
  confirm_acceptance: 4, need_change: 5,
  review_latest: 1,
  // From v2 review (step 5), confirming acceptance establishes the agreement
  // need_change from v2 stays at 5 for another round
};

function recipientJourney(step: number, _message: string, _selectedProviderId: string | null): AgentReply | null {
  const understood: Understanding = {
    ...emptyUnderstanding,
    job: { label: 'Agreement', value: 'Bathroom retiling', state: 'understood' },
    people: { label: 'Your role', value: 'Provider', state: 'understood' },
    price: { label: 'Labour', value: 'KES 68,000', state: 'understood' },
    timing: { label: 'Completion', value: 'By 20 October 2026', state: 'understood' },
    materials: { label: 'Materials', value: 'Customer supplies', state: 'understood' },
  };

  switch (step) {
    case 0: // Recipient review — invitation
      return {
        responses: [
          {
            type: 'RECIPIENT_REVIEW',
            inviterName: 'James',
            title: 'Bathroom retiling',
            role: 'Provider',
            labour: 'KES 68,000',
            materials: 'Customer supplies tiles, adhesive and grout',
            completion: 'By 20 October 2026',
            primaryLabel: 'Continue',
            primaryValue: 'continue_review',
            secondaryLabel: 'Not me / I wasn\'t expecting this',
            secondaryValue: 'not_me',
          },
        ],
        understanding: understood,
        agentState: 'needs_you',
        panelTitle: 'You\'ve been invited',
        panelMode: 'recipientReview',
      };
    case 1: // Recipient authentication
      return {
        responses: [
          {
            type: 'SECURE_AUTH',
            title: 'Confirm who you are',
            identityName: 'Peter Mwangi',
            identityKsn: 'KS007••••',
            reason: 'Confirm who you are before joining this agreement.',
            fields: [
              { label: 'KSNumber', placeholder: 'KS007...', type: 'text' },
              { label: 'Password', placeholder: '••••••••', type: 'password' },
              { label: 'OTP', placeholder: 'Enter code', type: 'otp' },
            ],
            primaryLabel: 'Confirm identity',
            primaryValue: 'confirm_identity',
            secondaryLabel: 'Use another identity',
            secondaryValue: 'use_another',
          },
        ],
        understanding: understood,
        agentState: 'needs_you',
        panelTitle: 'Secure identity',
        panelMode: 'secureAuth',
      };
    case 2: // Join agreement
      return {
        responses: [
          { type: 'MESSAGE', text: 'Identity confirmed.' },
          {
            type: 'JOIN_PROMPT',
            title: 'Join agreement',
            text: 'Joining connects you as the intended participant. It does not mean you agree to the terms yet.',
            primaryLabel: 'Join agreement',
            primaryValue: 'join_agreement',
            secondaryLabel: 'Leave',
            secondaryValue: 'leave',
          },
        ],
        understanding: understood,
        agentState: 'needs_you',
        panelTitle: 'Join agreement',
        panelMode: 'join',
      };
    case 3: // Joined status + exact version review
      return {
        responses: [
          {
            type: 'JOINED_STATUS',
            title: 'You\'ve joined',
            text: 'Now review the exact agreement version before deciding whether you agree.',
            status: 'Joined — Not yet confirmed',
          },
          {
            type: 'CANONICAL_AGREEMENT',
            title: 'Bathroom retiling with Peter Mwangi',
            version: 'Demo v1',
            status: 'Set by James — waiting for Peter',
            parties: [{ name: 'James Kimani', role: 'Customer' }, { name: 'Peter Mwangi', role: 'Provider' }],
            work: ['Remove old bathroom floor and wall tiles', 'Dispose of removed tiles', 'Prepare surfaces', 'Install replacement tiles'],
            price: 'KES 68,000 labour',
            materials: 'Customer supplies tiles, adhesive and grout',
            completion: 'By 20 October 2026',
            worthSettling: [
              { label: 'Defect correction', detail: 'Not yet settled.' },
              { label: 'Payment timing', detail: 'Not yet settled.' },
            ],
            mustSettle: [],
            primaryLabel: 'Yes, this is what I agree to',
            primaryValue: 'confirm_acceptance',
            secondaryLabel: 'I need something changed',
            secondaryValue: 'need_change',
          },
        ],
        understanding: understood,
        agentState: 'needs_you',
        panelTitle: 'Agreement review',
        panelMode: 'canonicalReview',
      };
    case 4: // Agreement established — only after both parties confirmed the current version
      return {
        responses: [
          {
            type: 'AGREEMENT_ESTABLISHED',
            title: 'Bathroom retiling with Peter Mwangi',
            work: 'Bathroom retiling',
            price: 'KES 68,000 labour',
            completion: 'By 24 October 2026',
            materials: 'Customer supplies',
            status: 'Agreed — Demo v2 confirmed by both parties',
          },
          {
            type: 'MONEY_READY',
            title: 'When you\'re ready',
            text: 'SecurePay can show the payment options available for this agreement.',
            agreementRef: 'Bathroom retiling with Peter Mwangi — KES 68,000',
          },
        ],
        understanding: understood,
        agentState: 'understood',
        panelTitle: 'Agreement established',
        panelMode: 'established',
      };
    case 5: // Change request — creates Demo v2, invalidates v1 review
      return {
        responses: [
          {
            type: 'CHANGE_REQUEST',
            title: 'Change requested by Peter',
            changes: [{ label: 'Completion date', from: '20 Oct', to: '24 Oct' }],
          },
          { type: 'MESSAGE', text: 'Peter can do the work, but completion needs to be 24 October. Demo v1 is no longer the current version. The initiator must review and set Demo v2 before Peter can confirm it.' },
          {
            type: 'VERSION_UPDATE',
            title: 'Version updated',
            version: 'Demo v2',
            note: 'The previous review no longer applies. No v1 confirmation or review state carries into v2. Both parties must review and confirm the current version (Demo v2) as required.',
          },
          {
            type: 'CANONICAL_AGREEMENT',
            title: 'Bathroom retiling with Peter Mwangi',
            version: 'Demo v2',
            status: 'New version — previous review no longer applies',
            parties: [{ name: 'James Kimani', role: 'Customer' }, { name: 'Peter Mwangi', role: 'Provider' }],
            work: ['Remove old bathroom floor and wall tiles', 'Dispose of removed tiles', 'Prepare surfaces', 'Install replacement tiles'],
            price: 'KES 68,000 labour',
            materials: 'Customer supplies tiles, adhesive and grout',
            completion: 'By 24 October 2026',
            worthSettling: [
              { label: 'Defect correction', detail: 'Not yet settled.' },
              { label: 'Payment timing', detail: 'Not yet settled.' },
            ],
            mustSettle: [],
            primaryLabel: 'Yes, this is what I agree to',
            primaryValue: 'confirm_acceptance',
            secondaryLabel: 'I need something changed',
            secondaryValue: 'need_change',
          },
        ],
        understanding: { ...understood, timing: { label: 'Completion', value: 'Proposed: 24 October 2026', state: 'candidate' } },
        agentState: 'needs_you',
        panelTitle: 'Review Demo v2',
        panelMode: 'canonicalReview',
      };
    case 99: // Wrong recipient / leave
      return {
        responses: [
          {
            type: 'ERROR_STATE',
            title: 'This isn\'t for you',
            text: 'If you weren\'t expecting this invitation, please contact the person who sent it to you. No action has been taken.',
            primaryLabel: 'Back to home',
            primaryValue: 'back_home',
          },
        ],
        understanding: emptyUnderstanding,
        agentState: 'resting',
        panelTitle: 'Not for you',
        panelMode: 'error',
      };
    default:
      return { responses: [{ type: 'MESSAGE', text: 'Is there anything else you would like to review?' }], understanding: understood, agentState: 'understood', panelTitle: 'Agreement review', panelMode: 'canonicalReview' };
  }
}

function openJourney(step: number, _message: string, _selectedProviderId: string | null): AgentReply | null {
  switch (step) {
    case 0:
      return { responses: [{ type: 'MESSAGE', text: 'Of course. Tell me what is happening.' }], understanding: emptyUnderstanding, agentState: 'listening', panelTitle: 'What SecurePay understands', panelMode: 'understanding' };
    default:
      return { responses: [{ type: 'MESSAGE', text: 'I can help you find someone for a job, organize a contribution, start a chama, review a quotation, or look for something to buy. What would you like to do?' }], understanding: emptyUnderstanding, agentState: 'listening', panelTitle: 'What SecurePay understands', panelMode: 'understanding' };
  }
}

// ─── Journey dispatcher ──────────────────────────────────

function getJourney(intent: Intent) {
  switch (intent) {
    case 'tiling': return tilingJourney;
    case 'plumbing': return plumbingJourney;
    case 'electrical': return electricalJourney;
    case 'purchase': return purchaseJourney;
    case 'funeral': return funeralJourney;
    case 'chama': return chamaJourney;
    case 'document': return documentJourney;
    case 'retrieval': return retrievalJourney;
    case 'recipient': return recipientJourney;
    case 'open': return openJourney;
  }
}

// ─── Choice → step mappings ──────────────────────────────

const tilingChoiceSteps: Record<string, number> = {
  show_price: 3, show_providers: 4, define_more: 4, ask_difference: 5,
  compare_all: 6, view_peter: 7, view_david: 7, view_mutua: 7,
  back_to_results: 4, talk_to_peter: 8, view_peter_work: 7,
  back_to_comparison: 6, keep_defining: 7,
  keep_talking: 10, review_agreement: 10, continue_with_this: 11,
  compare_materials: 13, show_community: 14, show_map: 15,
  back_to_agreement: 10,
  continue_securely: 12, confirm_identity: 20, use_another: 12,
  set_securely: 21, back_to_review: 20, send_to_peter: 22,
};

const funeralChoiceSteps: Record<string, number> = {
  set_target: 2, have_number: 2, keep_talking: 3,
  continue_with_this: 4, confirm_identity: 5, use_another: 4,
};

const purchaseChoiceSteps: Record<string, number> = {
  keep_talking: 2, continue_with_this: 3,
  confirm_identity: 4, use_another: 3,
};

const chamaChoiceSteps: Record<string, number> = {
  set_governance: 2, keep_talking: 2,
  continue_with_this: 3, confirm_identity: 4, use_another: 3,
};

const documentChoiceSteps: Record<string, number> = {
  use_details: 2, keep_reviewing: 1,
  keep_talking: 2, continue_with_this: 3,
  confirm_identity: 4, use_another: 3,
};

const retrievalChoiceSteps: Record<string, number> = {
  ask_defects: 1, show_payments: 1, show_documents: 1, open_agreement: 1,
};

const plumbingChoiceSteps: Record<string, number> = {
  view_kamau: 2, find_others: 1,
};

function getChoiceSteps(intent: Intent): Record<string, number> | null {
  switch (intent) {
    case 'tiling': return tilingChoiceSteps;
    case 'funeral': return funeralChoiceSteps;
    case 'purchase': return purchaseChoiceSteps;
    case 'chama': return chamaChoiceSteps;
    case 'document': return documentChoiceSteps;
    case 'retrieval': return retrievalChoiceSteps;
    case 'plumbing': return plumbingChoiceSteps;
    case 'recipient': return recipientChoiceSteps;
    default: return null;
  }
}

// ─── Public adapter ─────────────────────────────────────

export const mockAgent = {
  detectIntent,

  respond(message: string, context: ConversationContext): AgentReply {
    let intent = context.intent;
    let step = context.step;
    if (!intent) { intent = detectIntent(message); step = 0; }
    else { step = context.step + 1; }
    const journeyFn = getJourney(intent);
    const reply = journeyFn(step, message, context.selectedProviderId);
    if (!reply) return { responses: [{ type: 'MESSAGE', text: 'Tell me a little more about what you are trying to get done.' }], understanding: emptyUnderstanding, agentState: 'listening', panelTitle: 'What SecurePay understands', panelMode: 'understanding' };
    return reply;
  },

  respondToPhotoUpload(context: ConversationContext): AgentReply {
    const intent = context.intent || 'tiling';
    const step = context.step + 1;
    const journeyFn = getJourney(intent);
    const reply = journeyFn(step, '', context.selectedProviderId);
    if (!reply) return { responses: [{ type: 'MESSAGE', text: 'Thanks for the photo.' }], understanding: emptyUnderstanding, agentState: 'listening', panelTitle: 'What SecurePay understands', panelMode: 'understanding' };
    return reply;
  },

  respondToSkipPhoto(context: ConversationContext): AgentReply {
    const intent = context.intent || 'tiling';
    const step = context.step + 1;
    const journeyFn = getJourney(intent);
    const reply = journeyFn(step, '', context.selectedProviderId);
    if (!reply) return { responses: [{ type: 'MESSAGE', text: 'No problem. We can come back to that.' }], understanding: emptyUnderstanding, agentState: 'listening', panelTitle: 'What SecurePay understands', panelMode: 'understanding' };
    if (reply) reply.responses = reply.responses.filter((r) => r.type !== 'PHOTO');
    return reply;
  },

  respondToChoice(choice: string, context: ConversationContext): AgentReply {
    const intent = context.intent || 'tiling';
    let step: number;
    const choiceSteps = getChoiceSteps(intent);
    if (choiceSteps && choiceSteps[choice] !== undefined) {
      step = choiceSteps[choice];
      if (choice === 'talk_to_peter') context.selectedProviderId = 'tile-p1';
    } else {
      step = context.step + 1;
    }
    const journeyFn = getJourney(intent);
    const reply = journeyFn(step, '', context.selectedProviderId);
    if (!reply) return { responses: [{ type: 'MESSAGE', text: 'Got it. What would you like to do next?' }], understanding: emptyUnderstanding, agentState: 'understood', panelTitle: 'What SecurePay understands', panelMode: 'understanding' };
    return reply;
  },

  respondToProviderSelect(providerId: string, context: ConversationContext): AgentReply {
    const intent = context.intent || 'tiling';
    let step: number;
    if (intent === 'tiling') step = 7;
    else if (intent === 'plumbing') step = 3;
    else step = 2;
    const journeyFn = getJourney(intent);
    const reply = journeyFn(step, '', providerId);
    if (!reply) return { responses: [{ type: 'MESSAGE', text: 'Got it.' }], understanding: emptyUnderstanding, agentState: 'understood', panelTitle: 'What SecurePay understands', panelMode: 'understanding' };
    return reply;
  },

  advanceToQuote(context: ConversationContext): AgentReply {
    const intent = context.intent || 'tiling';
    const journeyFn = getJourney(intent);
    const reply = journeyFn(9, '', context.selectedProviderId);
    if (!reply) return { responses: [{ type: 'MESSAGE', text: 'Peter will get back to you shortly.' }], understanding: emptyUnderstanding, agentState: 'understood', panelTitle: 'What SecurePay understands', panelMode: 'understanding' };
    return reply;
  },

  advanceToAgreement(context: ConversationContext): AgentReply {
    const intent = context.intent || 'tiling';
    const journeyFn = getJourney(intent);
    const reply = journeyFn(10, '', context.selectedProviderId);
    if (!reply) return { responses: [{ type: 'MESSAGE', text: 'Here is what we have so far.' }], understanding: emptyUnderstanding, agentState: 'understood', panelTitle: 'What SecurePay understands', panelMode: 'understanding' };
    return reply;
  },

  advanceToIdentity(context: ConversationContext): AgentReply {
    const intent = context.intent || 'tiling';
    const journeyFn = getJourney(intent);
    const stepMap: Partial<Record<Intent, number>> = { tiling: 12, funeral: 4, purchase: 3, chama: 3, document: 3 };
    const step = stepMap[intent] ?? 12;
    const reply = journeyFn(step, '', context.selectedProviderId);
    if (!reply) return { responses: [{ type: 'MESSAGE', text: 'Let me know when you are ready to continue.' }], understanding: emptyUnderstanding, agentState: 'needs_you', panelTitle: 'What SecurePay understands', panelMode: 'understanding' };
    return reply;
  },

  advanceToMoney(context: ConversationContext): AgentReply {
    const intent = context.intent || 'tiling';
    const journeyFn = getJourney(intent);
    const stepMap: Partial<Record<Intent, number>> = { tiling: 15, funeral: 5, purchase: 4, chama: 4, document: 4 };
    const step = stepMap[intent] ?? 15;
    const reply = journeyFn(step, '', context.selectedProviderId);
    if (!reply) return { responses: [{ type: 'MESSAGE', text: 'You have a reviewed agreement.' }], understanding: emptyUnderstanding, agentState: 'understood', panelTitle: 'What SecurePay understands', panelMode: 'understanding' };
    return reply;
  },
};
