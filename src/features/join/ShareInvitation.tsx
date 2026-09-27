import { useEffect, useRef, useState } from 'react';
import { Copy, MessageCircle, Share2, X } from 'lucide-react';
import { joinUrl, shareText, whatsAppShareUrl, type JoinInterest } from './share';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300';
const action = `inline-flex min-h-11 w-full items-center gap-3 rounded-xl border border-cream-200 bg-white px-4 text-left text-[0.88rem] font-medium text-forest-800 hover:border-forest-300 hover:bg-cream-50 transition-colors ${focusRing}`;

/**
 * Public Experience Convergence Phase 4 -- the compact share sheet behind "Invite them". WhatsApp opens the
 * standard share composer (no contacts are read or uploaded); Share uses the device share sheet where it
 * exists; Copy link copies the public Join link. The link carries a presentation-only interest and no
 * identity: sharing creates no membership, invitation record, referral, attribution or capacity.
 */
export function ShareInvitation({ interest, onClose, origin }: {
  interest: JoinInterest;
  onClose: () => void;
  /** The app origin the Join link points at (defaults to this page's own origin). */
  origin?: string;
}) {
  const url = joinUrl(origin ?? (typeof window === 'undefined' ? '' : window.location.origin), interest);
  const text = shareText(interest, url);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(typeof document === 'undefined' ? null : document.activeElement);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const opener = openerRef.current;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: 'The Trust Project', text: shareText(interest, '').trim(), url });
    } catch {
      // Cancelled or unavailable: nothing was sent, nothing to undo.
    }
  };

  return (
    <div ref={panelRef} role="dialog" aria-label="Share an invitation" data-share-invitation={interest}
      className="rounded-2xl border border-cream-200 bg-cream-50 p-4 space-y-3 animate-fade-in-up">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.85rem] text-forest-800 leading-relaxed">{text.split('\n\n')[0]}</p>
        <button type="button" onClick={onClose} aria-label="Close" className={`-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sand-600 hover:bg-cream-100 ${focusRing}`}>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <a href={whatsAppShareUrl(text)} target="_blank" rel="noopener noreferrer" className={action}>
          <MessageCircle className="h-4 w-4 text-forest-600" aria-hidden="true" />WhatsApp
        </a>
        {canShare && (
          <button type="button" onClick={() => void share()} className={action}>
            <Share2 className="h-4 w-4 text-forest-600" aria-hidden="true" />Share
          </button>
        )}
        <button type="button" onClick={() => void copy()} className={action}>
          <Copy className="h-4 w-4 text-forest-600" aria-hidden="true" />Copy link
        </button>
      </div>
      <p role="status" className="min-h-[1.25rem] text-[0.78rem] text-forest-700">
        {copied ? 'Link copied' : copyFailed ? `Copy this link: ${url}` : ''}
      </p>
      <p className="text-[0.75rem] text-sand-600">
        Sharing only sends a link. They choose whether to join, and everyone joins as a Member. An invitation is not a referral, and recruiting members earns nothing automatically.
      </p>
    </div>
  );
}
