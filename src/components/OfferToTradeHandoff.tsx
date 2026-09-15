import { ArrowLeft, Sparkles, FileText, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { StoreOffer } from '../types';
import { createOfferTradeSnapshot } from '../offerTradeSnapshot';

interface OfferToTradeHandoffProps {
  offer: StoreOffer;
  onBack: () => void;
  onProceed: () => void;
}

export function OfferToTradeHandoff({ offer, onBack, onProceed }: OfferToTradeHandoffProps) {
  const snapshot = createOfferTradeSnapshot(offer);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          {offer.title}
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Trade Taking Shape</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* Offer provenance */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-forest-500" />
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">From Store offer</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-[0.78rem]">
              <span className="text-sand-600">Offer</span>
              <span className="text-forest-800 font-medium text-right">{offer.title}</span>
            </div>
            <div className="flex items-baseline justify-between text-[0.78rem]">
              <span className="text-sand-600">Store</span>
              <span className="text-forest-800">{snapshot.storeName}</span>
            </div>
            <div className="flex items-baseline justify-between text-[0.78rem]">
              <span className="text-sand-600">Offer version</span>
              <span className="text-forest-800">{snapshot.offerVersion}</span>
            </div>
            <div className="flex items-baseline justify-between text-[0.78rem]">
              <span className="text-sand-600">Display source</span>
              <span className="text-forest-800">{snapshot.displaySource}</span>
            </div>
          </div>
        </div>

        {/* Seller of record → counterparty */}
        <div className={`rounded-2xl border px-5 py-4 animate-quiet-in ${snapshot.isExternalReference ? 'border-ember-200 bg-ember-50/20' : 'border-forest-200 bg-forest-50/20'}`}>
          <div className="flex items-center gap-2 mb-3">
            {snapshot.isExternalReference ? <AlertTriangle className="w-4 h-4 text-ember-600" /> : <ShieldCheck className="w-4 h-4 text-forest-600" />}
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Seller of record → trade counterparty</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-[0.78rem]">
              <span className="text-sand-600">Seller of record</span>
              <span className="text-forest-800 font-medium">{snapshot.sellerOfRecord}</span>
            </div>
            <div className="flex items-baseline justify-between text-[0.78rem]">
              <span className="text-sand-600">Identity</span>
              <span className="text-forest-800 text-right">{snapshot.sellerOfRecordIdentity}</span>
            </div>
            <div className="flex items-baseline justify-between text-[0.78rem]">
              <span className="text-sand-600">Trade counterparty</span>
              <span className="text-forest-800 font-medium">{snapshot.sellerOfRecord}</span>
            </div>
          </div>
          {snapshot.isExternalReference && (
            <p className="text-[0.72rem] text-ember-600 mt-2">
              {snapshot.storeName} is distribution provenance only, not the contractual counterparty. Do not settle to {snapshot.storeName}.
            </p>
          )}
        </div>

        {/* Adopted facts */}
        <div className="rounded-2xl border border-forest-300 bg-forest-50/30 px-5 py-4 animate-quiet-in">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-forest-600" />
            <span className="text-[0.7rem] font-medium text-forest-700 uppercase tracking-wide">Adopted facts from offer {snapshot.offerVersion}</span>
          </div>
          <div className="space-y-2 mb-3">
            {snapshot.adoptedFacts.map((fact, i) => (
              <div key={i} className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-600">{fact.label}</span>
                <span className="text-forest-800 text-right">{fact.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[0.78rem] text-sand-600 mb-2">
            Nothing is authoritative yet. These facts remain candidate trade understanding until the agreement process crosses the established authority boundary.
          </p>
          <p className="text-[0.72rem] text-sand-400 mb-3">
            You can customize this trade. The original Store offer remains unchanged. Your trade is independent. If the Store later publishes a new offer version, your trade keeps these adopted facts.
          </p>
          <button
            onClick={onProceed}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
          >
            Continue to agreement
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Doctrine */}
        <div className="text-[0.68rem] text-sand-400 italic px-2 space-y-0.5">
          <p>Store offer ≠ Agreement</p>
          <p>Offer SecureLink ≠ Agreement invitation</p>
          <p>Store price ≠ Agreed price</p>
          <p>One offer → many independent agreements</p>
        </div>
      </div>
    </div>
  );
}
