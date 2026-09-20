import securepayMark from '../assets/brand/securepay/securepay-mark-green.png';
import { TypingIndicator } from './TypingIndicator';

interface MessageBubbleProps {
  text: string;
  sender: 'user' | 'agent';
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
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-forest-700 text-cream-50 px-4 py-2.5 shadow-soft">
          <p className="text-[0.9rem] leading-relaxed">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 animate-fade-in-up">
      <div className="pt-1 shrink-0">
        <img src={securepayMark} alt="" className="w-8 h-8" />
      </div>
      <div className="flex flex-col gap-0.5 mt-0.5 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-md bg-white border border-cream-200/80 px-4 py-2.5 shadow-soft">
          <p className="text-[0.9rem] leading-relaxed text-forest-800">{text}</p>
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
      <div className="rounded-2xl rounded-tl-md bg-white border border-cream-200/80 px-4 py-1 shadow-soft">
        <TypingIndicator />
      </div>
    </div>
  );
}
