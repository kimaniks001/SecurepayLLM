import { useState } from 'react';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { SecureLinkQrCode } from './QrCode';

/**
 * KS001 Upgrade Phase 5 continuation (Slice 2, Sections 7/12–16) — the SecureLink share surface.
 * Encodes the EXACT server-issued `publicUrl` only — never reconstructs a URL from the slug/Agreement id
 * client-side. Supports copy, native share, WhatsApp, print, and a QR code (Section 13; deliberately
 * unbranded this round — see `QrCode.tsx`'s own doctrine comment). WhatsApp/native-share copy is phrased
 * as an invitation to REVIEW, never as payment, acceptance, or a completed trade (Section 14) — opening
 * this link is review-first, never Join/Confirm/pay on its own.
 */
export function ShareCard({ title, purposeSummary, slug, publicUrl }: {
  title: string;
  purposeSummary: string;
  slug: string;
  publicUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const shareText = `Review this SecurePay Agreement: ${title}`;
  const canShare = publicUrl != null;

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can legitimately fail (permissions, insecure context) -- the URL is still
      // visible on screen for the person to select and copy manually.
    }
  }

  function shareNative() {
    if (!publicUrl) return;
    const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (typeof nav.share === 'function') {
      void nav.share({ title, text: shareText, url: publicUrl }).catch(() => { /* the person cancelled or the share sheet failed -- no error state needed */ });
    }
  }

  function shareWhatsApp() {
    if (!publicUrl || typeof window === 'undefined') return;
    const text = `${shareText}\n${publicUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-5 space-y-3">
      <p className="text-xs uppercase tracking-wide text-sand-500">SecureLink</p>
      <h3 className="font-display text-lg text-forest-800">{title}</h3>
      {purposeSummary && purposeSummary !== title && (
        <p className="text-[0.82rem] text-sand-600">{purposeSummary}</p>
      )}
      {canShare ? (
        <>
          <p className="text-[0.82rem] text-sand-700 break-all rounded-lg bg-cream-50 border border-cream-200 px-3 py-2">{publicUrl}</p>
          <div className="flex justify-center py-2" data-testid="securelink-qr">
            <SecureLinkQrCode publicUrl={publicUrl} />
          </div>
          <p className="text-[0.72rem] text-sand-400 text-center">
            Opening this link is a review — it does not join, confirm, or pay anything on its own.
          </p>
        </>
      ) : (
        <StatusNotice tone="info" icon={false}>
          Sharing isn’t configured on this deployment yet — SecurePay hasn’t been given a public web address to
          build links from. The SecureLink itself exists (reference: {slug}); a shareable link will appear here
          once that’s configured.
        </StatusNotice>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="secondary" disabled={!canShare} onClick={() => void copyLink()}>{copied ? 'Copied' : 'Copy link'}</Button>
        <Button variant="secondary" disabled={!canShare} onClick={shareWhatsApp}>WhatsApp</Button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button variant="secondary" disabled={!canShare} onClick={shareNative}>Share…</Button>
        )}
        <Button variant="secondary" onClick={() => window.print()}>Print</Button>
      </div>
    </div>
  );
}
