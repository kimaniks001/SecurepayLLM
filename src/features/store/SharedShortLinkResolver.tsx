import { useEffect, useState } from 'react';
import { ApiError } from '../../api/securepay/http';
import type { StoreGateway } from '../../api/securepay/store';
import type { AgreementGateway } from '../../api/securepay/agreements';

/**
 * A historical #/s/{slug} has TWO legitimate public meanings in SecurePay:
 * old Digital Store addresses and existing Agreement SecureLinks. Never infer
 * identity/Agreement authority from the slug alone or silently hijack either.
 *
 * Check both existing PUBLIC READ endpoints. If exactly one genuinely exists,
 * navigate to its unambiguous route. If both exist, the visitor must choose.
 * If either check has an uncertain network/server response, fail closed and
 * retry rather than falsely claiming one link was missing.
 *
 * No cookies, no authentication, no POST or private details are used here.
 */
type PublicLookup = Pick<StoreGateway, 'publicDigitalAddress'>;
type SecureLinkLookup = Pick<AgreementGateway, 'viewSecureLink'>;
type Resolution = 'checking' | 'store' | 'securelink' | 'both' | 'missing' | 'uncertain';
function publicMiss(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'http' && error.status === 404;
}

export function SharedShortLinkResolver({ slug, store, agreement }: {
  slug: string; store: PublicLookup; agreement: SecureLinkLookup;
}) {
  const [resolution, setResolution] = useState<Resolution>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    setResolution('checking');
    // Each public address and SecureLink endpoint is authority only for itself.
    // Promise.allSettled ensures a 404 in one does not erase a genuine other.
    void Promise.allSettled([
      store.publicDigitalAddress(slug),
      agreement.viewSecureLink(slug),
    ]).then(([storeResult, linkResult]) => {
      if (!mounted) return;
      const storeExists = storeResult.status === 'fulfilled';
      const linkExists = linkResult.status === 'fulfilled';
      const storeMissing = storeResult.status === 'rejected' && publicMiss(storeResult.reason);
      const linkMissing = linkResult.status === 'rejected' && publicMiss(linkResult.reason);
      if ((!storeExists && !storeMissing) || (!linkExists && !linkMissing)) {
        setResolution('uncertain'); return;
      }
      if (storeExists && linkExists) { setResolution('both'); return; }
      if (storeExists) { setResolution('store'); return; }
      if (linkExists) { setResolution('securelink'); return; }
      setResolution('missing');
    });
    return () => { mounted = false; };
  }, [slug, store, agreement, attempt]);

  // Never take the browser to an Agreement/public Store without a confirmed
  // public lookup or a deliberate visitor choice.
  const choose = (kind: 'store' | 'securelink') => {
    window.location.hash = kind === 'store'
      ? '#/shop/' + encodeURIComponent(slug)
      : '#/securelink/' + encodeURIComponent(slug);
  };
  useEffect(() => {
    if (resolution === 'store' || resolution === 'securelink') choose(resolution);
    // The user explicitly resolves BOTH below; an effect must not decide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution, slug]);

  return <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-4 px-5 py-10 text-forest-900">
    <p className="text-xs uppercase tracking-widest text-sand-600">SecurePay public link</p>
    <h1 className="font-display text-2xl">Open your destination</h1>
    {resolution === 'checking' && <p role="status">Checking where this link belongs…</p>}
    {resolution === 'uncertain' && <>
      <p role="alert">SecurePay cannot confirm this link's destination right now. Nothing has been opened or agreed.</p>
      <button type="button" className="min-h-11 rounded-xl border border-forest-200 px-4"
        onClick={() => setAttempt(value => value + 1)}>Try again</button>
    </>}
    {resolution === 'missing' && <p role="status">Neither a published Store nor an available SecureLink could be found for this address.</p>}
    {resolution === 'both' && <>
      <p>Both a public Digital Store and a SecureLink use this older short address. Choose which you intended to open.</p>
      <button type="button" className="min-h-11 rounded-xl border border-forest-200 bg-white px-4 text-left"
        onClick={() => choose('store')}>Open Digital Store</button>
      <button type="button" className="min-h-11 rounded-xl border border-forest-200 bg-white px-4 text-left"
        onClick={() => choose('securelink')}>Review SecureLink</button>
      <p className="text-xs text-sand-600">Opening either destination does not buy, join, accept an Agreement or move money.</p>
    </>}
    {(resolution === 'store' || resolution === 'securelink') && <p role="status">Opening the verified public destination…</p>}
  </main>;
}
