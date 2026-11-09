/**
 * Phase 4 owner-only funding simulator.
 *
 * SIMULATED means no SecurePayAPI, PSP, bank, STK, ledger, settlement, custody,
 * Agreement authority or participant identity action has occurred.
 *
 * When real payments are implemented, this state machine must NOT be reused as
 * authority. Only the existing signed-in payment-intent/money-snapshot gateways
 * can present server-owned payment options and actual states.
 */
export const MINI_TEST_RAILS = [
  {
    id: 'CHOICE_BANK',
    name: 'Choice Bank',
    category: 'Bank funding',
    detail: 'Illustrates bank-based funding. No account is opened, credited or safeguarded by this test.',
    swDetail: 'Jaribio la malipo ya benki. Hakuna akaunti inayofunguliwa au kupokea pesa.',
  },
  {
    id: 'MPESA',
    name: 'M-Pesa',
    category: 'Mobile money',
    detail: 'Illustrates mobile-money funding. No STK prompt, withdrawal or message is sent.',
    swDetail: 'Jaribio la pesa za simu. Hakuna STK au malipo halisi yanayotumwa.',
  },
  {
    id: 'PESALINK',
    name: 'PesaLink',
    category: 'Bank-to-bank transfer',
    detail: 'Illustrates a bank transfer. No bank account details or transfer instruction are created.',
    swDetail: 'Jaribio la uhamisho wa benki. Hakuna pesa inayohamishwa.',
  },
] as const;
export type MiniTestRailId = (typeof MINI_TEST_RAILS)[number]['id'];
export type MiniFundingTestStatus =
  | 'SELECT_METHOD'
  | 'AWAITING_FAKE_PROVIDER'
  | 'SIMULATED_UNKNOWN'
  | 'SIMULATED_CONFIRMED'
  | 'SIMULATED_FAILED';

export interface MiniFundingTestState {
  method: MiniTestRailId | null;
  status: MiniFundingTestStatus;
  attemptNumber: number;
  /** Sequence value used in the fixture, never a payment/Agreement ID. */
  lastEventNumber: number;
}
export type MiniFundingTestAction =
  | { type: 'SELECT_METHOD'; method: MiniTestRailId }
  | { type: 'START_ATTEMPT' }
  | { type: 'SIMULATE_UNKNOWN' }
  | { type: 'SIMULATE_CONFIRMED' }
  | { type: 'SIMULATE_FAILED' }
  | { type: 'RESOLVE_PENDING' }
  | { type: 'RESET' };

export const INITIAL_MINI_FUNDING_TEST: MiniFundingTestState = Object.freeze({
  method: null, status: 'SELECT_METHOD', attemptNumber: 0, lastEventNumber: 0,
});

export function isMiniTestRail(method: string): method is MiniTestRailId {
  return MINI_TEST_RAILS.some(item => item.id === method);
}

export function miniFundingTestTransition(
  state: MiniFundingTestState, action: MiniFundingTestAction
): MiniFundingTestState {
  if (action.type === 'RESET') return { ...INITIAL_MINI_FUNDING_TEST };
  if (action.type === 'SELECT_METHOD') {
    if (!isMiniTestRail(action.method)) return state;
    if (state.status !== 'SELECT_METHOD' && state.status !== 'SIMULATED_FAILED') return state;
    return { ...state, method: action.method, status: 'SELECT_METHOD', lastEventNumber: state.lastEventNumber + 1 };
  }
  if (action.type === 'START_ATTEMPT') {
    if (!state.method || (state.status !== 'SELECT_METHOD' && state.status !== 'SIMULATED_FAILED')) return state;
    return { ...state, status: 'AWAITING_FAKE_PROVIDER', attemptNumber: state.attemptNumber + 1,
      lastEventNumber: state.lastEventNumber + 1 };
  }
  // A simulated unknown result does NOT authorise retry, switching rails,
  // starting a new attempt or presenting a confirmed funds/ledger position.
  if (action.type === 'SIMULATE_UNKNOWN' && state.status === 'AWAITING_FAKE_PROVIDER')
    return { ...state, status: 'SIMULATED_UNKNOWN', lastEventNumber: state.lastEventNumber + 1 };
  if (action.type === 'RESOLVE_PENDING' && state.status === 'SIMULATED_UNKNOWN')
    return { ...state, status: 'AWAITING_FAKE_PROVIDER', lastEventNumber: state.lastEventNumber + 1 };
  if (action.type === 'SIMULATE_CONFIRMED' &&
    (state.status === 'AWAITING_FAKE_PROVIDER' || state.status === 'SIMULATED_UNKNOWN'))
    return { ...state, status: 'SIMULATED_CONFIRMED', lastEventNumber: state.lastEventNumber + 1 };
  if (action.type === 'SIMULATE_FAILED' &&
    (state.status === 'AWAITING_FAKE_PROVIDER' || state.status === 'SIMULATED_UNKNOWN'))
    return { ...state, status: 'SIMULATED_FAILED', lastEventNumber: state.lastEventNumber + 1 };
  return state;
}

/**
 * Preserve exact human-entered display amount only, not fee or backend truth.
 * No amount is generated for a contribution with an unspecified payer amount.
 */
export function miniTestAmount(raw: string): { minor: number; formatted: string } | null {
  const str = raw.trim().replace(/,/g, '');
  const match = /^(0|[1-9]\d{0,11})(?:\.(\d{1,2}))?$/.exec(str);
  if (!match) return null;
  const minor = BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2,'0') || '0');
  if (minor <= 0n || minor > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const value = Number(minor) / 100;
  return { minor: Number(minor),
    formatted: 'KSh ' + value.toLocaleString('en-KE',{minimumFractionDigits:0,maximumFractionDigits:2}) };
}

export function miniFundingTestWords(status: MiniFundingTestStatus) {
  switch (status) {
    case 'SELECT_METHOD': return {
      title: 'Choose a simulated method',
      detail: 'All three are shown for testing. No live rail availability or price has been checked.',
    };
    case 'AWAITING_FAKE_PROVIDER': return {
      title: 'Waiting for simulated provider result',
      detail: 'No payment was initiated. Use the testing controls to explore what Mini would display.',
    };
    case 'SIMULATED_UNKNOWN': return {
      title: 'Result unknown — SIMULATION',
      detail: 'This outcome is unresolved. Never retry blindly or say paid. In production the backend must reconcile first.',
    };
    case 'SIMULATED_CONFIRMED': return {
      title: 'Provider confirmation simulated',
      detail: 'This is only a visual test. There is NO verified funding, safeguarded allocation or ledger entry.',
    };
    case 'SIMULATED_FAILED': return {
      title: 'Provider failure simulated',
      detail: 'No payment was made. For testing, start a new fictional attempt or select another rail.',
    };
  }
}
