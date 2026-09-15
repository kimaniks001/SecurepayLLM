import type { AgentState } from '../types';

interface AgentIconProps {
  state: AgentState;
  size?: number;
}

export function AgentIcon({ state, size = 40 }: AgentIconProps) {
  const colorMap: Record<AgentState, { bg: string; fg: string; ring: string }> = {
    resting: { bg: 'bg-forest-100', fg: 'text-forest-600', ring: 'ring-forest-200' },
    listening: { bg: 'bg-forest-200', fg: 'text-forest-700', ring: 'ring-forest-300' },
    thinking: { bg: 'bg-ember-100', fg: 'text-ember-600', ring: 'ring-ember-200' },
    understood: { bg: 'bg-forest-200', fg: 'text-forest-700', ring: 'ring-forest-300' },
    finding: { bg: 'bg-forest-100', fg: 'text-forest-600', ring: 'ring-forest-200' },
    needs_you: { bg: 'bg-ember-100', fg: 'text-ember-600', ring: 'ring-ember-300' },
  };

  const c = colorMap[state];

  const breatheClass =
    state === 'resting' || state === 'listening'
      ? 'animate-breathe-soft'
      : '';

  const thinkClass = state === 'thinking' || state === 'finding' ? 'animate-thinking' : '';

  return (
    <div
      className={`relative flex items-center justify-center rounded-full ${c.bg} ${c.fg} ring-2 ${c.ring} transition-all duration-500 shrink-0 ${breatheClass}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 32 32"
        fill="none"
        className={thinkClass}
      >
        <circle cx="16" cy="11" r="5.5" fill="currentColor" opacity={0.9} />
        <path
          d="M6 27c0-5.5 4.5-10 10-10s10 4.5 10 10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={0.8}
        />
      </svg>

      <span
        className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-cream-50 transition-all duration-500 ${
          state === 'understood'
            ? 'w-2.5 h-2.5 bg-forest-500 animate-settle'
            : state === 'thinking'
            ? 'w-2.5 h-2.5 bg-ember-500 animate-pulse-soft'
            : state === 'finding'
            ? 'w-2.5 h-2.5 bg-forest-400 animate-pulse-soft'
            : state === 'needs_you'
            ? 'w-2.5 h-2.5 bg-ember-500'
            : state === 'listening'
            ? 'w-2 h-2 bg-forest-400'
            : 'w-2 h-2 bg-sand-400'
        }`}
      />
    </div>
  );
}
