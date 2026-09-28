import { useState, type KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';

interface ConversationInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Accessible name for the text box. */
  label?: string;
}

export function ConversationInput({
  onSend,
  placeholder = 'Tell SecurePay what you are trying to make happen...',
  disabled,
  label = 'Message KS001',
}: ConversationInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative">
      <div className="flex items-end gap-2 rounded-2xl border border-cream-200 bg-white shadow-card px-3 py-1.5 focus-within:border-forest-300 focus-within:shadow-lifted transition-all duration-300">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={label}
          data-ks001-composer
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent py-2.5 text-[0.9rem] text-forest-800 placeholder:text-sand-400 outline-none max-h-32 scrollbar-thin disabled:opacity-50"
          style={{ minHeight: '44px' }}
        />
        <button
          type="button"
          aria-label="Send"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="w-11 h-11 rounded-xl bg-forest-600 text-cream-50 flex items-center justify-center shrink-0 hover:bg-forest-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95 motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
        >
          <ArrowUp className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
