import type { AgreementGateway } from '../../api/securepay/agreements';
import { resolveHandoffContext, type MoneyHandoff } from './handoff';

export interface SelectionTarget { agreementId: string; title: string; currency: string | null; summaryAmountMinor: string | null }
export interface ResolvedSelection { chosen: SelectionTarget; label: string; notice: string | null; versionId: string | null }
export const CONTEXT_UNREFRESHED = 'This Agreement’s current context couldn’t be refreshed, so version details are not shown. Money below is read directly from SecurePay.';

/**
 * Selecting an Agreement re-reads it by id (`GET /agreements/{id}/detail`): an exact, authorised read that returns the current version. The paginated
 * `/me/agreements` list is never searched to establish a version or to conclude an Agreement "can't be found" (it can be fully accessible yet off page 1).
 * If the exact read fails, nothing is claimed about access and version-dependent presentation fails closed.
 */
export async function resolveSelection(gateway: Pick<AgreementGateway, 'detail'>, target: SelectionTarget, source?: MoneyHandoff | null): Promise<ResolvedSelection> {
  try {
    const detail = await gateway.detail(target.agreementId);
    const versionId = detail.currentVersion?.versionId ?? null;
    const chosen = { agreementId: target.agreementId, title: detail.overview.title, currency: detail.overview.currency, summaryAmountMinor: detail.overview.proposedAmountMinor };
    if (!source) return { chosen, label: chosen.title, notice: null, versionId };
    const resolved = resolveHandoffContext(source, { title: chosen.title, currentAgreementVersionId: versionId });
    return { chosen, label: resolved.context, notice: resolved.notice, versionId };
  } catch {
    return { chosen: target, label: source ? source.title : target.title, notice: CONTEXT_UNREFRESHED, versionId: null };
  }
}
