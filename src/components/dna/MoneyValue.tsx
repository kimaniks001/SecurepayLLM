/**
 * Presentational only — takes an already-formatted amount string (e.g. "KES 6,800.00") and never
 * computes or rounds anything itself, so it carries no authority over what a number means. Exists
 * because money values need stronger numerical clarity than ordinary body text: tabular figures so
 * digits align, and a size/weight step up from surrounding prose.
 */
export function MoneyValue({ amount, size = 'md', className = '' }: {
  amount: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'text-sm font-medium',
    md: 'text-base font-semibold',
    lg: 'font-display text-2xl font-medium',
  }[size];
  return <span className={`tabular-nums text-forest-800 ${sizeClasses} ${className}`}>{amount}</span>;
}
