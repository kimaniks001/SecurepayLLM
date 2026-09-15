import type { MoneyDetail, RailOption, MoneyActivityItem, PaymentReadinessStatus, ParticipantNextAction } from './types';

const commonRails: RailOption[] = [
  { id: 'mpesa_stk', label: 'M-PESA', description: 'Pay from your mobile number', available: true, feeNote: 'Fee determined before confirmation' },
  { id: 'pesalink', label: 'PesaLink', description: 'Where available', available: true, comingLater: true },
  { id: 'partner_bank', label: 'Partner bank', description: 'Approved bank mechanism', available: false, comingLater: true },
];

const commonActivity: MoneyActivityItem[] = [
  { id: 'ma-1', date: '14 Oct', text: 'Payment method selected — M-PESA', statusLabel: 'Method selected' },
  { id: 'ma-2', date: '14 Oct', text: 'Payment initiated', amount: 'KES 20,000', rail: 'M-PESA STK', reference: 'SP-MNY-2026-0042', statusLabel: 'Initiated' },
  { id: 'ma-3', date: '14 Oct', text: 'SecurePay Money received confirmation', amount: 'KES 20,000', reference: 'SP-MNY-2026-0042', statusLabel: 'Confirmed' },
];

// Journey A: Money Home — overview
export const moneyHome: MoneyDetail = {
  id: 'money-home',
  state: 'no_money_activity',
  stateLabel: 'Money overview',
  agreementLink: { agreementId: '', agreementTitle: '', agreementVersion: '', amount: '' },
  amount: '',
  currency: 'KES',
  paymentReadiness: 'NO_EVALUATION_YET',
  nextActions: ['none'],
  availableRails: [],
  activity: [],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  isDemoState: true,
};

// Journey B: Not ready
export const moneyNotReady: MoneyDetail = {
  id: 'money-not-ready',
  state: 'not_ready',
  stateLabel: 'Not ready for payment',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 68,000' },
  amount: 'KES 68,000',
  currency: 'KES',
  paymentReadiness: 'NOT_READY',
  outstandingReasons: ['SecurePay Money has not marked this agreement ready for payment.'],
  moneyRecordCount: 0,
  nextActions: ['none'],
  availableRails: [],
  activity: [],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  counterpartyName: 'Peter Mwangi',
  counterpartyReady: false,
  isDemoState: true,
};

// Journey C: Ready to pay — with FUND_AGREEMENT next action
export const moneyReady: MoneyDetail = {
  id: 'money-ready',
  state: 'ready',
  stateLabel: 'Ready for payment',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 20,000', milestoneId: 'ms-3', milestoneTitle: 'Tile installation' },
  amount: 'KES 20,000',
  currency: 'KES',
  paymentReadiness: 'READY',
  moneyRecordCount: 0,
  nextActions: ['FUND_AGREEMENT'],
  availableRails: commonRails,
  activity: [],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  counterpartyName: 'Peter Mwangi',
  counterpartyReady: true,
  isDemoState: true,
};

// Journey C2: Ready but no next action — no Pay button
export const moneyReadyNoAction: MoneyDetail = {
  id: 'money-ready-no-action',
  state: 'ready',
  stateLabel: 'Ready for payment',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 20,000', milestoneId: 'ms-3', milestoneTitle: 'Tile installation' },
  amount: 'KES 20,000',
  currency: 'KES',
  paymentReadiness: 'READY',
  moneyRecordCount: 0,
  nextActions: ['none'],
  availableRails: [],
  activity: [],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  counterpartyName: 'Peter Mwangi',
  counterpartyReady: true,
  isDemoState: true,
};

// Journey D: STK pending
export const moneyPending: MoneyDetail = {
  id: 'money-pending',
  state: 'pending_confirmation',
  stateLabel: 'Waiting for confirmation',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 20,000', milestoneId: 'ms-3', milestoneTitle: 'Tile installation' },
  amount: 'KES 20,000',
  currency: 'KES',
  paymentReadiness: 'READY',
  moneyRecordCount: 1,
  nextActions: ['CHECK_STATUS'],
  availableRails: commonRails,
  selectedRail: commonRails[0],
  activity: [
    { id: 'ma-p1', date: '14 Oct', text: 'Payment initiated', amount: 'KES 20,000', rail: 'M-PESA STK', reference: 'SP-MNY-2026-0042', statusLabel: 'Initiated' },
    { id: 'ma-p2', date: '14 Oct', text: 'STK request sent — check your phone', statusLabel: 'Request sent' },
  ],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  counterpartyName: 'Peter Mwangi',
  attemptInProgress: true,
  attemptReference: 'SP-MNY-2026-0042',
  isDemoState: true,
};

// Journey E: Payment confirmed
export const moneyConfirmed: MoneyDetail = {
  id: 'money-confirmed',
  state: 'confirmed',
  stateLabel: 'Payment confirmed',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 20,000', milestoneId: 'ms-3', milestoneTitle: 'Tile installation' },
  amount: 'KES 20,000',
  currency: 'KES',
  paymentReadiness: 'READY',
  moneyRecordCount: 3,
  nextActions: ['none'],
  availableRails: commonRails,
  selectedRail: commonRails[0],
  activity: commonActivity,
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  counterpartyName: 'Peter Mwangi',
  isDemoState: true,
};

// Journey F: Unknown status
export const moneyUnknown: MoneyDetail = {
  id: 'money-unknown',
  state: 'unknown',
  stateLabel: 'Payment status not yet confirmed',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 20,000', milestoneId: 'ms-3', milestoneTitle: 'Tile installation' },
  amount: 'KES 20,000',
  currency: 'KES',
  paymentReadiness: 'READY',
  moneyRecordCount: 1,
  nextActions: ['CHECK_STATUS'],
  availableRails: commonRails,
  selectedRail: commonRails[0],
  activity: [
    { id: 'ma-u1', date: '14 Oct', text: 'Payment initiated', amount: 'KES 20,000', rail: 'M-PESA STK', reference: 'SP-MNY-2026-0042', statusLabel: 'Initiated' },
    { id: 'ma-u2', date: '14 Oct', text: 'SecurePay has not received a final status', statusLabel: 'Unknown' },
  ],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  counterpartyName: 'Peter Mwangi',
  attemptInProgress: true,
  attemptReference: 'SP-MNY-2026-0042',
  isDemoState: true,
  errorMessage: 'SecurePay could not confirm the payment result. Do not try again yet.',
};

// Journey G: Milestone-linked money
export const moneyMilestone: MoneyDetail = {
  id: 'money-milestone',
  state: 'ready',
  stateLabel: 'Ready for payment',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 32,000', milestoneId: 'ms-3', milestoneTitle: 'Tile installation' },
  amount: 'KES 32,000',
  currency: 'KES',
  paymentReadiness: 'READY',
  moneyRecordCount: 0,
  nextActions: ['FUND_AGREEMENT'],
  availableRails: commonRails,
  activity: [],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  counterpartyName: 'Peter Mwangi',
  counterpartyReady: true,
  isDemoState: true,
};

// Journey H: Dispute-linked money
export const moneyDispute: MoneyDetail = {
  id: 'money-dispute',
  state: 'not_ready',
  stateLabel: 'Disputed amount — Money state separate',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 68,000' },
  amount: 'KES 20,000',
  currency: 'KES',
  paymentReadiness: 'BLOCKED',
  outstandingReasons: ['SecurePay Money has not marked this disputed amount ready for payment.'],
  moneyRecordCount: 0,
  nextActions: ['none'],
  availableRails: [],
  activity: [],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  isDemoState: true,
  disputeLinked: true,
  disputeAmount: 'KES 20,000',
};

// Journey I: Group contribution
export const moneyGroup: MoneyDetail = {
  id: 'money-group',
  state: 'ready',
  stateLabel: 'Contribution ready',
  agreementLink: { agreementId: 'agr-chama', agreementTitle: 'Greenfields Chama', agreementVersion: 'v1', amount: 'KES 5,000', milestoneId: 'ms-ch-1', milestoneTitle: 'October contribution' },
  amount: 'KES 5,000',
  currency: 'KES',
  paymentReadiness: 'READY',
  moneyRecordCount: 1,
  nextActions: ['FUND_AGREEMENT'],
  availableRails: commonRails,
  activity: [],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  isDemoState: true,
  groupParticipants: [
    { name: 'James', amount: 'KES 5,000', agreementActionStatus: 'Contribution due', moneyStatus: 'No evaluation yet' },
    { name: 'Mary', amount: 'KES 5,000', agreementActionStatus: 'Contribution due', moneyStatus: 'Confirmed' },
    { name: 'David', amount: 'KES 5,000', agreementActionStatus: 'Contribution due', moneyStatus: 'No evaluation yet' },
    { name: 'Grace', amount: 'KES 5,000', agreementActionStatus: 'Not started', moneyStatus: 'No evaluation yet' },
  ],
};

// Journey J: Stale / agreement changed
export const moneyStale: MoneyDetail = {
  id: 'money-stale',
  state: 'stale',
  stateLabel: 'Money status changed',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 20,000', milestoneId: 'ms-3', milestoneTitle: 'Tile installation' },
  amount: 'KES 20,000',
  currency: 'KES',
  paymentReadiness: 'NO_EVALUATION_YET',
  moneyRecordCount: 1,
  nextActions: ['REFRESH'],
  availableRails: [],
  activity: [
    { id: 'ma-s1', date: '14 Oct', text: 'Payment initiated against Agreement v2', amount: 'KES 20,000', reference: 'SP-MNY-2026-0042', statusLabel: 'Initiated' },
  ],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  isDemoState: true,
  staleNotice: 'Agreement is now v3. This Money action may need to be refreshed against the current agreement.',
  attemptReference: 'SP-MNY-2026-0042',
};

// Journey K: Payment failed
export const moneyFailed: MoneyDetail = {
  id: 'money-failed',
  state: 'failed',
  stateLabel: 'Payment not completed',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 20,000', milestoneId: 'ms-3', milestoneTitle: 'Tile installation' },
  amount: 'KES 20,000',
  currency: 'KES',
  paymentReadiness: 'NOT_READY',
  outstandingReasons: ['The M-PESA request timed out.'],
  moneyRecordCount: 2,
  nextActions: ['TRY_AGAIN', 'CHOOSE_ANOTHER'],
  availableRails: commonRails,
  selectedRail: commonRails[0],
  activity: [
    { id: 'ma-f1', date: '14 Oct', text: 'Payment initiated', amount: 'KES 20,000', rail: 'M-PESA STK', reference: 'SP-MNY-2026-0043', statusLabel: 'Initiated' },
    { id: 'ma-f2', date: '14 Oct', text: 'STK request timed out', statusLabel: 'Timed out' },
  ],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  counterpartyName: 'Peter Mwangi',
  isDemoState: true,
  errorMessage: 'The M-PESA request timed out. You can try again or choose another available method.',
};

// Journey L: Service unavailable
export const moneyUnavailable: MoneyDetail = {
  id: 'money-unavailable',
  state: 'unavailable',
  stateLabel: 'SecurePay Money temporarily unavailable',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 20,000' },
  amount: 'KES 20,000',
  currency: 'KES',
  paymentReadiness: 'NO_EVALUATION_YET',
  nextActions: ['VIEW_AGREEMENT'],
  availableRails: [],
  activity: [],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  isDemoState: true,
  errorMessage: 'We cannot confirm the current payment state. For your protection, no new financial action can be taken from this screen right now. You can still view the agreement.',
};

// Journey M: Partially ready
export const moneyPartiallyReady: MoneyDetail = {
  id: 'money-partially-ready',
  state: 'not_ready',
  stateLabel: 'Partially ready for payment',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 68,000' },
  amount: 'KES 68,000',
  currency: 'KES',
  paymentReadiness: 'PARTIALLY_READY',
  outstandingReasons: ['Some conditions for payment readiness have been met. Others remain outstanding.'],
  moneyRecordCount: 0,
  nextActions: ['none'],
  availableRails: [],
  activity: [],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  counterpartyName: 'Peter Mwangi',
  isDemoState: true,
};

// Journey N: Blocked
export const moneyBlocked: MoneyDetail = {
  id: 'money-blocked',
  state: 'not_ready',
  stateLabel: 'Blocked',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 68,000' },
  amount: 'KES 68,000',
  currency: 'KES',
  paymentReadiness: 'BLOCKED',
  outstandingReasons: ['SecurePay Money has blocked this agreement for payment. Contact support for more information.'],
  moneyRecordCount: 0,
  nextActions: ['none'],
  availableRails: [],
  activity: [],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  counterpartyName: 'Peter Mwangi',
  isDemoState: true,
};

// Journey O: No evaluation yet
export const moneyNoEvaluation: MoneyDetail = {
  id: 'money-no-evaluation',
  state: 'not_ready',
  stateLabel: 'Money not yet evaluated',
  agreementLink: { agreementId: 'agr-bathroom', agreementTitle: 'Bathroom retiling with Peter', agreementVersion: 'v2', amount: 'KES 68,000' },
  amount: 'KES 68,000',
  currency: 'KES',
  paymentReadiness: 'NO_EVALUATION_YET',
  moneyRecordCount: 0,
  nextActions: ['none'],
  availableRails: [],
  activity: [],
  capacity: 'personal',
  capacityLabel: 'James Kimani — Personal',
  counterpartyName: 'Peter Mwangi',
  isDemoState: true,
};

// ─── Export registry ───────────────────

export const demoMoneyStates: Record<string, MoneyDetail> = {
  'money-home': moneyHome,
  'money-not-ready': moneyNotReady,
  'money-ready': moneyReady,
  'money-ready-no-action': moneyReadyNoAction,
  'money-pending': moneyPending,
  'money-confirmed': moneyConfirmed,
  'money-unknown': moneyUnknown,
  'money-milestone': moneyMilestone,
  'money-dispute': moneyDispute,
  'money-group': moneyGroup,
  'money-stale': moneyStale,
  'money-failed': moneyFailed,
  'money-unavailable': moneyUnavailable,
  'money-partially-ready': moneyPartiallyReady,
  'money-blocked': moneyBlocked,
  'money-no-evaluation': moneyNoEvaluation,
};

export function getDemoMoney(id: string): MoneyDetail | undefined {
  return demoMoneyStates[id];
}

export const paymentReadinessLabel: Record<PaymentReadinessStatus, string> = {
  NO_EVALUATION_YET: 'Money not yet evaluated',
  READY: 'Ready for payment',
  NOT_READY: 'Not ready for payment',
  PARTIALLY_READY: 'Partially ready for payment',
  BLOCKED: 'Blocked',
};

export const nextActionLabel: Record<ParticipantNextAction, string> = {
  FUND_AGREEMENT: 'Fund agreement',
  CHOOSE_METHOD: 'Choose payment method',
  CHECK_STATUS: 'Check status',
  REVIEW_PAYMENT: 'Review payment',
  REFRESH: 'Refresh Money status',
  TRY_AGAIN: 'Try again',
  CHOOSE_ANOTHER: 'Choose another method',
  VIEW_AGREEMENT: 'View agreement',
  none: 'No action available',
};

// Money attention items for signed-in home — populated from next-action projections
export const moneyAttentionItems = [
  {
    id: 'matt-1',
    kind: 'waiting_confirmation' as const,
    title: 'Fund agreement — Bathroom retiling',
    detail: 'KES 20,000 · Tile installation milestone · Authorized next action',
    actionLabel: 'Fund agreement',
    actionValue: 'fund_agreement',
    agreementId: 'agr-bathroom',
  },
  {
    id: 'matt-2',
    kind: 'document_review' as const,
    title: 'Payment confirmation pending',
    detail: 'No action needed yet — waiting for M-PESA confirmation',
    actionLabel: 'Check status',
    actionValue: 'check_status',
    agreementId: 'agr-bathroom',
  },
  {
    id: 'matt-3',
    kind: 'agreement_changed' as const,
    title: 'Check payment status',
    detail: 'SecurePay could not confirm the payment result',
    actionLabel: 'Check status',
    actionValue: 'check_unknown',
    agreementId: 'agr-bathroom',
  },
];
