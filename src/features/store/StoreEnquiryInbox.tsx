import { useEffect, useRef, useState } from 'react';
import { Inbox, RefreshCcw, Save, Send } from 'lucide-react';
import type { StoreGateway } from '../../api/securepay/store';
import type { StoreEnquiryDto } from '../../api/securepay/store/dto';

type Gateway = Pick<StoreGateway,
  'myStoreEnquiries' | 'businessStoreEnquiries'
  | 'respondStoreEnquiry' | 'respondBusinessStoreEnquiry'
  | 'personalEnquiryDraft' | 'savePersonalEnquiryDraft'
  | 'businessEnquiryDraft' | 'saveBusinessEnquiryDraft'>;

/**
 * Real Store inbox with durable private reply drafts and foreground readback.
 * A draft can be resumed on another signed-in device; only an explicit Reply
 * or Decline changes the canonical customer-facing enquiry status.
 */
export function StoreEnquiryInbox({ gateway, businessKs, sessionEpoch, focusedEnquiryId = null }: {
  gateway: Gateway;
  businessKs: string | null;
  sessionEpoch: object;
  focusedEnquiryId?: string | null;
}) {
  const scopeRef = useRef(sessionEpoch);
  const businessScopeRef = useRef(businessKs);
  scopeRef.current = sessionEpoch;
  businessScopeRef.current = businessKs;
  const [items, setItems] = useState<StoreEnquiryDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<Record<string, number>>({});
  const [savedText, setSavedText] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load(active = () => true, quiet = false) {
    const expectedScope = sessionEpoch;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const result = businessKs
        ? await gateway.businessStoreEnquiries(businessKs)
        : await gateway.myStoreEnquiries();
      if (active() && scopeRef.current === expectedScope && businessScopeRef.current === businessKs) setItems(result);
    } catch {
      if (active() && scopeRef.current === expectedScope && businessScopeRef.current === businessKs) {
        // Fail closed: don't keep showing a former representative's private
        // enquiries after a permission or session error.
        setItems([]);
        setError('Could not read this Store’s enquiries. Check your permissions and refresh.');
      }
    } finally {
      if (active() && scopeRef.current === expectedScope && businessScopeRef.current === businessKs) setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    setItems([]); setMessages({}); setVersions({}); setSavedText({});
    setEditingId(null); setNotice('');
    void load(() => active);
    const refreshWhenVisible = () => {
      if (active && document.visibilityState === 'visible')
        void load(() => active, true);
    };
    const timer = window.setInterval(refreshWhenVisible, 45_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateway, businessKs, sessionEpoch]);

  useEffect(() => {
    if (!focusedEnquiryId || !items.some(x => x.id === focusedEnquiryId)) return;
    document.getElementById('seller-enquiry-' + focusedEnquiryId)?.scrollIntoView({ block: 'center' });
  }, [focusedEnquiryId, items]);

  async function openReply(item: StoreEnquiryDto) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    const expectedScope = sessionEpoch;
    try {
      const draft = businessKs
        ? await gateway.businessEnquiryDraft(businessKs, item.id)
        : await gateway.personalEnquiryDraft(item.id);
      if ((scopeRef.current !== expectedScope || businessScopeRef.current !== businessKs)) return;
      setMessages(current => ({ ...current, [item.id]: draft.message }));
      setVersions(current => ({ ...current, [item.id]: draft.version }));
      setSavedText(current => ({ ...current, [item.id]: draft.message }));
      setEditingId(item.id);
      setNotice(draft.version > 0 ? 'Your saved Store reply draft was restored.' : 'Your reply is not sent until you choose Reply or Decline.');
    } catch {
      if (scopeRef.current === expectedScope && businessScopeRef.current === businessKs)
        setError('Could not confirm your private reply draft. Do not type over an unverified saved version.');
    } finally {
      if (scopeRef.current === expectedScope && businessScopeRef.current === businessKs) setBusy(false);
    }
  }

  async function saveDraft(item: StoreEnquiryDto) {
    if (busy || editingId !== item.id || versions[item.id] === undefined) return;
    const message = messages[item.id] ?? '';
    const expectedScope = sessionEpoch;
    setBusy(true); setError(''); setNotice('');
    try {
      const request = { message, expectedVersion: versions[item.id] };
      const saved = businessKs
        ? await gateway.saveBusinessEnquiryDraft(businessKs, item.id, request)
        : await gateway.savePersonalEnquiryDraft(item.id, request);
      if ((scopeRef.current !== expectedScope || businessScopeRef.current !== businessKs)) return;
      setVersions(current => ({ ...current, [item.id]: saved.version }));
      setSavedText(current => ({ ...current, [item.id]: saved.message }));
      setNotice('Reply draft saved privately. You can reopen it from another device.');
    } catch {
      if (scopeRef.current === expectedScope && businessScopeRef.current === businessKs)
        setError('Draft was NOT confirmed saved. Another device may have a newer version. Keep your words here and reload before overwriting.');
    } finally {
      if (scopeRef.current === expectedScope && businessScopeRef.current === businessKs) setBusy(false);
    }
  }

  async function respond(item: StoreEnquiryDto, status: 'REPLIED' | 'DECLINED') {
    if (busy || editingId !== item.id) return;
    const text = (messages[item.id] ?? '').trim();
    if (!text || text.length > 1000) { setError('Write a reply before sending.'); return; }
    const expectedScope = sessionEpoch;
    setBusy(true); setError(''); setNotice('');
    try {
      // Recheck a newer saved reply draft before consequential transmission:
      // an old phone must not unknowingly send a superseded draft.
      const latest = businessKs
        ? await gateway.businessEnquiryDraft(businessKs, item.id)
        : await gateway.personalEnquiryDraft(item.id);
      if ((scopeRef.current !== expectedScope || businessScopeRef.current !== businessKs)) return;
      if (versions[item.id] !== latest.version)
        throw new Error('Reply draft changed on another device');
      const result = businessKs
        ? await gateway.respondBusinessStoreEnquiry(businessKs, item.id, { status, message: text, expectedDraftVersion: latest.version })
        : await gateway.respondStoreEnquiry(item.id, { status, message: text, expectedDraftVersion: latest.version });
      if ((scopeRef.current !== expectedScope || businessScopeRef.current !== businessKs)) return;
      setItems(current => current.map(x => x.id === result.id ? result : x));
      setMessages(current => ({ ...current, [item.id]: '' }));
      setEditingId(null);
      setNotice(status === 'DECLINED'
        ? 'Your decline is recorded and the customer can read it.'
        : 'Your reply is recorded and the customer can read it. This does not accept an Agreement.');
    } catch {
      if (scopeRef.current === expectedScope && businessScopeRef.current === businessKs)
        setError('Response not confirmed, or a newer draft exists. Refresh and compare before retrying. Do not assume it was sent.');
    } finally {
      if (scopeRef.current === expectedScope && businessScopeRef.current === businessKs) setBusy(false);
    }
  }

  const focused = items.find(item => item.id === focusedEnquiryId);
  const display = focused
    ? [focused, ...items.filter(item => item.id !== focusedEnquiryId)]
    : items;

  return (
    <section aria-label="Real Store enquiries" className="rounded-2xl border border-forest-200 bg-white p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl text-forest-900"><Inbox size={20}/> Customer enquiries</h2>
          <p className="mt-1 text-xs text-sand-600">Actual requests to this Store, available when you sign in from another phone.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={busy || loading}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-cream-200 px-4 text-sm text-forest-800 disabled:opacity-50">
          <RefreshCcw size={15}/> Refresh
        </button>
      </div>
      {loading && <p role="status" className="text-sm text-sand-600">Checking your Store enquiries…</p>}
      {error && <p role="alert" className="rounded-xl bg-orange-50 p-3 text-xs text-orange-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-forest-50 p-3 text-xs text-forest-800">{notice}</p>}
      {!loading && focusedEnquiryId && !focused && !error &&
        <p role="status" className="text-xs text-sand-600">
          This enquiry is not accessible in the selected Store. Select another represented Store if appropriate.
        </p>}
      {!loading && items.length === 0 && !error && (
        <p className="rounded-xl bg-cream-50 p-4 text-sm text-sand-600">
          No customer enquiries have reached this Store yet. Share its address to invite real customer enquiries.
        </p>
      )}
      <div className="space-y-3">
        {display.map(item => (
          <article id={'seller-enquiry-' + item.id} key={item.id}
            className={`rounded-xl border p-4 ${item.id === focusedEnquiryId ? 'border-forest-500 bg-forest-50/30' : 'border-cream-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm text-forest-900">{item.offerTitle}</strong>
              <span className="rounded-full bg-cream-100 px-2 py-1 text-xs font-medium text-sand-700">{item.status}</span>
            </div>
            <p className="mt-1 text-xs text-sand-600">Customer {item.buyerKsNumber} · Quantity {item.requestedQuantity}</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-forest-800">{item.customerMessage}</p>
            {item.offeredPriceMinorSnapshot !== null && <p className="mt-1 text-xs text-sand-600">
              Listed price when requested: KES {(item.offeredPriceMinorSnapshot / 100).toLocaleString()}. Not a confirmed quotation.
            </p>}
            {item.status === 'REQUESTED' ? (
              editingId === item.id ? <div className="mt-3 space-y-2">
                <label className="block text-xs font-medium text-forest-800">Your unsent reply
                  <textarea rows={3} maxLength={1000} disabled={busy}
                    value={messages[item.id] ?? ''} onChange={e => setMessages(old => ({ ...old, [item.id]: e.target.value }))}
                    placeholder="Yes, we can discuss availability and delivery on Saturday."
                    className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-3 text-sm"/>
                </label>
                <p className="text-xs text-sand-600">
                  {messages[item.id] === savedText[item.id]
                    ? versions[item.id] > 0 ? 'Saved privately on SecurePay' : 'Nothing saved yet'
                    : 'Edited on this device — not saved yet'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busy} onClick={() => void saveDraft(item)}
                    className="flex min-h-11 items-center gap-2 rounded-xl border border-forest-200 bg-white px-3 text-sm text-forest-800 disabled:opacity-50">
                    <Save size={15}/> Save draft for later
                  </button>
                  <button disabled={busy} onClick={() => void respond(item, 'REPLIED')}
                    className="flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-3 text-sm font-medium text-white disabled:opacity-50">
                    <Send size={15}/> Reply
                  </button>
                  <button disabled={busy} onClick={() => void respond(item, 'DECLINED')}
                    className="min-h-11 rounded-xl border border-cream-200 px-3 text-sm text-forest-800 disabled:opacity-50">
                    Decline
                  </button>
                </div>
              </div> : <button type="button" disabled={busy} onClick={() => void openReply(item)}
                className="mt-3 min-h-11 rounded-xl border border-forest-200 px-4 text-xs font-medium text-forest-800 disabled:opacity-50">
                Open reply & saved draft
              </button>
            ) : <p className="mt-3 rounded-lg bg-cream-50 p-3 text-xs text-sand-700">
              Your {item.status === 'DECLINED' ? 'decline' : 'reply'}: {item.sellerReply}
            </p>}
          </article>
        ))}
      </div>
      <p className="text-xs text-sand-600">
        Enquiries and drafts are stored under their actual Store identities.
        In-app notification records respect your preferences. External delivery is not guaranteed.
        Drafts are private until you explicitly send a response.
      </p>
    </section>
  );
}
