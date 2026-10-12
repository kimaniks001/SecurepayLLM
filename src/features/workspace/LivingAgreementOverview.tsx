import type { AgreementCompletionResponse, AgreementDetailResponse, MilestoneEffectiveStateResponse, WorkspaceNextActionResponse } from '../../api/securepay/agreements/dto';
import { completionFacts } from '../execution/display';
import { moneyText, minorFromString } from '../money/amount';
import type { CalendarEventView } from './view';
import { AgreementNextStep, resolveAgreementNext } from './AgreementNextStep';

const detailActionClass = 'min-h-11 rounded-xl border border-cream-200 bg-white px-4 py-3 text-left text-sm text-forest-800 hover:border-forest-400 focus-visible:ring-2 focus-visible:ring-forest-400';

function agreementAmount(detail: AgreementDetailResponse) {
  const minor = minorFromString(detail.overview.proposedAmountMinor);
  return minor == null ? 'Amount not yet specified' : moneyText(minor, detail.overview.currency);
}

/**
 * Phase 4 â€” the Agreement remains the visible centre. This component is intentionally NOT a dashboard:
 * it shows the Agreement, one server-backed next step, then progressively disclosed record areas.
 * It never derives Money permission, evidence acceptance, completion, participant authority or a
 * Community Saver in React.
 */
export function LivingAgreementOverview({ detail, effectiveStates: _effectiveStates, completion, nextActions, nextActionsKnown = true, events = [], onProgress, onPeople, onDocuments, onChanges, onMoney, onAskKs001 }: {
  detail: AgreementDetailResponse;
  effectiveStates: MilestoneEffectiveStateResponse[]¶»§q«^