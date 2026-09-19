import type { ReactNode } from 'react';

/**
 * The card/panel surface already independently re-derived across ConversationWorkspace's rich
 * response fallback, MoneyExperience's SectionCard, and AgentExperience's RichResponse fallback:
 * rounded-2xl, cream border, white fill, restrained shadow-card. Formalized here so new production
 * surfaces reuse one definition instead of hand-rolling the same className string again.
 */
export function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden ${className}`}>{children}</section>;
}

export function SurfaceHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-5 py-4 border-b border-cream-200 bg-cream-50">
      <h2 className="font-display text-lg text-forest-800">{title}</h2>
      {description && <p className="mt-1 text-xs text-sand-600">{description}</p>}
    </div>
  );
}

export function SurfaceBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 space-y-4 ${className}`}>{children}</div>;
}
