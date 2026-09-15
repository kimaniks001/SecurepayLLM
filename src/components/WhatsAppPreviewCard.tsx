import { Smartphone, ArrowRight, Shield } from 'lucide-react';
import type { WhatsAppPreview } from '../types';

interface WhatsAppPreviewCardProps {
  preview: WhatsAppPreview;
}

export function WhatsAppPreviewCard({ preview }: WhatsAppPreviewCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="w-4 h-4 text-sand-500" />
        <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">WhatsApp preview</span>
        {preview.isSystemNotice && (
          <span className="flex items-center gap-1 text-[0.65rem] text-forest-600 bg-forest-50 rounded-full px-2 py-0.5">
            <Shield className="w-2.5 h-2.5" />
            System notice
          </span>
        )}
      </div>
      <div className="rounded-xl bg-[#e5ddd5] px-4 py-3 max-w-xs">
        <div className="text-[0.65rem] font-medium text-sand-600 uppercase tracking-wide mb-1">SecurePay</div>
        <p className="text-[0.825rem] text-forest-900 whitespace-pre-line">{preview.body}</p>
        <button className="mt-2 flex items-center gap-1.5 text-[0.78rem] font-medium text-[#075e54] hover:underline">
          {preview.actionText}
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <p className="text-[0.68rem] text-sand-400 mt-2">
        WhatsApp can notify, remind and bring you back to SecurePay. Protected authority — joining, confirming, paying, releasing — always returns to authenticated SecurePay.
      </p>
    </div>
  );
}
