/**
 * Gate 5B is a LOCAL editorial prototype of the existing workspace areas.
 * This data is not an Agreement, a Circle membership or a financial quote.
 * Production authorities continue to live in their existing controllers.
 */
export type Gate5BArea = 'work' | 'vision' | 'circle' | 'community' | 'money';
export type Gate5BExample = 'chama' | 'delivery' | 'water';

export const gate5BAreas = [
  { id: 'work', title: 'My Work', eyebrow: 'Turn intentions into commitments',
    question: 'What are we agreeing to do?',
    meaning: 'KS001 helps the right people clarify facts, responsibilities and conditions. SecurePay Check examines the material facts before anyone accepts an Agreement.',
    privacy: 'The Agreement and its evidence belong to authorised parties, not the public.',
    boundary: 'A draft is not an accepted Agreement. A SecurePay Check is not party acceptance.',
    next: 'Review the proposed terms with KS001.' },
  { id: 'vision', title: 'Vision', eyebrow: 'Your private place to dream and plan',
    question: 'What am I trying to make possible?',
    meaning: 'Collect inspirations, photographs, plans and questions before you are ready to ask anyone to commit.',
    privacy: 'Private by default. Nothing is shared automatically.',
    boundary: 'Saving an idea is not inviting someone, creating an Agreement or approving a payment.',
    next: 'Keep shaping the idea, or choose what to take into My Work.' },
  { id: 'circle', title: 'Circle', eyebrow: 'A smaller group with a common purpose',
    question: 'Who is planning or learning with me?',
    meaning: 'A Circle brings people together around a shared goal. Members can discuss, organise and learn within that Circle.',
    privacy: 'Circle-only content stays inside that Circle under its access rules.',
    boundary: 'A Circle invitation is not membership of Trust Project, an Agreement or acceptance of payment duties.',
    next: 'Agree together what deserves a separate Agreement.' },
  { id: 'community', title: 'Community', eyebrow: 'The wider place to discover and contribute',
    question: 'Where can we find people, knowledge or help?',
    meaning: 'Explore public LIVE stories, opportunities, projects, events and useful connections. Ask questions and discover people who may help.',
    privacy: 'Public LIVE material is separate from private Vision and Circle-only material.',
    boundary: 'Discovering help never exposes Circle conversations or sends an invitation automatically.',
    next: 'Explore, contribute or take a useful idea into private planning.' },
  { id: 'money', title: 'Money', eyebrow: 'Understand options around a real plan',
    question: 'What can I afford, and what choices might help?',
    meaning: 'See your money in relation to Agreements. Explore My Money, Borrow, Invest and Protect without assuming any institution has approved an offer.',
    privacy: 'Your financial information and applications require their own permissions.',
    boundary: 'No funding, cover, quote, bank connection or release follows from a Vision, Circle discussion or draft.',
    next: 'Review the Agreement and the verified financial options separately.' },
] as const;

export const gate5BExamples = [
  { id: 'chama', label: 'Eight friends · Chama', amount: 'KES 2,000 per person, monthly',
    work: 'Prepare a useful chama Agreement: purpose, governance, joining, contribution date, missed payments, decisions and payouts still need answers.',
    vision: '“I would like eight friends to build something together, contributing KES 2,000 every month.” This is one person’s private starting idea.',
    circle: 'Discuss purpose, record keeping and how decisions should work. Invitations are separate; nobody has joined or accepted a contribution yet.',
    community: 'Explore examples of group organisation, ask experienced members for lessons, and discover a Master who may be useful.',
    money: 'KES 16,000 is the potential monthly total, not money collected. Agree on rules and participants before choosing how funds are handled.' },
  { id: 'delivery', label: 'Office chair · Delivery', amount: 'Proposed courier fee: KES 400',
    work: 'KS001 must ask what exactly is being delivered, who collects it, the receiving entrance, time, handover proof and what happens if it fails.',
    vision: 'Keep a chair photo, an indicative budget and questions about delivery in your personal plan.',
    circle: 'Discuss a group buying or delivery idea only with people who choose to take part. A group chat is not a purchase contract.',
    community: 'Discover what couriers, Plugs or experienced traders recommend about secure handover evidence.',
    money: 'KES 400 is a proposed delivery fee. It has not been paid, held, released or approved by any payment provider.' },
  { id: 'water', label: 'Neighbourhood · Water project', amount: 'Budget not yet confirmed',
    work: 'Turn selected tasks into Agreements covering materials, delivery, inspection, responsibility, dates and actual acceptance.',
    vision: 'Collect tank ideas, location photographs, budget possibilities and a sketch of the desired outcome.',
    circle: 'Invite willing neighbours to discuss the project, volunteer roles, scope and governance inside a dedicated Circle.',
    community: 'Find relevant experience, a Master, service opportunities or apprenticeship help without publishing private Circle work.',
    money: 'Compare the funding and protection options after costs and Agreements are understood. No donation, loan or cover exists yet.' },
] as const;

export function gate5BArea(id: Gate5BArea) {
  return gate5BAreas.find(area=>area.id===id) ?? gate5BAreas[0];
}
export function gate5BExample(id: Gate5BExample) {
  return gate5BExamples.find(example=>example.id===id) ?? gate5BExamples[0];
}
export function gate5BPreviewBoundary(area:Gate5BArea, example:Gate5BExample) {
  const data=gate5BArea(area);
  const item=gate5BExample(example);
  return {
    scope:'LOCAL_CONCEPT_ONLY' as const,
    area:data.title,
    example:item.label,
    canPublish:false,
    createsMembership:false,
    createsAgreement:false,
    checksTrade:false,
    acceptsForParties:false,
    canMoveMoney:false,
  };
}
