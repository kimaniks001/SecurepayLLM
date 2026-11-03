import { useEffect, useState } from 'react';
import { Inbox, RefreshCcw, Send } from 'lucide-react';
import type { StoreGateway } from '../../api/securepay/store';
import type { StoreEnquiryDto } from '../../api/securepay/store/dto';

type Gateway = Pick<StoreGateway, 'myStoreEnquiries' | 'businessStoreEnquiries'
  | 'respondStoreEnquiry' | 'respondBusinessStoreEnquiry'>;

/** Actual seller-side Inbox: never invented activity/notifications. */
export function StoreEnquiryInbox({ gateway, businessKs, sessionEpoch }: {
  gateway: Gateway;
  businessKs: string | null;
  sessionEpoch: object;
}) {
  const [items, setItems] = useState<StoreEnquiryDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function load(active = () => true) {
    setLoading(true); setError('');
    try {
      const result = businessKs
        ? await gateway.businessStoreEnquiries(businessKs)
        : await gateway.myStoreEnquiries();
      if (active()) setItems(result);
    } catch { if (active()) setError('Could not read your Store enquiries.'); }
    finally { if (active()) setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    setItems([]); setMessages({}); setNotice('');
    void load(() => active);
    return () => { active = false; };
    // Must follow selected owner/Business representation only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateway, businessKs, sessionEpoch]);

  async function respond(item: StoreEnquiryDto, status: 'REPLIED' | 'DECLINED') {
    const text = (messages[item.id] ?? '').trim();
    if (!text || text.length > 1000) { setError('Write a reply before sending.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const result = businessKs
        ? await gateway.respondBusinessStoreEnquiry(businessKs, item.id, { status, message: text })
        : await gateway.respondStoreEnquiry(item.id, { status, message: text });
      setItems(current => current.map(x => x.id === result.id ? result : x));
      setMessages(current => ({ ...current, [item.id]: '' }));
      setNotice(status === 'DECLINED'
        ? 'The customer can now see your decline in their Store enquiries.'
        : 'Your reply is recorded. This does not accept an order or Agreement.');
    } catch {
      setError('The response could not be confirmed. Refresh the inbox before trying again to avoid conflicting replies.');
    } finally { setBusy(false); }
  }

  return (
    <section aria-label="Real Store enquiries" className="rounded-2xl border border-forest-200 bg-white p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl text-forest-900"><Inbox size={20}/> Customer enquiries</h2>
          <p className="mt-1 text-xs text-sand-600">Genuine enquiries received by this Store. Review and respond from anywhere.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={busy || loading}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-cream-200 px-4 text-sm text-forest-800 disabled:opacity-50">
          <RefreshCcw size={15}/> Refresh
        </button>
      </div>
      {loading && <p role="status" className="text-sm text-sand-600">Checking real Store enquiries…</p>}
      {error && <p role="alert" className="rounded-xl bg-orange-50 p-3 text-xs text-orange-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-forest-50 p-3 text-xs text-forest-800">{notice}</p>}
      {!loading && items.length === 0 && !error && (
        <p className="rounded-xl bg-cream-50 p-4 text-sm text-sand-600">
          No customer enquiries have reached this Store yet. Share your digital Store address to invite customers.
        </p>
      )}
      <div className="space-y-3">
        {items.map(item => (
          <article key={item.id} className="rounded-xl border border-cream-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm text-forest-900">{item.offerTitle}</strong>
              <span className="rounded-full bg-cream-100 px-2 py-1 text-xs font-medium text-sand-700">{item.status}</span>
            </div>
            <p className="mt-1 text-xs text-sand-600">Customer {item.buyerKsNumber} · Quantity {item.requestedQuantity}</p>
            <p className="mt-2 text-sm text-forest-800">{item.customerMessage}</p>
            {item.offeredPriceMinorSnapshot !== null && <p className="mt-1 text-xs text-sand-600">
              Listed price when requested: KES {(item.offeredPriceMinorSnapshot / 100).toLocaleString()}. Not a confirmed quotation.
            </p>}
            {item.status === 'REQUESTED' ? (
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-medium text-forest-800">Your response
                  <textarea rows={2} maxLength={1000} disabled={busy}
                    value={messages[item.id] ?? ''} onChange={e => setMessages(old => ({ ...old, [item.id]: e.target.value }))}
                    placeholder="Yes, we can discuss availability and delivery on Saturday."
                    className="mt-1 w-full rounded-lg border border-cream-200 p-3 text-sm"/>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busy} onClick={() => void respond(item, 'REPLIED')}
                    className="flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-4 text-sm font-medium text-white disabled:opacity-50">
                    <Send size={15}/> Reply to customer
                  </button>
                  <button disabled={busy} onClick={() => void respond(item, 'DECLINED')}
                    className="min-h-11 rounded-xl border border-cream-200 px-4 text-sm text-forest-800 disabled:opacity-50">
                    Decline enquiry
                  </button>
                </div>
              </div>
            ) : <p className="mt-3 rounded-lg bg-cream-50 p-3 text-xs text-sand-700">
              Your {item.status === 'DECLINED' ? 'decline' : 'reply'}: {item.sellerReply}
            </p>}
          </article>
        ))}
      </div>
      <p className="text-xs text-sand-600">This inbox is an on-platform enquiry record. Push, SMS and WhatsApp delivery have not been claimed or enabled here.</p>
    </section>
  );
}
