import type { AgentState } from '../types';
import { AgentIcon } from './AgentIcon';
import { TypingIndicator } from './TypingIndicator';

interface MessageBubbleProps {
  text: string;
  sender: 'user' | 'agent';
  agentState?: AgentState;
}

export function MessageBubble({ text, sender, agentState = 'understood' }: MessageBubbleProps) {
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
        <AgentIcon state={agentState} size={32} />
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
        <AgentIcon state="thinking" size={32} />
      </div>
      <div className="rounded-2xl rounded-tl-md bg-white border border-cream-200/80 px-4 py-1 shadow-soft">
        <TypingIndicator />
      </div>
    </div>
  );
}
