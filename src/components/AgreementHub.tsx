import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { AgreementSummary, AgreementStatus } from '../types';
import { AgreementCard } from './AgreementCard';
import { AgreementEmptyState } from './AgreementEmptyState';

interface AgreementHubProps {
  agreements: AgreementSummary[];
  onOpenAgreement: (id: string) => void;
  onOpenTakingShape: (id: string) => void;
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

export function AgreementHub({ agreements, onOpenAgreement, onOpenTakingShape }: AgreementHubProps) {
  const [search, setSearch] = useState('');
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

  const handleOpen = (id: string) => {
    const agreement = agreements.find((a) => a.id === id);
    if (agreement && agreement.status === 'taking_shape') {
      onOpenTakingShape(id);
    } else {
      onOpenAgreement(id);
    }
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
              <AgreementCard key={a.id} agreement={a} onOpen={handleOpen} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
