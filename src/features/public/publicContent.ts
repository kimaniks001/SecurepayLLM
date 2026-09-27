/**
 * Public Experience Convergence Phase 2 -- the public Home's copy, in one place.
 *
 * Contract: docs/PUBLIC_EXPERIENCE_CONVERGENCE_PHASE1.md §6 (chapters), §11 (Trust Project) and §12
 * (Member / Plug / Master). Everything here is static explanation: no counts, no people, no live data, no
 * fixture content. Organizations appear only in purpose language -- no Organization action exists
 * (there is no Organization KS yet), and Join is not live until Phase 4A.
 */

/** The Trust Project's three shared assets (shared with the signed-in `TrustProjectSection`). */
export const PILLARS = [
  {
    title: 'Technologies',
    line: 'Tools that make fair trade practical.',
    detail: 'SecurePay and KS001 to shape clear agreements, a Store for what you offer, SecureLinks to share it, and Community to ask and help. For businesses and builders, Developer / Connect in Account provides SecurePay integration tools such as API credentials and webhooks, managed by the Business that owns them.',
  },
  {
    title: 'Systems',
    line: 'Shared principles and ways of working that make fair trade repeatable.',
    detail: 'The 12 Principles of Fair Trade, turned into practical methods: clear agreements, changes everyone explicitly agrees to, evidence for work done, and honest handling of what is still uncertain.',
  },
  {
    title: 'People',
    line: 'People bringing skills, knowledge, needs and opportunities.',
    detail: 'Members asking and helping in Community LIVE and in Circles, and people who connect or teach. Belonging is not a certificate that someone is trustworthy — trust comes from what people actually do.',
  },
] as const;

/** How The Trust Project started (shared with the signed-in `TrustProjectSection`). */
export const ORIGIN = [
  'The Trust Project began with a practical question: how can trust be made visible, practical and repeatable in ordinary trade?',
  'That work produced the 12 Principles of Fair Trade.',
  'SecurePay was built to turn those principles into tools people could actually use.',
  'Technology alone was not enough — people also need knowledge, connection and one another.',
  'The Trust Project therefore grew into the community around those shared technologies, systems and people.',
] as const;

/** The three public chapters the public navigation can reach. Join is not here until Phase 4A makes it real. */
export const PUBLIC_NAV_SECTIONS: { id: 'how-it-works' | 'trust-project' | 'for-business'; label: string }[] = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'trust-project', label: 'The Trust Project' },
  { id: 'for-business', label: 'For Business' },
];

/** Ch. 4 -- unnamed human possibilities. Each one starts a real conversation through `onStart`. */
export const TRY_ASKING_PROMPTS = [
  'I need someone to repair my roof.',
  "I have a quotation and I don't know if it makes sense.",
  'I need customers.',
  'I have experience I could teach.',
  'I need practical experience.',
  'I need someone who has done this before.',
  'I want to sell what I make.',
  'We are organising something together.',
] as const;

/** Ch. 5 -- how SecurePay works, outcome first. */
export const HOW_IT_WORKS_STEPS = [
  { title: 'Bring what you have.', detail: 'Say it, paste it or attach it.' },
  { title: 'Make it clear together.', detail: 'KS001 shows what it understood and what still needs deciding.' },
  { title: 'Review, confirm, and let money follow.', detail: 'Nothing becomes an agreement until you review and confirm it. Money follows what was agreed.' },
] as const;

export const HOW_IT_WORKS_TRUTH = 'An attachment is never the agreement by itself — you check what KS001 found.';

/**
 * Ch. 7 / §12 -- the three capacities, side by side. Shared with the signed-in `TrustProjectSection` so
 * the meaning never drifts between the public and signed-in explanations. Plug and Master are individual
 * human capacities; people and businesses may belong as Members.
 */
export const CAPACITIES = [
  {
    name: 'Member',
    line: 'Belong and take part.',
    detail: 'People and businesses belong through their own KS Number. Ask, help, learn, offer work, use Community, keep a Store where eligible, discover opportunities, trade, find a Plug or a Master, and share what you know.',
    boundary: 'A quiet Member is still a complete Member.',
  },
  {
    name: 'Plug',
    line: 'Help people use the ecosystem and reach opportunity.',
    detail: 'A person who understands The Trust Project and helps others make useful things happen: getting started, a Store or profile, product photos and listings, finding people, opportunities and Masters, Community research, understanding SecurePay, and practical help in person or online.',
    boundary: 'Paid help is agreed separately. Income is never guaranteed. An invitation is not a referral, and recruiting members earns nothing automatically. Helping never gives a Plug authority over anyone’s agreement or money.',
  },
  {
    name: 'Master',
    line: 'Bring deep practical experience.',
    detail: 'A person with real, demonstrable experience in a field: consultation, a second opinion or Master Opinion, teaching, mentoring, practical sessions, supervised work, apprenticeship, project support or professional work.',
    boundary: 'Paid help is agreed separately. A Master never judges who is right, never changes or confirms an agreement for someone else, and never releases money.',
  },
] as const;

/** Ch. 8 -- six short, unnamed possibilities. Explanations of purpose, never testimonials. */
export const POSSIBILITIES = [
  { title: 'Useful people, easier to find', detail: 'Someone who does good work is easier to find through what they offer and how they trade.' },
  { title: 'A fair deal, made practical', detail: 'Both sides can see what was agreed, and money follows it.' },
  { title: 'Experience passed on', detail: 'Practical knowledge moves from one generation of workers to the next.' },
  { title: 'Real practice for a willing learner', detail: 'Someone who wants to learn a craft gets to practise it alongside people who know it.' },
  { title: 'Opportunity that reaches the right person', detail: 'A need finds someone who can meet it, beyond one person’s own contacts.' },
  { title: 'Working together, staying independent', detail: 'People and businesses cooperate while keeping their own prices, customers and choices.' },
] as const;

/** Ch. 10 -- For Business, truthful to what exists today (no public Business onboarding yet). */
export const FOR_BUSINESS_POINTS = [
  'A Business KS Number of its own, and a Store for what the business offers.',
  'A place in The Trust Project for the business.',
  'Once properly set up, tools to connect SecurePay to the systems the business already uses.',
] as const;
