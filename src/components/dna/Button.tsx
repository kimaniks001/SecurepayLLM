import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-40',
  secondary: 'rounded-xl border border-forest-200 px-4 py-2.5 text-sm font-medium text-forest-700 hover:bg-forest-50 disabled:opacity-40',
  ghost: 'text-sm text-sand-600 underline hover:text-forest-700 disabled:opacity-40',
};

/**
 * The three button treatments already independently re-derived, near-identically, across
 * MoneyExperience, MoneyOperationsExperience and ActivationExperience own-markup (a solid
 * forest-700 fill for the primary action, a forest-200 outline for a secondary action, an
 * underlined sand-600 ghost for a low-emphasis text action). Formalized here so new production
 * chrome reaches for one definition instead of retyping the same class string.
 */
export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`transition-colors ${VARIANT_CLASSES[variant]} ${className}`} {...props} />;
}
