import { useEffect, useRef, useState } from 'react';
import type { AgreementConversationMessage, AgreementMessagesGateway } from '../../api/securepay/agreement-messages';

function time(iso: string) {
  const date = new Date(iso);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Date unavailable';
}

/**
 * H2 Mini Agreement Conversation, reusing the canonical B4 message history — each entry is read from the canonical authenticated
 * Agreement API, never Shortstays state or an AI transcript. A message cannot
 * amend terms or approve Money. The send key persists across uncertain retries.
 */
export function AgreementConversationPanel({
  agreementId, gateway,
}: {
  agreementId: string;
  gateway: Pick<AgreementMessagesGateway, 'thread' | 'send'>;
}) {
  const [messages, setMessages] = useState<AgreementConversationMessage[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pending = useRef<{ key: string; body: string } | null>(null);
  const serial = useRef(0);

  async function refresh() {
    const request = ++serial.current;
    setState('loading'); setError(null); setMessages([]);
    try {
      const result = await gateway.thread(agreementId, 0, 20);
      if (serial.current !== request) return;
      if (!Array.isArray(result) || result.some(x => x.agreementId !== agreementId))
        throw new Error('Inconsistent Agreement thread');
      setMessages(result); setNextPage(1); setHasMore(result.length === 20);
      setState('ready');
    } catch {
      if (serial.current === request) { setState('error'); setError('SecurePay could not load this conversation.'); }
    }
  }

  useEffect(() => {
    void refresh();
    return () => { serial.current++; pending.current = null; };
    // The caller's gateway is stable for this mounted Agreement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementId]);

  async function loadEarlier() {
    if (state !== 'ready' || !hasMore) return;
    setError(null);
    try {
      const older = await gateway.thread(agreementId, nextPage, 20);
      if (!Array.isArray(older) || older.some(x => x.agreementId !== agreementId))
        throw new Error('Mismatched Agreement');
      setMessages(previous => {
        const ids = new Set(previous.map(x => x.id));
        return [...previous, ...older.filter(x => !ids.has(x.id))];
      });
      setHasMore(older.length === 20);
      setNextPage(n => n + 1);
    } catch {
      setError('Could not retrieve earlier messages. Try again.');
    }
  }

  async function send() {
    if (sending) return;
    const next = pending.current ?? { body: body.trim(), key: crypto.randomUUID() };
    if (next.body.length < 1 || next.body.length > 2000) {
      setError('Write a message of up to 2,000 characters.'); return;
    }
    pending.current = next; setSending(true); setError(null);
    try {
      const confirmed = await gateway.send(agreementId, next.body, next.key);
      if (confirmed.agreementId !== agreementId) throw new Error('Unexpected Agreement response');
      pending.current = null;
      setBody('');
      setMessages(previous => [confirmed, ...previous.filter(x => x.id !== confirmed.id)]);
      setState('ready');
      // Earlier pages remain available; an inserted message is not older history.
    } catch {
      setError('SecurePay could not confirm if your message arrived. Use “Check again” to retry the same message safely.');
    } finally { setSending(false); }
  }

  return (
    <section aria-label="Agreement conversation" className="rounded-xl border border-forest-200 bg-cream-50 p-3 space-y-3">
      <h3 className="text-sm font-semibold text-forest-800">Conversation with your Agreement participants</h3>
      <p className="text-[0.72rem] text-sand-600">
        Messages are saved in SecurePay. They do not change agreed terms or authorize payment.
      </p>
      {state === 'loading' && <p role="status" className="text-xs text-sand-600">Loading real messages…</p>}
      {state === 'error' && <button onClick={() => void refresh()} className="text-xs underline text-forest-700">Try again</button>}
      {state === 'ready' && (
        <>
          {hasMore && <button type="button" onClick={() => void loadEarlier()}
            className="w-full text-xs text-forest-700 underline">Load earlier conversation</button>}
          <div className="max-h-80 space-y-2 overflow-y-auto" role="log" aria-label="Original Agreement messages">
            {[...messages].reverse().map(item => (
              <div key={item.id} className={item.mine
                ? 'ml-7 rounded-xl bg-forest-100 border border-forest-200 p-2'
                : 'mr-7 rounded-xl border border-cream-200 bg-white p-2'}>
                <p className="text-[0.7rem] text-sand-500">
                  {item.mine ? 'You' : 'Agreement participant'} · {time(item.createdAt)}
                </p>
                <p className="text-sm text-forest-800 whitespace-pre-wrap break-words">{item.body}</p>
              </div>
            ))}
            {messages.length === 0 && <p className="text-xs text-sand-600">No saved messages in this Agreement yet.</p>}
          </div>
          <form onSubmit={e => { e.preventDefault(); void send(); }} className="space-y-2">
            <label className="block text-xs text-forest-800">
              Message
              <textarea value={body} onChange={e => {
                if (pending.current) return; // keep uncertain retry's exact message
                setBody(e.target.value);
              }} disabled={sending || !!pending.current}
                maxLength={2000} rows={3}
                className="mt-1 w-full rounded-xl border border-cream-200 bg-white p-3 text-sm" />
            </label>
            <button type="submit" disabled={sending} className="min-h-11 rounded-xl bg-forest-700 text-white px-4 text-sm disabled:opacity-50">
              {sending ? 'Checking…' : pending.current ? 'Check again' : 'Send message'}
            </button>
            {pending.current && (
              <button type="button" onClick={() => {
                // No claim of unsending: leaving a pending attempt means
                // a message could already exist. Reload thread before new send.
                pending.current = null; setBody(''); void refresh();
              }} className="ml-2 text-xs underline text-sand-600">
                Review conversation instead
              </button>
            )}
          </form>
        </>
      )}
      {error && <p role="alert" className="text-xs text-ember-700">{error}</p>}
    </section>
  );
}
