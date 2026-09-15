import { FileText, SearchX, CheckCircle } from 'lucide-react';

interface AgreementEmptyStateProps {
  variant: 'no-agreements' | 'search' | 'filter' | 'completed';
  searchQuery?: string;
}

export function AgreementEmptyState({ variant, searchQuery }: AgreementEmptyStateProps) {
  if (variant === 'search') {
    return (
      <div className="rounded-2xl border border-cream-200 bg-white px-6 py-10 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center">
            <SearchX className="w-5 h-5 text-sand-400" />
          </div>
        </div>
        <p className="text-[0.9rem] text-sand-600">
          I couldn't find an agreement matching {searchQuery ? `"${searchQuery}"` : 'your search'}.
        </p>
      </div>
    );
  }

  if (variant === 'filter') {
    return (
      <div className="rounded-2xl border border-cream-200 bg-white px-6 py-10 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-sand-400" />
          </div>
        </div>
        <p className="text-[0.9rem] text-sand-600">No agreements match this filter.</p>
      </div>
    );
  }

  if (variant === 'completed') {
    return (
      <div className="rounded-2xl border border-cream-200 bg-white px-6 py-10 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-sand-400" />
          </div>
        </div>
        <p className="text-[0.9rem] text-sand-600">No completed agreements yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-6 py-10 text-center">
      <div className="flex justify-center mb-3">
        <div className="w-10 h-10 rounded-full bg-forest-50 flex items-center justify-center">
          <FileText className="w-5 h-5 text-forest-500" />
        </div>
      </div>
      <p className="text-[0.9rem] text-sand-600">You don't have any SecurePay agreements yet.</p>
    </div>
  );
}
