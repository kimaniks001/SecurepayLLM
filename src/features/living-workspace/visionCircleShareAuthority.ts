import type { VisionDreamGateway } from '../../api/securepay/visiondreams';
import type { CommunityGateway } from '../../api/securepay/community';

/** A per-item, reviewed text-only disclosure. Never a whole-board share. */
export interface VisionCircleExcerpt {
  dreamId: string;
  dreamTitle: string;
  boardRevision: number;
  objectId: string;
  kind: 'note' | 'text' | 'checklist' | 'frame';
  text: string;
}
const SHAREABLE = new Set(['note', 'text', 'checklist', 'frame']);

/** SecurePay is the authority for both the source Dream and target Circle.
 * Reverify both at the exact publish action, not merely when opening a dialog.
 * Retain the same idempotency key for an uncertain outcome/retry. */
export async function publishSelectedVisionNote(input: {
  excerpt: VisionCircleExcerpt;
  circleId: string;
  intent: string;
  dreams: Pick<VisionDreamGateway, 'get' | 'board'>;
  community: Pick<CommunityGateway, 'circles'>;
}) {
  const { excerpt, circleId, intent, dreams, community } = input;
  if (!circleId || !intent || !excerpt.text.trim() || excerpt.text.length > 4000 ||
      !SHAREABLE.has(excerpt.kind) || excerpt.boardRevision < 1) {
    throw new Error('Choose one saved text note of up to 4,000 characters.');
  }
  const [dream, board] = await Promise.all([
    dreams.get(excerpt.dreamId),
    dreams.board(excerpt.dreamId),
  ]);
  if (dream.dreamId !== excerpt.dreamId || board.revision !== excerpt.boardRevision ||
      board.schemaVersion !== 1) {
    throw new Error('The Dream changed. Review the latest saved board before sharing.');
  }
  const document: unknown = JSON.parse(board.documentJson);
  if (typeof document !== 'object' || document === null || !('v' in document) ||
      document.v !== 1 || !('objects' in document) || !Array.isArray(document.objects)) {
    throw new Error('The saved Dream board is not readable.');
  }
  const selected: unknown = document.objects.find((o: unknown) =>
    typeof o === 'object' && o !== null && 'id' in o && o.id === excerpt.objectId);
  if (typeof selected !== 'object' || selected === null ||
      !('kind' in selected) || selected.kind !== excerpt.kind ||
      !('text' in selected) || selected.text !== excerpt.text ||
      !SHAREABLE.has(excerpt.kind)) {
    throw new Error('The selected note changed. Review the current Dream before sharing.');
  }
  const [circle, membership] = await Promise.all([
    community.circles.get(circleId),
    community.circles.membership(circleId),
  ]);
  if (circle.id !== circleId || circle.status !== 'ACTIVE' ||
      !(membership.isOwner || membership.status === 'ACTIVE')) {
    throw new Error('Active Circle membership was not confirmed.');
  }
  // DISCUSSION is not a vote or an accepted decision. Do not expose the
  // source Dream's title/ID, image asset bytes, or any unselected board item.
  const posted = await community.circles.objects.create(
    circleId, 'DISCUSSION', 'Shared Vision note', excerpt.text, null, intent);
  if (posted.circleId !== circleId || posted.objectType !== 'DISCUSSION') {
    throw new Error('SecurePay did not confirm the intended Circle post.');
  }
  return posted;
}
