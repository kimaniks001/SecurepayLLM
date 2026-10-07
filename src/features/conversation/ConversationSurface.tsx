import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { AgentTyping } from '../../components/MessageBubble';
import { bottomTop, followReducer, initialFollow, replyScrollTop } from './follow';
import { readDraft, writeDraft } from './drafts';
import { routeInput } from '../entry/lifecycle';

/**
 * User-Ready Beta Gate 1 (EP-CERT-001/002) -- what sending returns. `true`/nothing: the words are now in the conversation
 * record (a turn is in the transcript with its own retry), so the composer clears. `false`: not accepted -- the words stay.
 * A promise keeps the words (and says so) until the outcome is known.
 */
export type SendResult = boolean | void | Promise<boolean>;

export interface ConversationTail { id: string; sender: 'user' | 'agent' }

/**
 * The BUILD column's scroll region + composer.
 *
 * Auto-follow (see follow.ts): the conversation keeps the latest message, KS001's "thinking" and
 * KS001's reply in view while the person is at the bottom; if they scroll up to read history it
 * never pulls them back, and a quiet "New reply" control appears instead. Driven entirely by
 * layout effects, refs and a ResizeObserver -- no timeouts.
 */
export function ConversationSurface({ tail, thinking, children, status, disabled, onSend, composerFocusKey, placeholder, draftKey, leading }: {
  /** The last transcript entry -- the only thing that decides whether to follow. */
  tail: ConversationTail | null;
  thinking: boolean;
  children: ReactNode;
  /** Errors / actions that live at the end of the transcript. */
  status?: ReactNode;
  disabled: boolean;
  onSend: (text: string) => SendResult;
  /** User-Ready Beta Gate 1 -- the universal composer's own "+" (what you already have), inside the composer. */
  leading?: ReactNode;
  /** Entry Perfection Phase 9 -- keeps unsent text for THIS conversation in this tab's memory (see drafts.ts). */
  draftKey?: string;
  /** Bumping this focuses the composer (e.g. after an instrument sends the person back to talking). */
  composerFocusKey?: number;
  placeholder?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [follow, dispatch] = useReducer(followReducer, initialFollow);
  const followingRef = useRef(follow.following);
  followingRef.current = follow.following;
  // A long reply is pinned to its first line; content growth must not then drag it to the bottom.
  const pinnedToReplyStart = useRef(false);
  const seenTail = useRef<string | null>(null);
  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scroller.current;
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (el) el.scrollTo({ top: bottomTop(el), behavior: smooth && !reduced ? 'smooth' : 'auto' });
  }, []);

  // The latest entry changed: follow the person's own message / KS001's reply.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!tail || !el || seenTail.current === tail.id) return;
    seenTail.current = tail.id;
    if (tail.sender === 'user') {
      pinnedToReplyStart.current = false;
      dispatch({ type: 'sent' });
      scrollToBottom(false);
      return;
    }
    dispatch({ type: 'reply' });
    if (!followingRef.current) return;
    const reply = content.current?.querySelector<HTMLElement>(`[data-turn-id="${CSS.escape(tail.id)}"]`);
    if (!reply) { scrollToBottom(false); return; }
    const target = replyScrollTop({ top: reply.offsetTop, height: reply.offsetHeight }, el);
    pinnedToReplyStart.current = target.pinnedToReplyStart;
    el.scrollTo({ top: target.top, behavior: 'auto' });
  }, [tail, scrollToBottom]);

  // KS001 started thinking: keep the indicator in view.
  useLayoutEffect(() => {
    if (thinking && followingRef.current) { pinnedToReplyStart.current = false; scrollToBottom(false); }
  }, [thinking, scrollToBottom]);

  // Content grew (rich cards, images, an error notice): stay with the latest while following.
  useEffect(() => {
    const target = content.current;
    if (!target || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (followingRef.current && !pinnedToReplyStart.current) scrollToBottom(false);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [scrollToBottom]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) dispatch({ type: 'scrolled', metrics: { scrollTop: el.scrollTop, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight } });
  };
  const jump = () => { pinnedToReplyStart.current = false; dispatch({ type: 'jump' }); scrollToBottom(true); };

  return <div className="sp-life-canvas flex h-full flex-col">
    {/* The pill is anchored to the scroll region (not the composer, whose height varies on phones). */}
    <div className="relative flex-1 min-h-0">
    <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto scrollbar-thin px-4 py-6 md:px-10 md:py-9 overscroll-contain" data-following={follow.following}>
      <div ref={content} className="mx-auto w-full max-w-4xl space-y-6">
        <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with KS001" className="space-y-4">
          {children}
          {thinking && <div role="status" aria-label="KS001 is thinking"><AgentTyping /></div>}
        </div>
        {status}
      </div>
    </div>
    {follow.unread && <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
      <button onClick={jump} className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-forest-700 text-cream-50 shadow-lifted px-3.5 py-1.5 text-[0.8rem] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 animate-fade-in-up">
        New reply <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>}
    </div>
    <Composer disabled={disabled} onSend={onSend} focusKey={composerFocusKey} placeholder={placeholder} draftKey={draftKey} leading={leading} />
  </div>;
}

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

function Composer({ disabled, onSend, focusKey, placeholder = 'Tell SecurePay what you are trying to make happen…', draftKey, leading }: { disabled: boolean; onSend: (text: string) => SendResult; focusKey?: number; placeholder?: string; draftKey?: string; leading?: ReactNode }) {
  const [text, setTextState] = useState(() => readDraft(draftKey));
  const [offline, setOffline] = useState(false);
  const [sending, setSending] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const setText = (value: string) => { setTextState(value); writeDraft(draftKey, value); };
  useEffect(() => { if (focusKey) field.current?.focus(); }, [focusKey]);
  useEffect(() => { setTextState(readDraft(draftKey)); }, [draftKey]);
  useEffect(() => {
    const online = () => setOffline(false);
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);
  const long = routeInput(text) === 'source';
  // Entry Perfection Phase 9 -- offline: never submit (no retry storm, no "failed" turn); keep the words and say so plainly.
  const send = () => {
    const value = text.trim();
    if (!value || disabled || sending) return;
    if (isOffline()) { setOffline(true); return; }
    setOffline(false);
    const result = onSend(value);
    if (result instanceof Promise) {
      setSending(true);
      void result.then(accepted => { if (accepted) setText(''); }, () => {}).finally(() => setSending(false));
    } else if (result !== false) {
      setText('');
    }
  };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } };
  return <div className="border-t border-cream-200/55 bg-[#fdfcf8]/90 px-4 py-3.5 backdrop-blur-md md:px-10 md:py-5">
    {offline && <p role="status" className="mb-2 text-[0.8rem] text-sand-700">You’re offline. Your message is kept here — send it when you’re back online.</p>}
    {/* EP-CERT-001 -- never truncated: long text is simply read in full, like anything else the person brings. */}
    {(long || sending) && <p role="status" className="mb-2 text-[0.8rem] text-sand-700">{sending ? 'SecurePay is reading what you pasted. It stays here until it’s read.' : 'That’s longer than a message, so SecurePay will read all of it, like a document you brought.'}</p>}
    <div className="sp-section mx-auto flex w-full max-w-4xl items-end gap-2 rounded-[1.4rem] border-forest-100/80 bg-white/88 px-3.5 py-3 shadow-[0_18px_48px_-34px_rgba(36,73,54,0.42)] backdrop-blur-sm focus-within:border-forest-300 focus-within:shadow-lifted transition-all duration-300">
      {leading && <div className="-ml-1 shrink-0 self-end">{leading}</div>}
      <textarea ref={field} value={text} onChange={event => setText(event.target.value)} onKeyDown={onKey} rows={1}
        aria-label="Message KS001" data-ks001-composer enterKeyHint="send" placeholder={placeholder} readOnly={sending}
        className="flex-1 min-w-0 resize-none bg-transparent text-[0.95rem] leading-6 text-forest-800 placeholder:text-sand-400 outline-none max-h-32 scrollbar-thin" style={{ minHeight: '24px', fieldSizing: 'content' } as React.CSSProperties} />
      <button onClick={send} disabled={!text.trim() || disabled || sending} aria-label="Send message"
        className="w-11 h-11 -mr-1 rounded-[0.95rem] bg-forest-700 text-cream-50 flex items-center justify-center shrink-0 shadow-soft hover:bg-forest-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2">
        <ArrowUp className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  </div>;
}
