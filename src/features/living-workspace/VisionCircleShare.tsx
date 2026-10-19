import { useEffect, useState } from 'react';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import type { CircleResponse } from '../../api/securepay/community/dto';
import { publishSelectedVisionNote, type VisionCircleExcerpt } from './visionCircleShareAuthority';
export type { VisionCircleExcerpt } from './visionCircleShareAuthority';

function newIntent(): string {
  return globalThis.crypto?.randomUUID?.() ?? 'vision-excerpt-' + Math.random().toString(36).slice(2);
}

export function VisionCircleShare({ excerpt, gateways, session, onClose }: {
  excerpt: VisionCircleExcerpt;
  gateways: PreviewWorkspaceGateways;
  session: SessionStore;
  onClose: () => void;
}) {
  const [circles, setCircles] = useState<CircleResponse[]>([]);
  const [circleId, setCircleId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  // An unknown POST outcome must not be retried under another Circle identity.
  const [attemptedCircleId,setAttemptedCircleId] = useState<string|null>(null);
  const [intent] = useState(newIntent);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await ensureFreshSession(session, gateways.auth);
        if (session.getSnapshot().status !== 'signed-in') throw new Error('Sign in required');
        const mine = await gateways.community.circles.mine(50, 0);
        if (active) setCircles(mine.filter(c => c.status === 'ACTIVE'));
      } catch {
        if (active) setError('SecurePay could not verify the Circles available to you. No material was shared.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [gateways, session]);

  const target = circles.find(c => c.id === circleId) ?? null;
  const share = async () => {
    if (sending || shared || !confirmed || !target || !excerpt.text.trim() ||
        (attemptedCircleId!==null && attemptedCircleId!==target.id)) return;
    setAttemptedCircleId(target.id);
    setSending(true);
    setError(null);
    try {
      await ensureFreshSession(session, gateways.auth);
      if (session.getSnapshot().status !== 'signed-in') throw new Error('Sign in required');
      await publishSelectedVisionNote({
        excerpt, circleId: target.id, intent,
        dreams: gateways.dreams, community: gateways.community,
      });
      setShared(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message :
        'SecurePay could not confirm sharing. Retry the same action; do not create a duplicate.');
    } finally {
      setSending(false);
    }
  };

  return <section role="dialog" aria-modal="true" aria-label="Share one Vision note with a Circle"
    data-vision-circle-share className="rounded-2xl border border-forest-200 bg-white p-4 shadow-lg space-y-3">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-display text-lg text-forest-800">Share one note with a Circle</h3>
      <button type="button" onClick={onClose} disabled={sending}
        className="min-h-11 rounded-lg border border-cream-200 px-3 text-sm">Close</button>
    </div>
    <p className="text-sm text-sand-700">Only this selected text will be posted as a Circle discussion.
      Your private board, photos, documents, other notes and Dream title stay private.</p>
    <blockquote className="max-h-36 overflow-auto whitespace-pre-wrap rounded-xl bg-cream-50 p-3 text-sm text-forest-900">
      {excerpt.text}
    </blockquote>
    {!shared && <>
      <label className="block text-sm font-medium text-forest-800" htmlFor="vision-circle-target">Share with</label>
      <select id="vision-circle-target" value={circleId}
        onChange={event => { setCircleId(event.target.value); setConfirmed(false); }}
        disabled={loading || sending || attemptedCircleId!==null}
        className="min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm">
        <option value="">Choose a Circle</option>
        {circles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
      </select>
      {loading && <p role="status" className="text-xs">Checking your authorised Circles…</p>}
      {!loading && circles.length === 0 && <p className="text-sm text-sand-600">
        No active Circle was confirmed for sharing. Your note remains private.</p>}
      {attemptedCircleId && !shared && <p className="text-xs text-sand-600">
        The sharing result may be uncertain. Retry this same Circle and note rather than changing recipients.
      </p>}
      {target && <label className="flex items-start gap-3 rounded-xl bg-cream-50 p-3 text-sm">
        <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)}
          className="mt-1 size-4" />
        <span>I want to publish exactly this text to <strong>{target.name}</strong>. Circle members
          may read it, and this is not a formal decision or Agreement.</span>
      </label>}
      <button type="button" disabled={!target || !confirmed || sending || loading}
        onClick={() => void share()}
        className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white disabled:opacity-40">
        {sending ? 'Confirming with SecurePay…' : 'Share selected note'}
      </button>
    </>}
    {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">{error}</p>}
    {shared && <p role="status" className="rounded-xl bg-forest-50 p-3 text-sm text-forest-800">
      SecurePay confirmed this selected note in {target?.name}. This did not accept an Agreement or move Money.
    </p>}
  </section>;
}
