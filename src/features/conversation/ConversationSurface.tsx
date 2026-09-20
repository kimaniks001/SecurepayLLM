import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { AgentTyping } from '../../components/MessageBubble';
import { bottomTop, followReducer, initialFollow, replyScrollTop } from './follow';

export interface ConversationTail { id: string; sender: 'user' | 'agent' }

/**
 * The BUILD column's scroll region + composer.
 *
 * Auto-follow (see follow.ts): the conversation keeps the latest message, KS001's "thinking" and
 * KS001's reply in view while the person is at the bottom; if they scroll up to read history it
 * never pulls them back, and a quiet "New reply" control appears instead. Driven entirely by
 * layout effects, refs and a ResizeObserver -- no timeouts.
 */
export function ConversationSurface({ tail, thinking, children, status, disabled, onSend, composerFocusKey, placeholder }: {
  /** The last transcript entry -- the only thing that decides whether to follow. */
  tail: ConversationTail | null;
  thinking: boolean;
  children: ReactNode;
  /** Errors / actions that live at the end of the transcript. */
  status?: ReactNode;
  disabled: boolean;
  onSend: (text: string) => void;
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

  return <div className="relative flex flex-col h-full">
    <div ref={scroller} onScroll={onScroll} className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-6 py-4 overscroll-contain" data-following={follow.following}>
      <div ref={content} className="space-y-4">
        <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with KS001" className="space-y-4">
          {children}
          {thinking && <div role="status" aria-label="KS001 is thinking"><AgentTyping /></div>}
        </div>
        {status}
      </div>
    </div>
    {follow.unread && <div className="pointer-events-none absolute inset-x-0 bottom-[4.75rem] flex justify-center px-4">
      <button onClick={jump} className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-forest-700 text-cream-50 shadow-lifted px-3.5 py-1.5 text-[0.8rem] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 animate-fade-in-up">
        New reply <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>}
    <Composer disabled={disabled} onSend={onSend} focusKey={composerFocusKey} placeholder={placeholder} />
  </div>;
}

function Composer({ disabled, onSend, focusKey, placeholder = 'Tell SecurePay what you are trying to make happen…' }: { disabled: boolean; onSend: (text: string) => void; focusKey?: number; placeholder?: string }) {
  const [text, setText] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (focusKey) field.current?.focus(); }, [focusKey]);
  const send = () => { const value = text.trim(); if (value && !disabled) { onSend(value); setText(''); } };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } };
  return <div className="px-4 md:px-6 py-3 border-t border-cream-200/60 bg-cream-50/70 backdrop-blur-sm">
    <div className="flex items-end gap-2 rounded-2xl border border-cream-200 bg-white shadow-card px-3 py-2 focus-within:border-forest-300 focus-within:shadow-lifted transition-shadow duration-300">
      <textarea ref={field} value={text} onChange={event => setText(event.target.value)} onKeyDown={onKey} rows={1} maxLength={1200}
        aria-label="Message KS001" enterKeyHint="send" placeholder={placeholder}
        className="flex-1 resize-none bg-transparent text-[0.95rem] leading-6 text-forest-800 placeholder:text-sand-400 outline-none max-h-32 scrollbar-thin" style={{ minHeight: '24px', fieldSizing: 'content' } as React.CSSProperties} />
      <button onClick={send} disabled={!text.trim() || disabled} aria-label="Send message"
        className="w-10 h-10 -mr-1 rounded-xl bg-forest-600 text-cream-50 flex items-center justify-center shrink-0 hover:bg-forest-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2">
        <ArrowUp className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  </div>;
}
