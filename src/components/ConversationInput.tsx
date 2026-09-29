import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';
import type { SendResult } from '../features/conversation/ConversationSurface';
import { readDraft, writeDraft } from '../features/conversation/drafts';
import { routeInput } from '../features/entry/lifecycle';

interface ConversationInputProps {
  onSend: (text: string) => SendResult;
  placeholder?: string;
  disabled?: boolean;
  /** Accessible name for the text box. */
  label?: string;
  /** User-Ready Beta Gate 1 -- the universal composer's "+" (what you already have), inside the composer. */
  leading?: ReactNode;
  /** User-Ready Beta Gate 1 -- unsent Home words survive "Stay here" / "Save for later" / in-app navigation (see drafts.ts). */
  draftKey?: string;
}

/**
 * The Home universal composer. User-Ready Beta Gate 1 (EP-CERT-001): never truncates (long text is read in full as a
 * pasted source by the caller) and keeps the words until the caller says they were accepted -- the same contract as the
 * conversation composer (`SendResult`).
 */
export function ConversationInput({
  onSend,
  placeholder = 'Tell SecurePay what you are trying to make happen...',
  disabled,
  label = 'Message KS001',
  leading,
  draftKey,
}: ConversationInputProps) {
  const [text, setTextState] = useState(() => readDraft(draftKey));
  const [offline, setOffline] = useState(false);
  const [sending, setSending] = useState(false);
  const setText = (value: string) => { setTextState(value); writeDraft(draftKey, value); };
  useEffect(() => {
    const online = () => setOffline(false);
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);
  const long = routeInput(text) === 'source';

  // Entry Perfection Phase 9 -- offline: never submit, keep the words, say so plainly (the same rule as the conversation composer).
  const handleSend = () => {
    if (!text.trim() || disabled || sending) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setOffline(true); return; }
    setOffline(false);
    const result = onSend(text.trim());
    if (result instanceof Promise) {
      setSending(true);
      void result.then(accepted => { if (accepted) setText(''); }, () => {}).finally(() => setSending(false));
    } else if (result !== false) {
      setText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative">
      {offline && <p role="status" className="mb-2 text-[0.8rem] text-sand-700">You’re offline. Your message is kept here — send it when you’re back online.</p>}
      {(long || sending) && <p role="status" className="mb-2 text-left text-[0.8rem] text-sand-700">{sending ? 'SecurePay is reading what you pasted. It stays here until it’s read.' : 'That’s longer than a message, so SecurePay will read all of it, like a document you brought.'}</p>}
      <div className="flex items-end gap-1.5 rounded-2xl border border-cream-200 bg-white shadow-card px-2 py-1.5 focus-within:border-forest-300 focus-within:shadow-lifted transition-all duration-300">
        {leading && <div className="shrink-0 self-end">{leading}</div>}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={label}
          data-ks001-composer
          disabled={disabled}
          readOnly={sending}
          rows={1}
          enterKeyHint="send"
          className="flex-1 min-w-0 resize-none bg-transparent px-1 py-2.5 text-[0.95rem] text-forest-800 placeholder:text-sand-400 outline-none max-h-40 scrollbar-thin disabled:opacity-50"
          style={{ minHeight: '24px', fieldSizing: 'content' } as React.CSSProperties}
        />
        <button
          type="button"
          aria-label="Send"
          onClick={handleSend}
          disabled={!text.trim() || disabled || sending}
          className="w-11 h-11 rounded-xl bg-forest-600 text-cream-50 flex items-center justify-center shrink-0 hover:bg-forest-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2"
        >
          <ArrowUp className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
