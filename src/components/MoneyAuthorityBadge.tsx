import { ShieldCheck } from 'lucide-react';

interface MoneyAuthorityBadgeProps {
  label?: string;
}

export function MoneyAuthorityBadge({ label = 'Provided by SecurePay Money' }: MoneyAuthorityBadgeProps) {
  return (
    <div className="flex items-center gap-1.5 text-[0.68rem] text-sand-400">
      <ShieldCheck className="w-3 h-3" />
      <span className="italic">{label}</span>
    </div>
  );
}
