import securepayMark from '../assets/brand/securepay/securepay-mark-green.png';
import { TypingIndicator } from './TypingIndicator';

interface MessageBubbleProps {
  text: string;
  sender: 'user' | 'agent';
}

/**
 * Presentation-only restraint for KS001. Never alter the authoritative reply,
 * question, Agreement or persisted transcript. Longer replies remain expandable.
 * Split only at real sentence boundaries; preserve every word.
 */
function shortReply(text: string): { visible: string; rest: string } {
  const source = text.trim();
  const parts = source.match(/[^.!?\\n]+(?:[.!?]+(?=\\s|$)|$)/g)?.map(part => part.trim()).filter(Boolean) ?? [];
  if (parts.length <= 2) return { visible: source, rest: '' };
  const firstTwo = parts.slice(0, 2).join(' ');
  const at = source.indexOf(parts[2]);
  if (at < 0) return { visible: source, rest: '' };
  return { visible: source.slice(0, at).trim(), rest: source.slice(at).trim() };
}

/**
 * KS001 identity (task doctrine): every agent-sender message is from KS001, shown with the one
 * real, canonical SecurePay mark asset -- never a generic silhouette/robot/initials avatar. The
 * conversation header already establishes the "KS001" name once; repeating it on every bubble
 * would be noisy, so only the icon repeats here (see AgentExperience's conversation header for
 * the named identity).
 */
export function MessageBubble({ text, sender }: MessageBubbleProps) {
  if (sender === 'user') {
    return (
      <div className="flex justify-end animate-fade-in-up">
        <div className="max-w-[82%] md:max-w-[72%]">
          <div className="mb-1 pr-1 text-right text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-sand-500">You</div>
          <div className="rounded-[1.35rem] rounded-tr-md border border-forest-100/80 bg-white/82 px-4 py-3 text-forest-900 shadow-[0_10px_28px_-24px_rgba(36,73,54,0.42)] backdrop-blur-sm">
            <p className="text-[0.95rem] leading-6">{text}</p>
          </div>
        </div>
      </div>
    );
  }

  const { visible, rest } = shortReply(text);
  return (
    <div className="flex items-start gap-2.5 animate-fade-in-up">
      <div className="pt-1 shrink-0">
        <img src={securepayMark} alt="" className="w-8 h-8" />
      </div>
      <div className="mt-0.5 max-w-[90%] md:max-w-[84%]">
        <div className="mb-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-forest-600">KS001</div>
        <div className="sp-section-warm rounded-[1.35rem] px-4 py-3.5 md:px-5 md:py-4">
          <p className="whitespace-pre-wrap text-[0.97rem] leading-7 text-forest-900">{visible}</p>
          {rest && <details className="mt-3 border-t border-forest-100 pt-2" data-ks001-more>
            <summary className="min-h-11 cursor-pointer py-2 text-[0.8rem] font-medium text-forest-700">Read the rest</summary>
            <p className="whitespace-pre-wrap text-[0.89rem] leading-6 text-sand-700">{rest}</p>
          </details>}
        </div>
      </div>
    </div>
  );
}

export function AgentTyping() {
  return (
    <div className="flex items-start gap-2.5 animate-fade-in">
      <div className="pt-1 shrink-0">
        <img src={securepayMark} alt="" className="w-8 h-8 animate-pulse-soft" />
      </div>
      <div className="sp-section-warm rounded-full px-3 py-2">
        <TypingIndicator />
      </div>
    </div>
  );
}
