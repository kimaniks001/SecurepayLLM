import { useState, useMemo } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import type { AgreementSummary, AgreementStatus } from '../types';
import { AgreementCard } from './AgreementCard';
import { AgreementEmptyState } from './AgreementEmptyState';

interface AgreementHubProps {
  agreements: AgreementSummary[];
  onOpenAgreement: (id: string) => void;
  onOpenTakingShape: (id: string) => void;
  onOpenMoney?: (agreement: AgreementSummary) => void;
  onAskKs001?: (agreement: AgreementSummary) => void;
}

const filterOptions: { value: AgreementStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'waiting_for_me', label: 'Needs me' },
  { value: 'waiting_for_other', label: 'Waiting' },
  { value: 'active', label: 'Active' },
  { value: 'taking_shape', label: 'Taking shape' },
  { value: 'change_requested', label: 'Changed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
];

export function AgreementHub({ agreements, onOpenAgreement, onOpenTakingShape, onOpenMoney, onAskKs001 }: AgreementHubProps) {
  const [search, setSearch] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AgreementStatus | 'all'>('all');

  const filtered = useMemo(() => {
    let result = agreements;
    if (filter !== 'all') {
      result = result.filter((a) => a.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.counterparty.toLowerCase().includes(q) ||
        a.amount.toLowerCase().includes(q) ||
        a.completion.toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q) ||
        a.statusLabel.toLowerCase().includes(q)
      );
    }
    return result;
  }, [agreements, filter, search]);

  const preview = previewId ? agreements.find((agreement) => agreement.id === previewId) ?? null : null;

  const handleOpen = (id: string) => {
    const agreement = agreements.find((a) => a.id === id);
    if (agreement && agreement.status === 'taking_shape') onOpenTakingShape(id);
    else onOpenAgreement(id);
    setPreviewId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <div className="mb-5">
          <h1 className="font-display text-xl text-forest-800 font-medium">My agreements</h1>
          <p className="text-[0.85rem] text-sand-500 mt-0.5">Your trades and commitments</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by person, subject, amount, date, location..."
            className="w-full rounded-xl border border-cream-200 bg-white pl-10 pr-4 py-2.5 text-[0.85rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`text-[0.78rem] font-medium rounded-full px-3 py-1.5 transition-all ${
                filter === opt.value
                  ? 'bg-forest-600 text-cream-50'
                  : 'bg-white text-sand-600 border border-cream-200 hover:border-forest-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <AgreementEmptyState
            variant={search.trim() ? 'search' : 'filter'}
            searchQuery={search}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <AgreementCard key={a.id} agreement={a} onOpen={id => setPreviewId(id)} />
            ))}
          </div>
        )}
      </div>
        {preview && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-forest-950/25 p-0 backdrop-blur-[1px] md:items-center md:p-6"
            role="dialog" aria-modal="true" aria-label={preview.title}
            onClick={() => setPreviewId(null)}>
            <div className="w-full max-w-xl rounded-t-[1.75rem] border border-cream-200 bg-cream-50 p-5 shadow-lifted md:rounded-[1.75rem]"
              onClick={event => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sand-500">Agreement preview</div>
                  <h2 className="mt-1 font-display text-2xl text-forest-900">{preview.title}</h2>
                  <p className="mt-1 text-sm text-sand-600">{preview.counterparty}{preview.counterpartyRole !== '—' ? ` · ${preview.counterpartyRole}` : ''}</p>
                </div>
                <button type="button" onClick={() => setPreviewId(null)} aria-label="Close agreement preview"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sand-500 hover:bg-cream-100 hover:text-forest-700">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-cream-200 bg-white p-3">
                  <div className="text-[0.66rem] uppercase tracking-wide text-sand-500">Status</div>
                  <div className="mt-1 text-sm font-semibold text-forest-900">{preview.statusLabel}</div>
                </div>
                <div className="rounded-2xl border border-cream-200 bg-white p-3">
                  <div className="text-[0.66rem] uppercase tracking-wide text-sand-500">Amount</div>
                  <div className="mt-1 text-sm font-semibold text-forest-900">{preview.amount}</div>
                </div>
              </div>

              {preview.nextAction !== '—' && (
                <div className="mt-3 rounded-2xl border border-forest-200 bg-forest-50/70 p-3.5">
                  <div className="text-[0.66rem] font-semibold uppercase tracking-wide text-forest-600">Next</div>
                  <p className="mt-1 text-sm font-medium text-forest-900">{preview.nextAction}</p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sand-500">
                {preview.completion !== '—' && <span>Complete by {preview.completion}</span>}
                {preview.location && <span>{preview.location}</span>}
                <span>{preview.lastActivity} · {preview.lastActivityTime}</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {onAskKs001 && (
                  <button type="button" onClick={() => { onAskKs001(preview); setPreviewId(null); }}
                    className="min-h-12 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold text-forest-800">
                    Ask KS001
                  </button>
                )}
                {onOpenMoney && preview.status !== 'taking_shape' && (
                  <button type="button" onClick={() => { onOpenMoney(preview); setPreviewId(null); }}
                    className="min-h-12 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold text-forest-800">
                    Money
                  </button>
                )}
                <button type="button" onClick={() => handleOpen(preview.id)}
                  className="col-span-2 flex min-h-13 items-center justify-between rounded-xl bg-forest-700 px-4 text-sm font-semibold text-white">
                  <span>{preview.status === 'taking_shape' ? 'Continue shaping' : 'Open Agreement'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}
