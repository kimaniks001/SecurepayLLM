import type { AgreementDetailResponse } from '../../api/securepay/agreements/dto';
import { CONTEXT_UNREFRESHED } from '../money/selection';
import type { SupportContext } from './context';

export interface HelpLabel {
  /** The fresh Agreement title, or the SOURCE title when the fresh read failed (then `titleConfirmed` is false). */
  title: string;
  titleConfirmed: boolean;
  /** The source screen's version label, kept ONLY when its version id equals the fresh current version id. */
  versionLabel: string | null;
  /** The fresh current version id from the exact Agreement Detail read; null when it couldn't be established. */
  currentVersionId: string | null;
  /** A version label built from the SAME fresh read as `currentVersionId` (for handing off to Money). */
  freshVersionLabel: string | null;
  notice: string | null;
}
export const HELP_CHANGED_NOTICE = 'The Agreement changed after you opened Help. Help is showing the latest Agreement SecurePay can read.';

type Fresh = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: Pick<AgreementDetailResponse, 'overview' | 'currentVersion'> };

/**
 * Every contextual Help re-reads the exact Agreement Detail. Versions are compared by their IDS -- never by formatted display text. Only an exact id match
 * keeps the source version label; if either id is unavailable the label is dropped; if both exist and differ the label is dropped and a calm notice is shown.
 */
export function resolveHelpLabel(ctx: SupportContext, fresh: Fresh | null): HelpLabel {
  if (!fresh || fresh.status === 'loading') return { title: ctx.title, titleConfirmed: false, versionLabel: null, currentVersionId: null, freshVersionLabel: null, notice: null };
  if (fresh.status === 'error') return { title: ctx.title, titleConfirmed: false, versionLabel: null, currentVersionId: null, freshVersionLabel: null, notice: CONTEXT_UNREFRESHED };
  const freshId = fresh.data.currentVersion?.versionId ?? null;
  const freshNumber = fresh.data.currentVersion?.versionNumber;
  const sourceId = ctx.currentVersionId;
  const idsMatch = !!sourceId && !!freshId && sourceId === freshId;
  const idsDiffer = !!sourceId && !!freshId && sourceId !== freshId;
  const versionLabel = 'versionLabel' in ctx && idsMatch ? ctx.versionLabel : null;
  const changed = idsDiffer || fresh.data.overview.title !== ctx.title;
  return { title: fresh.data.overview.title, titleConfirmed: true, versionLabel, currentVersionId: freshId, freshVersionLabel: freshNumber === undefined ? null : `version ${freshNumber}`, notice: changed ? HELP_CHANGED_NOTICE : null };
}
