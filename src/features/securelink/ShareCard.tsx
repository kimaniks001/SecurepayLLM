import { useState } from 'react';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';

/**
 * KS001 Upgrade Phase 5 (SecureLink & Money Continuation, Section 7) — the SecureLink share surface.
 * Encodes the EXACT server-issued `publicUrl` only — never reconstructs a URL from the slug/Agreement id
 * client-side. Supports copy, native share, and WhatsApp; print uses the browser's own print dialog over
 * this same card. QR code generation is deliberately NOT included in this round (see the Phase 5
 * completion report's own "Remaining limitations" — no QR library has been evaluated/approved yet, and
 * shipping an unverified hand-rolled encoder risks a code that fails to scan, which is worse than not
 * shipping one).
 */
export function ShareCard({ title, purposeSummary, slug, publicUrl }: {
  title: string;
  purposeSummary: string;
  slug: string;
  publicUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const shareText = `${title}: ${purposeSummary}`;
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
      {canShare ? (
        <p className="text-[0.82rem] text-sand-700 break-all rounded-lg bg-cream-50 border border-cream-200 px-3 py-2">{publicUrl}</p>
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
