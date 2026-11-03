import { useEffect, useState } from 'react';
import { Copy, Heart, MessageCircle, RefreshCcw, Store } from 'lucide-react';
import type { StoreGateway } from '../../api/securepay/store';
import type { StoreEnquiryDto, StoreFavouriteDto } from '../../api/securepay/store/dto';

type Gateway = Pick<StoreGateway, 'myFavourites' | 'myCustomerEnquiries'>;

/**
 * Customer-to-trader discovery loop.
 * For traders who are NOT registered, this creates only shareable invitation
 * COPY on the resident's device: no ghost Store, unsolicited SMS, or "sent" status.
 */
export function StoreConnectionsHome({ gateway, signedIn, sessionEpoch, onContinueWithKs001 }: { gateway: Gateway; signedIn: boolean; sessionEpoch: object; onContinueWithKs001: (enquiry: StoreEnquiryDto) => void }) {
  const [favourites, setFavourites] = useState<StoreFavouriteDto[]>([]);
  const [enquiries, setEnquiries] = useState<StoreEnquiryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [readError, setReadError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [traderName, setTraderName] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [copyNotice, setCopyNotice] = useState('');

  async function refresh(active = () => true) {
    if (!signedIn) return;
    setLoading(true); setReadError('');
    try {
      const [f, e] = await Promise.all([gateway.myFavourites(), gateway.myCustomerEnquiries()]);
      if (active()) { setFavourites(f); setEnquiries(e); }
    } catch {
      if (active()) setReadError('Could not check your favourite Stores and enquiries.');
    } finally { if (active()) setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    setFavourites([]); setEnquiries([]);
    if (!signedIn) return;
    void refresh(() => active);
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, gateway, sessionEpoch]);

  const inviteUrl = typeof window !== 'undefined'
    ? window.location.origin + window.location.pathname + '#/store/open'
    : '';
  const invitationText = `Hello ${traderName.trim() || 'there'}, I'd love to find and support your own digital Store. You can set up your Store and start with your first offer here: ${inviteUrl}\n\nThis invitation is to YOUR digital Store, not my SecurePay account. You decide what to publish and share.${inviteNote.trim() ? '\n\n' + inviteNote.trim() : ''}`;

  async function copyInvite() {
    setCopyNotice('');
    if (!traderName.trim()) { setCopyNotice('Add the trader’s name first.'); return; }
    try {
      await navigator.clipboard.writeText(invitationText);
      setCopyNotice('Invitation text copied. You choose who to share it with; nothing has been sent.');
    } catch {
      setCopyNotice('Please select and copy the invitation text manually. Nothing has been sent.');
    }
  }

  return (
    <section aria-label="Connected Store community" className="rounded-2xl border border-forest-200 bg-white p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-forest-900">Stores in your community</h2>
          <p className="mt-1 text-xs text-sand-600">Your favourite traders are one tap away—even when their physical shops are closed.</p>
        </div>
        <button type="button" onClick={() => setInviteOpen(!inviteOpen)}
          className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm font-medium text-white">
          Add my favourite
        </button>
      </div>
      {inviteOpen && (
        <div className="rounded-xl bg-cream-50 p-4 space-y-3">
          <h3 className="font-medium text-forest-800">Invite a trader to open their own digital Store</h3>
          <p className="text-xs text-sand-600">If they're already on SecurePay, open their Store and save it as a favourite. Otherwise, prepare an invitation they can choose to accept.</p>
          <label className="block text-xs font-medium text-forest-800">Trader or business name
            <input value={traderName} maxLength={120} onChange={e => setTraderName(e.target.value)}
              placeholder="My favourite electrician / hardware Store" className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 bg-white px-3 text-sm"/>
          </label>
          <label className="block text-xs font-medium text-forest-800">Optional personal note
            <textarea value={inviteNote} maxLength={300} onChange={e => setInviteNote(e.target.value)}
              placeholder="Your work is excellent. I'd love to find your services online too."
              rows={2} className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-3 text-sm"/>
          </label>
          <label className="block text-xs font-medium text-forest-800">Invitation preview
            <textarea readOnly value={invitationText} rows={5}
              className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-3 text-xs"/>
          </label>
          {copyNotice && <p role="status" className="text-xs text-forest-800">{copyNotice}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copyInvite()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-4 text-xs font-medium text-white">
              <Copy size={15}/> Copy invitation
            </button>
            {traderName.trim() && <a href={`https://wa.me/?text=${encodeURIComponent(invitationText)}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest-200 bg-white px-4 text-xs font-medium text-forest-800">
              <MessageCircle size={15}/> Choose recipient in WhatsApp
            </a>}
          </div>
          <p className="text-xs text-sand-600">The trader opens their own first-offer setup, not your Home. SecurePay neither contacts them nor creates a Store without their action. Sending and acceptance are not tracked here.</p>
        </div>
      )}
      {signedIn && (
        <div className="space-y-3 border-t border-cream-200 pt-3">
          <div className="flex justify-between items-center gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium text-forest-800"><Heart size={16}/> My favourite Stores</h3>
            <button type="button" onClick={() => void refresh()} disabled={loading}
              className="inline-flex min-h-10 items-center gap-1 text-xs text-forest-700 disabled:opacity-50"><RefreshCcw size={13}/> Refresh</button>
          </div>
          {loading && <p role="status" className="text-xs text-sand-500">Checking your Stores…</p>}
          {readError && <p role="alert" className="text-xs text-orange-800">{readError}</p>}
          {!loading && !readError && favourites.length === 0 && <p className="text-xs text-sand-500">No saved Stores yet. Open a published trader Store to add one.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {favourites.map(item => <a href={`#/s/${item.slug}`} key={item.canonicalKsNumber}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-cream-200 px-3 py-3 text-sm text-forest-800 hover:bg-cream-50">
              <Store size={17}/> <span className="flex-1"><strong>{item.storeName}</strong><br/><span className="text-xs text-sand-600">{item.serviceArea ?? 'Service area not stated'}</span></span>
            </a>)}
          </div>
          <h3 className="text-sm font-medium text-forest-800">My recent enquiries</h3>
          {!loading && !readError && enquiries.length === 0 && <p className="text-xs text-sand-500">You haven't sent any Store enquiries yet.</p>}
          <div className="space-y-2">
            {enquiries.slice(0,5).map(enquiry => <div key={enquiry.id}
              className="rounded-xl border border-cream-200 px-3 py-3 text-xs text-forest-800">
              <a href={`#/store/${encodeURIComponent(enquiry.sellerKsNumber)}/offer/${encodeURIComponent(enquiry.offerId)}`}
                className="font-medium underline">{enquiry.storeName} · {enquiry.offerTitle}</a>
              <span className="ml-2 font-semibold">{enquiry.status}</span>
              {enquiry.sellerReply && <p className="mt-1 text-sand-700">Trader: {enquiry.sellerReply}</p>}
              {enquiry.status !== 'DECLINED' && <button type="button"
                className="mt-2 min-h-11 rounded-xl border border-forest-200 bg-white px-3 text-xs text-forest-800"
                onClick={() => onContinueWithKs001(enquiry)}>
                Continue enquiry with KS001
              </button>}
            </div>)}
          </div>
        </div>
      )}
      {!signedIn && <p className="text-xs text-sand-600">Browsing and inviting traders are public. Sign in only when saving a favourite or sending a genuine enquiry.</p>}
    </section>
  );
}
