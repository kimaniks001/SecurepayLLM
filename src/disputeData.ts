import type { DisputeDetail } from './types';

const commonScope = {
  agreementId: 'agr-bathroom',
  agreementTitle: 'Bathroom retiling with Peter Mwangi',
  agreementVersion: 'v2',
  disputedObligation: 'Bathroom tiling workmanship',
  disputedArea: 'Shower-area tiles',
  relatedTerm: 'Defect correction obligation',
  disputedAmount: 'KES 20,000',
  notInDispute: [
    'Other completed tiling work',
    'Materials supplied by James',
    'Any amount/obligation not part of this dispute',
  ],
};

const commonMasters = [
  {
    id: 'master-mary',
    name: 'Mary Wanjiru',
    title: 'Quantity Surveyor',
    expertise: 'Construction defects / measurement',
    serviceArea: 'Nairobi',
    availability: 'Available this week',
    cost: 'KES 1,000',
    provenance: 'Verified SecurePay Master — construction',
  },
  {
    id: 'master-james-o',
    name: 'James Otieno',
    title: 'Building Inspector',
    expertise: 'Finishes / workmanship',
    serviceArea: 'Nairobi',
    availability: 'Available in 2 days',
    cost: 'KES 1,500',
    provenance: 'Verified SecurePay Master — inspection',
  },
];

// Journey A: Isolate dispute (scope just confirmed)
export const disputeA: DisputeDetail = {
  id: 'dispute-a',
  agreementId: 'agr-bathroom',
  agreementTitle: 'Bathroom retiling with Peter Mwangi',
  agreementVersion: 'v2',
  step: 'scope_confirmed',
  category: 'workmanship',
  scope: { ...commonScope },
  proposerStatement:
    'Peter says the work is complete, but the shower-area tiles are lifting and I believe KES 20,000 of the remaining amount should not be released until the defects are corrected.',
  evidence: [],
  positions: [],
  totalAgreementValue: 'KES 68,000',
  disputedAmount: 'KES 20,000',
  notDisputedAmount: 'KES 48,000',
};

// Journey B: Match without Master
export const disputeB: DisputeDetail = {
  id: 'dispute-b',
  agreementId: 'agr-bathroom',
  agreementTitle: 'Bathroom retiling with Peter Mwangi',
  agreementVersion: 'v2',
  step: 'match_reached',
  category: 'workmanship',
  scope: { ...commonScope },
  proposerStatement:
    'Peter says the work is complete, but the shower-area tiles are lifting and I believe KES 20,000 of the remaining amount should not be released until the defects are corrected.',
  counterpartyStatement:
    'Most of the work is complete. I am willing to inspect and correct the shower area. KES 5,000 should be recognized as completed work.',
  evidence: [
    { id: 'ev-1', filename: 'shower_tiles_lifting.jpg', type: 'Photo', source: 'Added by James', date: '15 Sep 2026', linkedComponent: 'Shower-area tiles' },
    { id: 'ev-2', filename: 'completion_notice.pdf', type: 'Notice', source: 'Added by Peter', date: '14 Sep 2026', linkedComponent: 'Completion claim' },
  ],
  positions: [
    { party: 'James', monetaryAmount: 'KES 20,000', positionText: 'KES 20,000 should remain restricted until defects are corrected.' },
    { party: 'Peter', monetaryAmount: 'KES 15,000', positionText: 'KES 15,000 can remain restricted and KES 5,000 should be recognized as completed work.' },
  ],
  match: {
    agreedPoints: [
      'Shower-area tiles need inspection',
      'Peter may return to inspect',
      'KES 15,000 remains linked to correction',
      'KES 5,000 recognized as completed work',
    ],
    disagreedPoints: [],
  },
  totalAgreementValue: 'KES 68,000',
  disputedAmount: 'KES 20,000',
  notDisputedAmount: 'KES 48,000',
  resolution: 'Peter will inspect and correct the shower-area defects by 21 Nov. KES 15,000 remains connected to the disputed work until the agreed correction condition is satisfied. KES 5,000 recognized as completed work.',
};

// Journey C: Master escalation — opinion returned, parties match
export const disputeC: DisputeDetail = {
  id: 'dispute-c',
  agreementId: 'agr-bathroom',
  agreementTitle: 'Bathroom retiling with Peter Mwangi',
  agreementVersion: 'v2',
  step: 'resolved',
  category: 'workmanship',
  scope: { ...commonScope },
  proposerStatement:
    'Peter says the work is complete, but the shower-area tiles are lifting and I believe KES 20,000 of the remaining amount should not be released until the defects are corrected.',
  counterpartyStatement:
    'The tiles were installed correctly. Any lifting is due to substrate issues, not workmanship. Full release is due.',
  evidence: [
    { id: 'ev-3', filename: 'shower_tiles_lifting.jpg', type: 'Photo', source: 'Added by James', date: '15 Sep 2026', linkedComponent: 'Shower-area tiles' },
    { id: 'ev-4', filename: 'installation_method.pdf', type: 'Document', source: 'Added by Peter', date: '16 Sep 2026', linkedComponent: 'Installation method' },
  ],
  positions: [
    { party: 'James', monetaryAmount: 'KES 20,000', positionText: 'KES 20,000 should remain restricted until defects are corrected.' },
    { party: 'Peter', monetaryAmount: 'KES 0', positionText: 'Full release is due. Lifting is a substrate issue, not workmanship.' },
  ],
  match: {
    agreedPoints: [],
    disagreedPoints: [
      { label: 'Amount', james: 'KES 20,000 restricted', peter: 'Full release' },
      { label: 'Cause', james: 'Workmanship defect', peter: 'Substrate issue' },
    ],
  },
  masters: commonMasters,
  selectedMaster: commonMasters[0],
  masterCost: 'KES 1,000',
  masterAppointmentStatus: { james: 'agreed', peter: 'agreed' },
  masterOpinion:
    'Based on the agreement, submitted photos and inspection, the shower-area tile lifting appears consistent with installation/workmanship defects requiring correction under the agreed defect clause.',
  masterRecommendation:
    'Peter corrects affected tiles within 5 working days. Disputed amount remains linked to that obligation until the relevant condition is completed, subject to authoritative SecurePay Money rules.',
  resolution: 'Both parties agree: Peter will correct the affected shower-area tiles within 5 working days. KES 15,000 remains linked to the disputed work until correction is confirmed. KES 5,000 recognized as completed work.',
  totalAgreementValue: 'KES 68,000',
  disputedAmount: 'KES 20,000',
  notDisputedAmount: 'KES 48,000',
  siteInspection: { date: '18 Sep 2026', location: 'Westlands, Nairobi', cost: 'KES 500' },
};

// Journey D: Master cost decision (at master_cost step)
export const disputeD: DisputeDetail = {
  id: 'dispute-d',
  agreementId: 'agr-bathroom',
  agreementTitle: 'Bathroom retiling with Peter Mwangi',
  agreementVersion: 'v2',
  step: 'master_cost',
  category: 'workmanship',
  scope: { ...commonScope },
  proposerStatement:
    'Peter says the work is complete, but the shower-area tiles are lifting and I believe KES 20,000 of the remaining amount should not be released until the defects are corrected.',
  counterpartyStatement:
    'The tiles were installed correctly. Full release is due.',
  evidence: [
    { id: 'ev-5', filename: 'shower_tiles_lifting.jpg', type: 'Photo', source: 'Added by James', date: '15 Sep 2026', linkedComponent: 'Shower-area tiles' },
  ],
  positions: [
    { party: 'James', monetaryAmount: 'KES 20,000', positionText: 'KES 20,000 should remain restricted until defects are corrected.' },
    { party: 'Peter', monetaryAmount: 'KES 0', positionText: 'Full release is due.' },
  ],
  match: {
    agreedPoints: [],
    disagreedPoints: [
      { label: 'Amount', james: 'KES 20,000 restricted', peter: 'Full release' },
    ],
  },
  masters: commonMasters,
  selectedMaster: commonMasters[0],
  masterCost: 'KES 1,000',
  totalAgreementValue: 'KES 68,000',
  disputedAmount: 'KES 20,000',
  notDisputedAmount: 'KES 48,000',
};

// Journey E: No match after Master — unresolved
export const disputeE: DisputeDetail = {
  id: 'dispute-e',
  agreementId: 'agr-bathroom',
  agreementTitle: 'Bathroom retiling with Peter Mwangi',
  agreementVersion: 'v2',
  step: 'unresolved',
  category: 'workmanship',
  scope: { ...commonScope },
  proposerStatement:
    'Peter says the work is complete, but the shower-area tiles are lifting and I believe KES 20,000 of the remaining amount should not be released until the defects are corrected.',
  counterpartyStatement:
    'The tiles were installed correctly. Full release is due. I do not agree with the Master opinion.',
  evidence: [
    { id: 'ev-6', filename: 'shower_tiles_lifting.jpg', type: 'Photo', source: 'Added by James', date: '15 Sep 2026', linkedComponent: 'Shower-area tiles' },
    { id: 'ev-7', filename: 'installation_method.pdf', type: 'Document', source: 'Added by Peter', date: '16 Sep 2026', linkedComponent: 'Installation method' },
  ],
  positions: [
    { party: 'James', monetaryAmount: 'KES 20,000', positionText: 'KES 20,000 should remain restricted until defects are corrected.' },
    { party: 'Peter', monetaryAmount: 'KES 0', positionText: 'Full release is due. I reject the Master opinion.' },
  ],
  match: {
    agreedPoints: [],
    disagreedPoints: [
      { label: 'Amount', james: 'KES 20,000 restricted', peter: 'Full release' },
      { label: 'Master opinion', james: 'Agree', peter: 'Reject' },
    ],
  },
  masters: commonMasters,
  selectedMaster: commonMasters[0],
  masterCost: 'KES 1,000',
  masterAppointmentStatus: { james: 'agreed', peter: 'agreed' },
  masterOpinion:
    'Based on the agreement, submitted photos and inspection, the shower-area tile lifting appears consistent with installation/workmanship defects requiring correction under the agreed defect clause.',
  masterRecommendation:
    'Peter corrects affected tiles within 5 working days. Disputed amount remains linked to that obligation until the relevant condition is completed.',
  totalAgreementValue: 'KES 68,000',
  disputedAmount: 'KES 20,000',
  notDisputedAmount: 'KES 48,000',
  siteInspection: { date: '18 Sep 2026', location: 'Westlands, Nairobi', cost: 'KES 500' },
};

export const demoDisputes: Record<string, DisputeDetail> = {
  'dispute-a': disputeA,
  'dispute-b': disputeB,
  'dispute-c': disputeC,
  'dispute-d': disputeD,
  'dispute-e': disputeE,
};

export function getDemoDispute(id: string): DisputeDetail | undefined {
  return demoDisputes[id];
}

// Dispute-specific attention items for signed-in home
export const disputeAttentionItems = [
  {
    id: 'datt-1',
    kind: 'dispute_scope_confirmation' as const,
    title: 'Bathroom retiling — dispute scope',
    detail: 'Agree the exact part of the agreement being disputed before continuing.',
    actionLabel: 'Confirm disputed scope',
    actionValue: 'confirm_dispute_scope',
    agreementId: 'agr-bathroom',
  },
  {
    id: 'datt-2',
    kind: 'dispute_position_needed' as const,
    title: 'Bathroom retiling — position needed',
    detail: 'State what you believe is a fair resolution for the disputed component.',
    actionLabel: 'State your position',
    actionValue: 'state_position',
    agreementId: 'agr-bathroom',
  },
  {
    id: 'datt-3',
    kind: 'dispute_match_proposed' as const,
    title: 'Bathroom retiling — match proposed',
    detail: 'Peter proposed a resolution. Review and respond.',
    actionLabel: 'Review proposed match',
    actionValue: 'review_match',
    agreementId: 'agr-bathroom',
  },
  {
    id: 'datt-4',
    kind: 'dispute_master_appointment' as const,
    title: 'Bathroom retiling — Master appointment',
    detail: 'Master review cost: KES 1,000. Agree to appoint a Master to help resolve this dispute.',
    actionLabel: 'Review Master cost',
    actionValue: 'review_master_cost',
    agreementId: 'agr-bathroom',
  },
  {
    id: 'datt-5',
    kind: 'dispute_master_opinion' as const,
    title: 'Bathroom retiling — Master opinion ready',
    detail: 'The expert has issued an opinion. Review it and decide whether to agree.',
    actionLabel: 'Review Master opinion',
    actionValue: 'review_master_opinion',
    agreementId: 'agr-bathroom',
  },
];
