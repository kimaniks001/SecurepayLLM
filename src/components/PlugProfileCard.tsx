import { ArrowLeft, HandHelping, MapPin, Users } from 'lucide-react';
import type { PlugProfile } from '../types';

interface PlugProfileCardProps {
  plug: PlugProfile;
  onBack: () => void;
  onIntroduce: () => void;
}

export function PlugProfileCard({ plug, onBack, onIntroduce }: PlugProfileCardProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Help
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">{plug.identity}</h1>
        <div className="text-[0.72rem] text-sand-500 mt-0.5">Plug — Human connector</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-forest-50 flex items-center justify-center shrink-0">
              <HandHelping className="w-5 h-5 text-forest-500" />
            </div>
            <div className="flex-1">
              <div className="text-[0.875rem] font-medium text-forest-800">{plug.identity}</div>
              <div className="text-[0.72rem] text-sand-500 mt-0.5">{plug.publicProvenance}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[0.78rem] text-sand-600">
              <MapPin className="w-3.5 h-3.5 text-sand-400" />
              {plug.serviceArea}
            </div>
            <div className="text-[0.78rem] text-sand-600">Availability: {plug.availability}</div>
            {plug.language && <div className="text-[0.78rem] text-sand-600">Language: {plug.language}</div>}
            {plug.businessAssociation && <div className="text-[0.78rem] text-sand-600">Business: {plug.businessAssociation}</div>}
          </div>
          <div className="mt-3 pt-3 border-t border-cream-100">
            <div className="text-[0.72rem] text-sand-500 mb-1">Commonly helps connect</div>
            <div className="flex flex-wrap gap-1.5">
              {plug.connectionDomains.map((domain, i) => (
                <span key={i} className="text-[0.72rem] text-forest-700 bg-forest-50 border border-forest-100 rounded-full px-2 py-0.5">{domain}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-cream-200 bg-cream-50/50 px-5 py-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">What a Plug can and cannot do</div>
          <div className="space-y-1 text-[0.78rem] text-sand-600">
            <div className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-forest-400 mt-2 shrink-0" /> Help find providers, offers, Masters, and Partners</div>
            <div className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-forest-400 mt-2 shrink-0" /> Connect parties and navigate SecurePay</div>
            <div className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" /> Cannot confirm Agreement or release Money</div>
            <div className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" /> Not a Master or licensed professional by default</div>
            <div className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" /> Not a counterparty merely because they introduced someone</div>
          </div>
        </div>

        <button
          onClick={onIntroduce}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
        >
          <Users className="w-4 h-4" />
          Ask {plug.identity} to connect me
        </button>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Plug ≠ Master. Plug ≠ Counterparty. Plug ≠ Agreement authority. Plug self-described capability is not a verified qualification.
        </p>
      </div>
    </div>
  );
}
