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
        <div className="max-w-[82%] md:max-w-[72%]">
          <div className="mb-1 pr-1 text-right text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-sand-500">You</div>
          <div className="rounded-[1.35rem] rounded-tr-md border border-forest-100/80 bg-white/82 px-4 py-3 text-forest-900 shadow-[0_10px_28px_-24px_rgba(36,73,54,0.42)] backdrop-blur-sm">
            <p className="text-[0.95rem] leading-6">{text}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 animate-fade-in-up">
      <div className="pt-1 shrink-0">
        <img src={securepayMark} alt="" className="w-8 h-8" />
      </div>
      <div className="mt-0.5 max-w-[90%] md:max-w-[84%]">
        <div className="mb-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-forest-600">KS001</div>
        <div className="sp-section-warm rounded-[1.35rem] px-4 py-3.5 md:px-5 md:py-4">
          <p className="text-[0.97rem] leading-7 text-forest-900">{text}</p>
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
