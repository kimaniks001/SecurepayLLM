import type { ReactNode } from 'react';

export const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
export const INPUT = `w-full rounded-xl border border-cream-300 bg-cream-50 px-3.5 py-3 text-[1rem] text-forest-800 placeholder:text-sand-400 focus:border-forest-400 ${FOCUS} disabled:opacity-60`;

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: ReactNode; children: ReactNode }) {
  return <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="block text-[0.72rem] font-medium uppercase tracking-wide text-sand-500">{label}</label>
    {children}
    {hint && <p className="text-[0.78rem] leading-snug text-sand-500">{hint}</p>}
  </div>;
}
export function PrimaryButton({ children, disabled, busy, onClick, type = 'button' }: { children: ReactNode; disabled?: boolean; busy?: boolean; onClick?: () => void; type?: 'button' | 'submit' }) {
  return <button type={type} onClick={onClick} disabled={disabled || busy} aria-busy={busy || undefined}
    className={`min-h-11 rounded-xl bg-forest-600 px-4 text-[0.9rem] font-medium text-cream-50 transition-colors hover:bg-forest-700 disabled:opacity-40 disabled:cursor-not-allowed ${FOCUS}`}>{children}</button>;
}
export function QuietButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`min-h-11 rounded-xl px-3 text-[0.875rem] text-sand-600 underline decoration-cream-400 underline-offset-4 hover:text-forest-700 disabled:opacity-40 ${FOCUS}`}>{children}</button>;
}
