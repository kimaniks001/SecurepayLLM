import type { AgreementStructure, AgreementAction, ReminderRule, WhatsAppPreview } from './types';

// ─── Bathroom retiling — multi-milestone ───────────────────

const bathroomMilestones = [
  {
    id: 'ms-1',
    title: 'Removal & disposal',
    status: 'complete' as const,
    responsible: 'Peter',
    work: ['Remove existing floor and wall tiles', 'Remove debris from site'],
    obligations: [
      { id: 'ob-1', responsibleParty: 'Peter', action: 'Remove existing floor and wall tiles', dueDate: '5 Oct 2026', condition: 'Old tiles removed and area cleared', evidenceRequired: 'Completion photos', status: 'done' as const, completionSource: 'evidence_review' as const },
    ],
    value: 'KES 12,000',
    target: '5 Oct 2026',
    completionCondition: 'Old tiles removed and area cleared',
    evidenceRequired: ['Completion photos'],
    completionSource: 'evidence_review' as const,
  },
  {
    id: 'ms-2',
    title: 'Surface preparation',
    status: 'complete' as const,
    responsible: 'Peter',
    work: ['Repair and prepare floor/wall surfaces'],
    obligations: [
      { id: 'ob-2', responsibleParty: 'Peter', action: 'Repair and prepare floor/wall surfaces', dueDate: '8 Oct 2026', condition: 'Surfaces ready for tile installation', evidenceRequired: 'Prepared-surface photos', status: 'done' as const, dependencyId: 'ob-1', completionSource: 'evidence_review' as const },
    ],
    value: 'KES 14,000',
    target: '8 Oct 2026',
    completionCondition: 'Surfaces ready for tile installation',
    evidenceRequired: ['Prepared-surface photos'],
    dependencyIds: ['ms-1'],
    completionSource: 'evidence_review' as const,
  },
  {
    id: 'ms-3',
    title: 'Tile installation',
    status: 'in_progress' as const,
    responsible: 'Peter',
    work: ['Install replacement floor and wall tiles'],
    obligations: [
      { id: 'ob-3', responsibleParty: 'Peter', action: 'Install floor tiles', dueDate: '18 Oct 2026', condition: 'Agreed floor areas tiled', evidenceRequired: 'Completion photos', status: 'needs_you' as const, dependencyId: 'ob-2', completionSource: 'counterparty_confirmation' as const },
      { id: 'ob-4', responsibleParty: 'Peter', action: 'Install wall tiles', dueDate: '18 Oct 2026', condition: 'Agreed wall areas tiled', evidenceRequired: 'Completion photos', status: 'waiting_on_other' as const, dependencyId: 'ob-2', completionSource: 'counterparty_confirmation' as const },
      { id: 'ob-5', responsibleParty: 'James', action: 'Provide tiles', dueDate: '14 Oct 2026', condition: 'Tiles, adhesive and grout on site', status: 'needs_you' as const },
      { id: 'ob-6', responsibleParty: 'James', action: 'Provide adhesive and grout', dueDate: '14 Oct 2026', status: 'needs_you' as const },
      { id: 'ob-7', responsibleParty: 'James', action: 'Provide site access', dueDate: '14 Oct 2026', status: 'upcoming' as const },
    ],
    value: 'KES 32,000',
    target: '18 Oct 2026',
    completionCondition: 'Agreed floor and wall areas tiled',
    evidenceRequired: ['3 completion photos'],
    dependencyIds: ['ms-2'],
    customerObligation: 'James provides: tiles, adhesive, grout',
    materialsDue: '14 Oct',
    completionSource: 'counterparty_confirmation' as const,
  },
  {
    id: 'ms-4',
    title: 'Finishing & handover',
    status: 'not_started' as const,
    responsible: 'Peter',
    work: ['Grouting', 'Cleanup', 'Final finishing'],
    obligations: [
      { id: 'ob-8', responsibleParty: 'Peter', action: 'Grouting and cleanup', dueDate: '24 Oct 2026', condition: 'Final inspection completed', status: 'upcoming' as const, dependencyId: 'ob-3', completionSource: 'inspection' as const },
      { id: 'ob-9', responsibleParty: 'James', action: 'Final inspection', dueDate: '24 Oct 2026', condition: 'Workmanship defects corrected before final handover', status: 'upcoming' as const, completionSource: 'inspection' as const },
    ],
    value: 'KES 10,000',
    target: '24 Oct 2026',
    completionCondition: 'Final inspection completed',
    defectRule: 'Workmanship defects corrected before final handover',
    dependencyIds: ['ms-3'],
    inspectionRequired: true,
    completionSource: 'inspection' as const,
  },
];

const bathroomActions: AgreementAction[] = [
  { id: 'act-1', type: 'provide_materials', label: 'Provide bathroom tiles', responsible: 'James', due: '14 Oct', agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling', milestoneId: 'ms-3', milestoneTitle: 'Tile installation', status: 'needs_you', provenance: 'Agreement v2 → Milestone 3 → James obligation' },
  { id: 'act-2', type: 'upload_evidence', label: 'Upload completion photos', responsible: 'Peter', due: '18 Oct', agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling', milestoneId: 'ms-3', milestoneTitle: 'Tile installation', status: 'waiting_on_other', provenance: 'Agreement v2 → Milestone 3 → Peter obligation' },
  { id: 'act-3', type: 'review_evidence', label: 'Review completion evidence', responsible: 'James', agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling', milestoneId: 'ms-3', milestoneTitle: 'Tile installation', status: 'upcoming', provenance: 'Peter submitted evidence against Milestone 3' },
  { id: 'act-4', type: 'inspect_work', label: 'Final inspection', responsible: 'James', due: '24 Oct', agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling', milestoneId: 'ms-4', milestoneTitle: 'Finishing & handover', status: 'upcoming', provenance: 'Agreement v2 → Milestone 4 → inspection required' },
];

const bathroomReminders: ReminderRule[] = [
  { id: 'rem-1', who: 'James', about: 'Provide tiles, adhesive and grout', timing: '2 days before due date', channels: ['securepay', 'whatsapp'], actionId: 'act-1', createdBy: 'James' },
  { id: 'rem-2', who: 'James', about: 'Provide tiles, adhesive and grout', timing: 'On due date', channels: ['securepay'], actionId: 'act-1', createdBy: 'James' },
];

// ─── iPhone purchase — simple (root only) ───────────────────

const iphoneMilestones = [
  {
    id: 'ms-ip',
    title: 'Complete used iPhone purchase',
    status: 'in_progress' as const,
    work: ['iPhone 15 Pro 256GB', 'Original box and accessories', 'Battery health 94%'],
    obligations: [
      { id: 'ob-ip-1', responsibleParty: 'Daniel', action: 'Bring iPhone 15 Pro', condition: 'IMEI matches, no iCloud lock', status: 'waiting_on_other' as const, completionSource: 'counterparty_confirmation' as const },
      { id: 'ob-ip-2', responsibleParty: 'James', action: 'Inspect device', condition: 'IMEI + iCloud + battery health checks', status: 'needs_you' as const, completionSource: 'inspection' as const },
      { id: 'ob-ip-3', responsibleParty: 'James', action: 'Pay according to authoritative Money flow after agreed inspection condition', status: 'upcoming' as const, completionSource: 'agreed_condition' as const },
    ],
    value: 'KES 95,000',
    target: '20 Sep 2026',
    completionCondition: 'Inspection before payment',
    completionSource: 'counterparty_confirmation' as const,
  },
];

const iphoneActions: AgreementAction[] = [
  { id: 'act-5', type: 'meet_in_person', label: 'Meet in Westlands', responsible: 'James', due: '20 Sep, 2:00 PM', agreementId: 'agr-iphone', agreementTitle: 'Used iPhone 15 Pro purchase', milestoneId: 'ms-ip', milestoneTitle: 'Complete used iPhone purchase', status: 'needs_you', provenance: 'Agreement v1 → root obligation → meet in person' },
  { id: 'act-6', type: 'review_current_version', label: 'Review and confirm current version', responsible: 'James', agreementId: 'agr-iphone', agreementTitle: 'Used iPhone 15 Pro purchase', status: 'needs_you', provenance: 'Agreement system event' },
];

const iphoneReminders: ReminderRule[] = [
  { id: 'rem-3', who: 'James', about: 'Meet in Westlands', timing: '2 hours before', channels: ['securepay', 'whatsapp'], actionId: 'act-5', createdBy: 'James' },
];

// ─── Chama — recurring cycle ───────────────────

const chamaMilestones = [
  {
    id: 'ms-ch-1',
    title: 'October contribution',
    status: 'in_progress' as const,
    work: ['Monthly contribution KES 5,000 per member'],
    obligations: [
      { id: 'ob-ch-1', responsibleParty: 'Each member', action: 'Contribute KES 5,000 by 5 Oct', dueDate: '5 Oct 2026', status: 'needs_you' as const, completionSource: 'agreed_condition' as const },
      { id: 'ob-ch-2', responsibleParty: 'Officials', action: 'Confirm contribution records', dueDate: '8 Oct 2026', status: 'waiting_on_other' as const, completionSource: 'counterparty_confirmation' as const },
    ],
    target: '5 Oct 2026',
    completionCondition: 'All members contributed and confirmed',
    completionSource: 'agreed_condition' as const,
  },
];

const chamaActions: AgreementAction[] = [
  { id: 'act-7', type: 'contribute_funds', label: 'October contribution due', responsible: 'James', due: '5 Oct', agreementId: 'agr-chama', agreementTitle: 'Greenfields Chama', milestoneId: 'ms-ch-1', milestoneTitle: 'October contribution', status: 'needs_you', provenance: 'Agreement v1 → October contribution → James obligation' },
];

const chamaReminders: ReminderRule[] = [
  { id: 'rem-4', who: 'James', about: 'October contribution', timing: '2 days before due date', channels: ['securepay', 'whatsapp'], actionId: 'act-7', createdBy: 'James' },
  { id: 'rem-5', who: 'James', about: 'October contribution', timing: 'On due date', channels: ['securepay'], actionId: 'act-7', createdBy: 'James' },
];

// ─── Kitchen renovation — completed multi-milestone ───────────────────

const kitchenMilestones = [
  {
    id: 'ms-k-1',
    title: 'Full kitchen renovation',
    status: 'complete' as const,
    responsible: 'Peter',
    work: ['Full kitchen renovation', 'Cabinet installation', 'Countertop fitting', 'Plumbing and electrical for kitchen', 'Tiling and finishing'],
    obligations: [
      { id: 'ob-k-1', responsibleParty: 'Peter', action: 'Complete kitchen renovation', dueDate: '30 Nov 2026', condition: 'Defect correction: 30-day window after completion', status: 'done' as const, completionSource: 'agreed_condition' as const },
      { id: 'ob-k-2', responsibleParty: 'James', action: 'Pay according to 50/30/20 structure', condition: '50% start, 30% mid, 20% on completion', status: 'done' as const, completionSource: 'agreed_condition' as const },
    ],
    value: 'KES 320,000',
    target: '30 Nov 2026',
    completionCondition: '30-day defect window after completion',
    defectRule: 'Defect correction: 30-day window after completion',
    completionSource: 'agreed_condition' as const,
  },
];

const kitchenActions: AgreementAction[] = [];

// ─── WhatsApp previews ───────────────────

export const demoWhatsAppPreviews: WhatsAppPreview[] = [
  {
    id: 'wa-1',
    heading: 'Tiles are due in 2 days',
    body: 'Bathroom retiling with Peter\n\nYour action:\nProvide tiles, adhesive and grout by 14 Oct.',
    actionText: 'Open agreement',
    actionUrl: '#/demo/agreement-builder/milestones',
    isSystemNotice: false,
  },
  {
    id: 'wa-2',
    heading: 'Peter added completion evidence',
    body: 'Tile installation\n\n3 photos added',
    actionText: 'Review in SecurePay',
    actionUrl: '#/demo/agreement-builder/evidence',
    isSystemNotice: true,
  },
  {
    id: 'wa-3',
    heading: 'A milestone date changed',
    body: 'Tile installation:\n18 Oct → proposed 21 Oct',
    actionText: 'Review change in SecurePay',
    actionUrl: '#/demo/agreement/changed',
    isSystemNotice: true,
  },
];

// ─── Export structures ───────────────────

export const demoStructures: Record<string, AgreementStructure> = {
  'agr-bathroom': {
    agreementId: 'agr-bathroom',
    rootMilestone: { id: 'ms-root', title: 'Complete bathroom retiling', status: 'in_progress', work: [], obligations: [] },
    milestones: bathroomMilestones,
    actions: bathroomActions,
    reminders: bathroomReminders,
    totalValue: 'KES 68,000',
    allocatedValue: 'KES 68,000',
    unallocatedValue: 'KES 0',
    isSimple: false,
  },
  'agr-iphone': {
    agreementId: 'agr-iphone',
    rootMilestone: iphoneMilestones[0],
    milestones: [],
    actions: iphoneActions,
    reminders: iphoneReminders,
    totalValue: 'KES 95,000',
    allocatedValue: 'KES 95,000',
    unallocatedValue: 'KES 0',
    isSimple: true,
  },
  'agr-chama': {
    agreementId: 'agr-chama',
    rootMilestone: chamaMilestones[0],
    milestones: [],
    actions: chamaActions,
    reminders: chamaReminders,
    totalValue: 'KES 5,000 / month',
    allocatedValue: 'KES 5,000 / month',
    unallocatedValue: 'KES 0',
    isSimple: true,
  },
  'agr-kitchen': {
    agreementId: 'agr-kitchen',
    rootMilestone: kitchenMilestones[0],
    milestones: [],
    actions: kitchenActions,
    reminders: [],
    totalValue: 'KES 320,000',
    allocatedValue: 'KES 320,000',
    unallocatedValue: 'KES 0',
    isSimple: true,
  },
};

export function getDemoStructure(agreementId: string): AgreementStructure | undefined {
  return demoStructures[agreementId];
}

// ─── Action-based attention items for signed-in home ───────────────────

export const actionAttentionItems = [
  {
    id: 'aatt-1',
    kind: 'waiting_confirmation' as const,
    title: 'Provide bathroom tiles',
    detail: 'Due 14 Oct · Bathroom retiling · Tile installation milestone',
    actionLabel: 'Open obligation',
    actionValue: 'open_obligation',
    agreementId: 'agr-bathroom',
  },
  {
    id: 'aatt-2',
    kind: 'document_review' as const,
    title: 'Review completion evidence',
    detail: 'Peter added 3 completion photos to Tile installation',
    actionLabel: 'Review',
    actionValue: 'review_evidence',
    agreementId: 'agr-bathroom',
  },
  {
    id: 'aatt-3',
    kind: 'waiting_confirmation' as const,
    title: 'Meet in Westlands',
    detail: 'Due 20 Sep, 2:00 PM · Used iPhone 15 Pro purchase',
    actionLabel: 'Open action',
    actionValue: 'open_action',
    agreementId: 'agr-iphone',
  },
  {
    id: 'aatt-4',
    kind: 'waiting_confirmation' as const,
    title: 'October contribution due',
    detail: 'Due 5 Oct · Greenfields Chama',
    actionLabel: 'Open obligation',
    actionValue: 'open_obligation',
    agreementId: 'agr-chama',
  },
];

// ─── Dispute isolation picker data ───────────────────

export const disputeIsolationOptions = {
  'agr-bathroom': {
    milestones: [
      { id: 'ms-1', title: 'Removal & disposal' },
      { id: 'ms-2', title: 'Surface preparation' },
      { id: 'ms-3', title: 'Tile installation' },
      { id: 'ms-4', title: 'Finishing & handover' },
    ],
    obligations: {
      'ms-3': [
        { id: 'ob-3', title: 'Floor installation' },
        { id: 'ob-4', title: 'Wall installation' },
        { id: 'ob-4a', title: 'Shower-area workmanship' },
        { id: 'ob-other', title: 'Other' },
      ],
      'ms-1': [{ id: 'ob-1', title: 'Removal work' }],
      'ms-2': [{ id: 'ob-2', title: 'Surface preparation work' }],
      'ms-4': [{ id: 'ob-8', title: 'Finishing work' }, { id: 'ob-9', title: 'Final inspection' }],
    },
  },
};
