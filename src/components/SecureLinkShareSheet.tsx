import { Link2, Copy, QrCode, Smartphone, Code, FileText } from 'lucide-react';
import type { StoreOffer } from '../types';

interface SecureLinkShareSheetProps {
  offer: StoreOffer;
  onClose: () => void;
}

export function SecureLinkShareSheet({ offer, onClose }: SecureLinkShareSheetProps) {
  const link = offer.secureLink;

  const handleCopy = () => {
    navigator.clipboard?.writeText(link.url).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-forest-900/30 backdrop-blur-sm animate-quiet-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-deliberate px-5 py-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-4 h-4 text-forest-500" />
          <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Share Offer SecureLink</span>
        </div>

        <div className="rounded-lg bg-cream-50 px-3 py-2.5 mb-4">
          <div className="text-[0.68rem] text-sand-400 mb-0.5">SecureLink URL</div>
          <div className="text-[0.825rem] text-forest-700 font-mono break-all">{link.url}</div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 hover:bg-cream-50 transition-colors text-left"
          >
            <Copy className="w-4 h-4 text-sand-500" />
            <div>
              <div className="text-[0.825rem] font-medium text-forest-800">Copy SecureLink</div>
              <div className="text-[0.72rem] text-sand-500">Paste anywhere — WhatsApp, social media, email</div>
            </div>
          </button>

          {link.qrAvailable && (
            <button className="w-full flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 hover:bg-cream-50 transition-colors text-left">
              <QrCode className="w-4 h-4 text-sand-500" />
              <div>
                <div className="text-[0.825rem] font-medium text-forest-800">Show QR code</div>
                <div className="text-[0.72rem] text-sand-500">For physical stores, posters, business cards</div>
              </div>
            </button>
          )}

          {link.whatsappShareAvailable && (
            <button className="w-full flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 hover:bg-cream-50 transition-colors text-left">
              <Smartphone className="w-4 h-4 text-sand-500" />
              <div>
                <div className="text-[0.825rem] font-medium text-forest-800">Share to WhatsApp</div>
                <div className="text-[0.72rem] text-sand-500">Send offer SecureLink via WhatsApp</div>
              </div>
            </button>
          )}

          {link.embedAvailable && (
            <button className="w-full flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 hover:bg-cream-50 transition-colors text-left">
              <Code className="w-4 h-4 text-sand-500" />
              <div>
                <div className="text-[0.825rem] font-medium text-forest-800">Copy for website</div>
                <div className="text-[0.72rem] text-sand-500">Embed on your own website with "Agree securely with SecurePay"</div>
              </div>
            </button>
          )}

          <button className="w-full flex items-center gap-3 rounded-xl border border-cream-200 px-4 py-3 hover:bg-cream-50 transition-colors text-left">
            <FileText className="w-4 h-4 text-sand-500" />
            <div>
              <div className="text-[0.825rem] font-medium text-forest-800">Copy offer text</div>
              <div className="text-[0.72rem] text-sand-500">Plain text description for sharing</div>
            </div>
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-cream-100">
          <p className="text-[0.68rem] text-sand-400">
            Offer SecureLink is a public commercial doorway. Opening it does not mean agreement joined, accepted, or purchased. It grants no authority to join, confirm, pay, or access private information. Every customer creates their own independent agreement.
          </p>
        </div>

        <button onClick={onClose} className="w-full mt-3 text-[0.825rem] text-sand-500 hover:text-forest-600 py-1">
          Close
        </button>
      </div>
    </div>
  );
}
