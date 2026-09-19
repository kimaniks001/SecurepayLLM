import type {
  ReferralEvaluation, PlugProfile, MasterProfile, MasterRequest, MasterOpinion,
  PartnerProfile, Solution, SourceReference,
} from './types';

// ─── Referral evaluations ───────────────────

export const demoReferralEvaluations: ReferralEvaluation[] = [
  {
    referralId: 'ref-1',
    introductionId: 'intro-1',
    candidateStatus: 'qualified',
    qualificationStatus: 'qualified',
    reasonCodes: ['Introduction led to trade', 'Trade resulted in agreement'],
    evaluatedAt: '2 hours ago',
    rewardStatus: 'eligible_pending',
  },
  {
    referralId: 'ref-2',
    introductionId: 'intro-2',
    candidateStatus: 'candidate',
    qualificationStatus: 'not_evaluated',
    rewardStatus: 'not_eligible',
  },
];

// ─── Plugs ───────────────────

export const demoPlugs: PlugProfile[] = [
  {
    id: 'plug-peter',
    identity: 'Peter Mwangi',
    serviceArea: 'Nairobi',
    connectionDomains: ['construction', 'plumbing', 'painting', 'general renovation'],
    availability: 'Available',
    publicProvenance: 'Community member · Construction Circle member',
    status: 'active',
    businessAssociation: 'Nairobi Painters Co.',
    language: 'English, Swahili',
  },
  {
    id: 'plug-grace',
    identity: 'Grace Wanjiku',
    serviceArea: 'Nairobi, Westlands',
    connectionDomains: ['electrical', 'solar', 'inspections'],
    availability: 'Available',
    publicProvenance: 'Community member · Creative Professionals Circle',
    status: 'active',
    language: 'English, Swahili',
  },
];

// ─── Masters ───────────────────

export const demoMasters: MasterProfile[] = [
  {
    id: 'master-mwiti',
    identity: 'Mwiti Kamau',
    expertise: ['structural engineering', 'crack assessment', 'construction inspection'],
    qualificationRefs: ['BSc Civil Engineering', 'Registered Engineer — demonstration'],
    accreditationRefs: ['Engineers Board of Kenya — demonstration'],
    serviceArea: 'Nairobi, Kiambu',
    availability: 'Available for site visits',
    pricingBasis: 'From KES 15,000 per inspection',
    inspectionCapability: true,
    status: 'active',
  },
  {
    id: 'master-amani',
    identity: 'Amani Otieno',
    expertise: ['waterproofing', 'tiling inspection', 'bathroom construction'],
    qualificationRefs: ['Diploma in Building Construction'],
    accreditationRefs: [],
    serviceArea: 'Nairobi',
    availability: 'Available',
    pricingBasis: 'From KES 8,000 per inspection',
    inspectionCapability: true,
    status: 'active',
  },
];

// ─── Master request (demo) ───────────────────

export const demoMasterRequest: MasterRequest = {
  requestId: 'mr-1',
  question: 'Does the observed bathroom tiling work meet the agreed handover condition?',
  scope: 'Inspect bathroom retiling work against Agreement v2, Milestone 3 handover condition. Assess tile adhesion, grouting, waterproofing, and overall finish quality.',
  evidenceRefs: ['3 photos of completed tiling', 'Handover checklist'],
  siteVisitRequirement: true,
  cost: 'KES 12,000',
  appointmentStatus: 'proposed',
};

// ─── Master opinion (demo) ───────────────────

export const demoMasterOpinion: MasterOpinion = {
  opinionId: 'mo-1',
  masterIdentity: 'Amani Otieno',
  scope: 'Bathroom retiling inspection — Agreement v2, Milestone 3',
  sourceAgreementVersion: 'v2',
  question: 'Does the observed bathroom tiling work meet the agreed handover condition?',
  observations: [
    'Tile adhesion appears satisfactory across 90% of surfaces.',
    'Two areas near the drain show hollow-sounding tiles — possible adhesion failure.',
    'Waterproofing membrane was inspected before tiling and appeared intact.',
    'Grouting is even with no visible gaps.',
  ],
  opinion: 'The work substantially meets the handover condition, except for the two tiles near the drain which should be re-adhered before final sign-off.',
  limitations: [
    'Inspection was visual only — no destructive testing was performed.',
    'Opinion does not constitute a statutory certification.',
    'Opinion does not automatically change the Agreement or release Money.',
  ],
  createdAt: '1 hour ago',
  provenance: 'Master opinion from Amani Otieno — waterproofing and tiling inspection',
};

// ─── Partners ───────────────────

export const demoPartners: PartnerProfile[] = [
  {
    partnerId: 'partner-abc-inspection',
    identity: 'ABC Inspection Ltd',
    partnerType: 'inspection_firm',
    institutionalStatus: 'Registered inspection firm — demonstration',
    accreditationRefs: ['KEBS accredited — demonstration'],
    serviceAreas: ['Nairobi', 'Kiambu'],
    solutions: ['sol-inspection-construction', 'sol-inspection-electrical'],
    contactPath: 'Contact through SecurePay',
  },
  {
    partnerId: 'partner-xyz-valuation',
    identity: 'XYZ Valuation Services',
    partnerType: 'valuation_firm',
    institutionalStatus: 'Registered valuer — demonstration',
    accreditationRefs: ['Valuers Registration Board — demonstration'],
    serviceAreas: ['Nationwide'],
    solutions: ['sol-valuation-property'],
  },
  {
    partnerId: 'partner-sacco-fundi',
    identity: 'Fundi SACCO',
    partnerType: 'sacco',
    institutionalStatus: 'Registered SACCO — demonstration',
    accreditationRefs: ['SASRA registered — demonstration'],
    serviceAreas: ['Nairobi'],
    solutions: ['sol-funding-construction'],
  },
  {
    partnerId: 'partner-jamii-insure',
    identity: 'Jamii Insurance',
    partnerType: 'insurer',
    institutionalStatus: 'Licensed insurer — demonstration',
    accreditationRefs: ['IRA licensed — demonstration'],
    serviceAreas: ['Nationwide'],
    solutions: ['sol-insure-construction'],
  },
];

// ─── Solutions ───────────────────

export const demoSolutions: Solution[] = [
  {
    solutionId: 'sol-inspection-construction',
    partnerId: 'partner-abc-inspection',
    partnerName: 'ABC Inspection Ltd',
    solutionType: 'inspect',
    title: 'Construction Inspection Service',
    description: 'Professional inspection of construction work against agreed milestones and handover conditions. Visual inspection with detailed report.',
    requirements: ['Agreement reference', 'Milestone to inspect', 'Site access'],
    pricingType: 'from',
    price: 'From KES 10,000',
    serviceArea: 'Nairobi, Kiambu',
    timing: 'Within 2 days of appointment',
    status: 'available',
    provenance: 'From ABC Inspection Ltd — KEBS accredited (demo)',
    whatItCanEstablish: 'Whether observed work meets stated handover conditions at time of inspection.',
    whatItCannotEstablish: 'Statutory certification, structural certification, or automatic Agreement completion.',
  },
  {
    solutionId: 'sol-valuation-property',
    partnerId: 'partner-xyz-valuation',
    partnerName: 'XYZ Valuation Services',
    solutionType: 'value',
    title: 'Property Valuation',
    description: 'Professional property valuation for land and buildings. Includes valuation report suitable for transaction support.',
    requirements: ['Title document', 'Site access', 'Purpose of valuation'],
    pricingType: 'quote_required',
    price: 'Quote required',
    serviceArea: 'Nationwide',
    timing: '3-5 working days',
    status: 'quote_required',
    provenance: 'From XYZ Valuation Services — Valuers Registration Board (demo)',
    whatItCanEstablish: 'Estimated market value of property at time of inspection.',
    whatItCannotEstablish: 'Loan approval, automatic purchase price, or binding transaction terms.',
  },
  {
    solutionId: 'sol-funding-construction',
    partnerId: 'partner-sacco-fundi',
    partnerName: 'Fundi SACCO',
    solutionType: 'fund',
    title: 'Construction Project Funding',
    description: 'Explore funding options for construction projects through SACCO facilities. Eligibility and terms determined by the SACCO.',
    requirements: ['Project description', 'Agreement reference where applicable', 'SACCO membership or eligibility check'],
    pricingType: 'quote_required',
    price: 'Quote required',
    serviceArea: 'Nairobi',
    timing: 'Application review 5-7 days',
    status: 'quote_required',
    provenance: 'From Fundi SACCO — SASRA registered (demo)',
    whatItCanEstablish: 'Available funding products and terms — if the SACCO approves.',
    whatItCannotEstablish: 'Loan approval, interest rate, or credit eligibility before the SACCO evaluates.',
  },
  {
    solutionId: 'sol-insure-construction',
    partnerId: 'partner-jamii-insure',
    partnerName: 'Jamii Insurance',
    solutionType: 'insure',
    title: 'Construction Insurance',
    description: 'Explore insurance coverage for construction projects. Coverage and premiums determined by the insurer.',
    requirements: ['Project description', 'Project value', 'Site details'],
    pricingType: 'quote_required',
    price: 'Quote required',
    serviceArea: 'Nationwide',
    timing: 'Quote within 3 days',
    status: 'quote_required',
    provenance: 'From Jamii Insurance — IRA licensed (demo)',
    whatItCanEstablish: 'Available insurance products and premiums — if the insurer approves.',
    whatItCannotEstablish: 'Active coverage, claim guarantee, or policy terms before the insurer issues a policy.',
  },
  {
    solutionId: 'sol-inspection-electrical',
    partnerId: 'partner-abc-inspection',
    partnerName: 'ABC Inspection Ltd',
    solutionType: 'inspect',
    title: 'Electrical Installation Inspection',
    description: 'Inspection of electrical installation work against safety standards and agreed specifications.',
    requirements: ['Agreement reference', 'Installation to inspect', 'Site access'],
    pricingType: 'from',
    price: 'From KES 8,000',
    serviceArea: 'Nairobi, Kiambu',
    timing: 'Within 2 days',
    status: 'available',
    provenance: 'From ABC Inspection Ltd — KEBS accredited (demo)',
    whatItCanEstablish: 'Whether observed electrical work meets stated safety standards at time of inspection.',
    whatItCannotEstablish: 'Statutory certification or automatic Agreement completion.',
  },
];

// ─── Lookup helpers ───────────────────

export function getPlugById(id: string): PlugProfile | undefined {
  return demoPlugs.find((p) => p.id === id);
}

export function getMasterById(id: string): MasterProfile | undefined {
  return demoMasters.find((m) => m.id === id);
}

export function getPartnerById(id: string): PartnerProfile | undefined {
  return demoPartners.find((p) => p.partnerId === id);
}

export function getSolutionById(id: string): Solution | undefined {
  return demoSolutions.find((s) => s.solutionId === id);
}

export function getSolutionsByType(type: Solution['solutionType']): Solution[] {
  return demoSolutions.filter((s) => s.solutionType === type);
}

// ─── Source reference builders for ecosystem ───────────────────

export function createSourceFromSolution(solutionId: string): SourceReference {
  const sol = getSolutionById(solutionId);
  if (!sol) throw new Error('Solution not found');
  return {
    sourceReferenceId: `src-sol-${solutionId}`,
    sourceType: 'solution',
    sourceId: sol.solutionId,
    sourceOwnerIdentity: sol.partnerName,
    sourceActingCapacity: 'business',
    sourceSnapshot: [
      { label: 'Solution', value: sol.title },
      { label: 'Partner', value: sol.partnerName },
      { label: 'Type', value: sol.solutionType },
      ...(sol.price ? [{ label: 'Price', value: sol.price }] : []),
    ],
    sourceProvenance: `Started from ${sol.partnerName} — ${sol.title}`,
    sourceTimestamp: new Date().toISOString(),
    adoptedCandidateFacts: [
      { label: 'Solution', value: sol.title, provenance: `From ${sol.partnerName} Solution`, isAdopted: true },
      { label: 'Provider', value: sol.partnerName, provenance: 'From Partner profile', isAdopted: true },
      ...(sol.price ? [{ label: 'Price basis', value: sol.price, provenance: `From Solution — not yet agreed`, isAdopted: true }] : []),
    ],
    sourceStatus: sol.status,
    sourceChanged: false,
  };
}

export function createSourceFromMasterOpinion(opinionId: string): SourceReference {
  const opinion = demoMasterOpinion.opinionId === opinionId ? demoMasterOpinion : null;
  if (!opinion) throw new Error('Opinion not found');
  return {
    sourceReferenceId: `src-mo-${opinionId}`,
    sourceType: 'master_opinion',
    sourceId: opinion.opinionId,
    sourceOwnerIdentity: opinion.masterIdentity,
    sourceSnapshot: [
      { label: 'Master', value: opinion.masterIdentity },
      { label: 'Question', value: opinion.question },
    ],
    sourceProvenance: `Started from Master opinion by ${opinion.masterIdentity} — does not automatically change Agreement`,
    sourceTimestamp: new Date().toISOString(),
    adoptedCandidateFacts: [
      { label: 'Opinion', value: opinion.opinion, provenance: `From Master opinion — not binding`, isAdopted: true },
    ],
    sourceStatus: 'delivered',
    sourceChanged: false,
  };
}

export function createSourceFromPlugIntroduction(plugId: string, introducedParty: string): SourceReference {
  const plug = getPlugById(plugId);
  if (!plug) throw new Error('Plug not found');
  return {
    sourceReferenceId: `src-plug-${plugId}`,
    sourceType: 'plug_introduction',
    sourceId: plugId,
    sourceOwnerIdentity: plug.identity,
    sourceActingCapacity: 'personal',
    sourceIntroducerIdentity: plug.identity,
    selectedCounterpartyIdentity: introducedParty,
    sourceSnapshot: [
      { label: 'Plug', value: plug.identity },
      { label: 'Introduced', value: introducedParty },
    ],
    sourceProvenance: `Introduced by ${plug.identity} (Plug) — ${introducedParty} selected as potential counterparty`,
    sourceTimestamp: new Date().toISOString(),
    adoptedCandidateFacts: [
      { label: 'Selected counterparty', value: introducedParty, provenance: `Introduced by Plug: ${plug.identity}`, isAdopted: true },
    ],
    sourceStatus: 'active',
    sourceChanged: false,
  };
}

// ─── Ecosystem attention items for Home ───────────────────

export const ecosystemAttentionItems = [
  {
    id: 'eatt-1',
    kind: 'document_review' as const,
    title: 'Master opinion available',
    detail: 'Amani Otieno delivered an opinion on your bathroom tiling inspection',
    actionLabel: 'View opinion',
    actionValue: 'view_opinion',
    agreementId: 'agr-bathroom',
  },
  {
    id: 'eatt-2',
    kind: 'waiting_confirmation' as const,
    title: 'Referral evaluation completed',
    detail: 'Your referral from Peter Mwangi has been evaluated as qualified',
    actionLabel: 'View referral',
    actionValue: 'view_referral',
    agreementId: '',
  },
  {
    id: 'eatt-3',
    kind: 'agreement_changed' as const,
    title: 'Partner quote available',
    detail: 'ABC Inspection Ltd responded to your inspection service enquiry',
    actionLabel: 'View quote',
    actionValue: 'view_quote',
    agreementId: '',
  },
];
