import { useState } from 'react';

/**
 * A REAL offer photograph -- the seller's own, on the one trusted origin (see store/adapters `media`). It is
 * secondary to the title, seller, price, availability and place, never affects ordering, and is never
 * invented: with no trusted media there is simply no element (no empty box, no placeholder). If the image
 * fails to load it collapses away instead of leaving a broken frame.
 * The accessible name is built ONLY from facts already known (offer title and seller) -- no generated caption.
 * (The API carries no alt text or caption for media; see the Phase 2 doc.)
 */
export function OfferPhoto({ url, title, seller, className = '' }: { url: string; title: string; seller: string; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (failedUrl === url) return null;
  return <img src={url} alt={`Photo of ${title}, published by ${seller}`} loading="lazy" decoding="async" onError={() => setFailedUrl(url)} className={`w-full rounded-xl bg-cream-100 object-cover ${className}`} />;
}
