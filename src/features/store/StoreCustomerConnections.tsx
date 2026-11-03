import { useEffect, useState } from 'react';
import { Heart, Send, RefreshCcw } from 'lucide-react';
import type { StoreGateway } from '../../api/securepay/store';
import type { StoreEnquiryDto } from '../../api/securepay/store/dto';
import { ApiError } from '../../api/securepay/http';
import type { StoreOffer } from '../../types';

type Gateway = Pick<StoreGateway, 'myFavourites' | 'saveFavourite' | 'removeFavourite'
  | 'createStoreEnquiry' | 'myCustomerEnquiries'>;

export interface StoreCustomerDraft {
  offerId: string;
  quantity: string;
  message: string;
  clientRequestId: string | null;
}
export const emptyStoreCustomerDraft: StoreCustomerDraft = {
  offerId: '', quantity: '1', message: '', clientRequestId: null,
};

/** Live, self-scoped engagement on a particular trader's public Store. */
export function StoreCustomerConnections({ gateway, sellerKs, storeName, offers, signedIn, sessionEpoch, onContinueWithKs001,
  draft, setDraft, onRequestSignIn }: {
  gateway: Gateway;
  sellerKs: string;
  storeName: string;
  offers: StoreOffer[];
  signedIn: boolean;
  sessionEpoch: object;
  onContinueWithKs001: (enquiry: StoreEnquiryDto) => void;
  draft: StoreCustomerDraft;
  setDraft: (update: (draft: StoreCustomerDraft) => StoreCustomerDraft) => void;
  onRequestSignIn: () => void;
}) {
  const [favourite, setFavourite] = useState(false);
  const [checkingFavourite, setCheckingFavourite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState<StoreEnquiryDto | null>(null);
  const [unknown, setUnknown] = useState(false);
  const published = offers.filter(x => x.lifecycle === 'published');
  const selectedId = published.some(x => x.id === draft.offerId) ? draft.offerId : published[0]?.id ?? '';

  useEffect(() => {
    let active = true;
    setFavourite(false); setConfirmed(null); setUnknown(false); setNotice(''); setError('');
    if (!signedIn) return;
    setCheckingFavourite(true);
    void gateway.myFavourites().then(favourites => {
      if (active) setFavourite(favourites.some(x => x.canonicalKsNumber === sellerKs));
    }).catch(() => { if (active) setError('Could not check your saved Stores.'); })
      .finally(() => { if (active) setCheckingFavourite(false); });
    return () => { active = false; };
  }, [gateway, sellerKs, signedIn, sessionEpoch]);

  async function toggleFavourite() {
    if (!signedIn) { onRequestSignIn(); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (favourite) await gateway.removeFavourite(sellerKs);
      else await gateway.saveFavourite(sellerKs);
      setFavourite(!favourite);
      setNotice(favourite ? 'Store removed from your favourites.' : 'Store saved to your favourites.');
    } catch { setError('SecurePay could not confirm that change. Refresh and check your favourites.'); }
    finally { setBusy(false); }
  }

  async function sendEnquiry() {
    if (!signedIn) { onRequestSignIn(); return; }
    if (!selectedId) { setError('This Store has no available published offer.'); return; }
    const qty = Number(draft.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 1000000) { setError('Enter a positive whole quantity.'); return; }
    if (!draft.message.trim() || draft.message.length > 1000) { setError('Write a short enquiry (up to 1,000 characters).'); return; }
    const key = draft.clientRequestId ?? crypto.randomUUID();
    setDraft(previous => ({ ...previous, offerId: selectedId, clientRequestId: key }));
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await gateway.createStoreEnquiry({
        canonicalKsNumber: sellerKs, offerId: selectedId,
        clientRequestId: key, quantity: qty, message: draft.message.trim(),
      });
      setConfirmed(result); setUnknown(false);
      setNotice('Your enquiry is recorded for this trader. It is not an order or accepted Agreement.');
      setDraft(() => emptyStoreCustomerDraft);
    } catch (failure) {
      const outcomeUnknown = !(failure instanceof ApiError)
        || failure.kind === 'network' || failure.kind === 'timeout'
        || (failure.status ?? 0) >= 500;
      if (outcomeUnknown) {
        // A network interruption may occur AFTER the server committed.
        // The buyer must reconcile/retry using the SAME request key.
        setUnknown(true);
        setError('SecurePay could not confirm the outcome. Check your enquiries or retry the SAME request.');
      } else {
        // A definite 4xx rejection permits revising the proposal; don't trap
        // the customer behind an unknown-outcome retry when nothing was saved.
        setUnknown(false);
        setDraft(previous => ({ ...previous, clientRequestId: null }));
        setError('The trader or offer cannot accept this request as written. Review availability, quantity and terms before trying again.');
      }
    } finally { setBusy(false); }
  }

  async function reconcile() {
    if (!signedIn) return;
    setBusy(true); setError('');
    try {
      const enquiries = await gateway.myCustomerEnquiries();
      // Never infer identity from matching text: only the exact idempotency
      // key proves which interrupted POST the caller is trying to recover.
      const exact = enquiries.find(e => e.clientRequestId === draft.clientRequestId
        && e.sellerKsNumber === sellerKs && e.offerId === selectedId);
      if (exact) {
        setConfirmed(exact); setUnknown(false);
        setDraft(() => emptyStoreCustomerDraft);
        setNotice('Your existing enquiry was found; it has not been sent again.');
      } else setNotice('No matching recorded enquiry found. You can retry with the same request key.');
    } catch { setError('Could not check your enquiry. Keep the draft and try again.'); }
    finally { setBusy(false); }
  }

  const patch = (part: Partial<StoreCustomerDraft>) =>
    setDraft(old => ({ ...old, ...part, clientRequestId: null }));

  return (
    <section aria-label="Connect with this trader" className="mt-4 rounded-2xl border border-forest-200 bg-forest-50/40 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-forest-900">Stay connected with {storeName}</h2>
          <p className="mt-1 text-xs text-sand-600">This is the trader's own digital Store. Connect without entering anyone else's SecurePay Home.</p>
        </div>
        <button type="button" disabled={busy || checkingFavourite} onClick={() => void toggleFavourite()}
          className="min-h-11 flex shrink-0 items-center gap-1.5 rounded-xl border border-forest-200 bg-white px-3 text-xs font-medium text-forest-800 disabled:opacity-50">
          <Heart size={17} fill={favourite ? 'currentColor' : 'none'} />
          {favourite ? 'Saved Store' : 'Add favourite'}
        </button>
      </div>
      {error && <p role="alert" className="rounded-lg bg-orange-50 p-3 text-xs text-orange-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-white p-3 text-xs text-forest-800">{notice}</p>}
      {confirmed && <div className="rounded-xl border border-forest-200 bg-white p-3 text-sm text-forest-800">
        <strong>Enquiry recorded</strong> · {confirmed.status} · {confirmed.offerTitle}
        {confirmed.sellerReply && <p className="mt-1 text-xs">Trader's response: {confirmed.sellerReply}</p>}
        {confirmed.status !== 'DECLINED' && (
          <button type="button" onClick={() => onContinueWithKs001(confirmed)}
            className="mt-3 min-h-11 rounded-xl bg-forest-800 px-4 text-xs font-medium text-white">
            Continue this enquiry with KS001
          </button>
        )}
        <p className="mt-2 text-xs text-sand-600">Your selected offer and proposed enquiry will be checked by SecurePay. Nothing is agreed, booked or funded yet.</p>
      </div>}
      {published.length > 0 ? (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-forest-800">Enquire about an offer
            <select value={selectedId} disabled={busy || unknown}
              onChange={e => patch({ offerId: e.target.value })}
              className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 bg-white px-3 text-sm">
              {published.map(offer => <option key={offer.id} value={offer.id}>{offer.title}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
            <label className="block text-xs font-medium text-forest-800">Quantity
              <input type="number" min="1" max="1000000" step="1" value={draft.quantity} disabled={busy || unknown}
                onChange={e => patch({ quantity: e.target.value })}
                className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 bg-white px-3 text-sm"/>
            </label>
            <label className="block text-xs font-medium text-forest-800">Message to trader
              <textarea rows={2} maxLength={1000} value={draft.message} disabled={busy || unknown}
                onChange={e => patch({ message: e.target.value })}
                placeholder="I'd like to know if you can supply or provide this on Saturday."
                className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-3 text-sm"/>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy} onClick={() => void sendEnquiry()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-4 text-sm font-medium text-white disabled:opacity-50">
              <Send size={15}/>{unknown ? 'Retry same enquiry' : signedIn ? 'Send enquiry' : 'Sign in to enquire'}
            </button>
            {unknown && <button type="button" disabled={busy} onClick={() => void reconcile()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest-200 bg-white px-3 text-xs text-forest-800">
              <RefreshCcw size={14}/> Check existing enquiries
            </button>}
          </div>
          <p className="text-xs text-sand-600">An enquiry requests a response. Nothing is bought, reserved, funded or agreed here. KS001 and the existing Agreement system handle commitments separately.</p>
        </div>
      ) : <p className="text-xs text-sand-600">This Store has no published offers available for enquiries right now.</p>}
    </section>
  );
}
