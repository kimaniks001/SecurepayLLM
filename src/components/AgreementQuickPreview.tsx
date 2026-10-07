import { useEffect, useRef } from 'react';
import { AlertCircle, ArrowRight, MessageCircle, Wallet, X } from 'lucide-react';
import type { AgreementSummary } from '../types';
import { AgreementStatusBadge } from './AgreementStatusBadge';

interface AgreementQuickPreviewProps {
  agreement: AgreementSummary;
  onClose: () => void;
  onOpenAgreement: (id: string) => void;
  onOpenMoney: (id: string) => void;
  onAskKS001: (id: string) => void;
}

const attentionStatuses = new Set<AgreementSummary['status']>([
  'waiting_for_me',
  'ready_for_review',
  'change_requested',
]);

function humanState(agreement: AgreementSummary, needsAttention: boolean) {
  if (needsAttention) return 'Needs you';
  if (agreement.status === 'waiting_for_me' || agreement.status === 'ready_for_review' || agreement.status === 'waiting_for_other') return 'Waiting';
  if (agreement.status === 'change_requested') return 'Changed';
  if (agreement.status === 'completed') return 'Complete';
  if (agreement.status === 'cancelled') return 'On hold';
  if (agreement.status === 'expired') return 'Expired';
  if (agreement.status === 'taking_shape') return 'Taking shape';
  return 'Active';
}

function primaryActionLabel(agreement: AgreementSummary) {
  if (agreement.status === 'change_requested') return 'Review change';
  if (agreement.status === 'waiting_for_me' || agreement.status === 'ready_for_review') return 'Review';
  return null;
}

export function AgreementQuickPreview({
  agreement,
  onClose,
  onOpenAgreement,
  onOpenMoney,
  onAskKS001,
}: AgreementQuickPreviewProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const needsAttention = agreement.attentionRequired ?? attentionStatuses.has(agreement.status);
  const actionLabel = needsAttention ? primaryActionLabel(agreement) : null;
  const hasAmount = agreement.amount !== 'Not yet specified' && agreement.amount !== 'Not yet agreed';

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end bg-forest-950/25 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      aria-hidden="false"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="agreement-preview-title"
        aria-describedby="agreement-preview-summary"
        className="w-full md:w-[min(440px,92vw)] max-h-[88vh] md:max-h-none overflow-y-auto rounded-t-[1.75rem] md:rounded-none md:rounded-l-[1.75rem] border border-cream-200 bg-cream-50 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-cream-200 bg-cream-50/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.13em] text-sand-500">Agreement preview</p>
            <p className="mt-0.5 text-[0.75rem] text-sand-500">Look first. Open only when you want the detail.</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid min-h-11 min-w-11 place-items-center rounded-full border border-cream-200 bg-white text-sand-600 transition hover:border-forest-300 hover:text-forest-700"
            aria-label="Close agreement preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 md:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <AgreementStatusBadge status={agreement.status} />
              <span className={`text-[0.76rem] font-semibold ${needsAttention ? 'text-ember-700' : 'text-sand-500'}`}>
                {humanState(agreement, needsAttention)}
              </span>
            </div>
            <h2 id="agreement-preview-title" className="mt-3 font-display text-[1.45rem] font-medium leading-tight text-forest-900">
              {agreement.title}
            </h2>
            <p id="agreement-preview-summary" className="mt-1.5 text-[0.9rem] leading-relaxed text-sand-600">
              {agreement.counterparty}
              {agreement.counterpartyRole !== '—' ? ` · ${agreement.counterpartyRole}` : ''}
            </p>
          </div>

          {needsAttention && (
            <div className="rounded-2xl border border-ember-200 bg-ember-50/70 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ember-600" />
                <div>
                  <p className="text-[0.78rem] font-semibold text-ember-800">Needs your attention</p>
                  <p className="mt-1 text-[0.82rem] leading-relaxed text-ember-800/85">{agreement.statusLabel}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-cream-200 bg-white p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-400">With</p>
              <p className="mt-1.5 text-[0.88rem] font-medium text-forest-800">{agreement.counterparty}</p>
              {agreement.counterpartyRole !== '—' && (
                <p className="mt-0.5 text-[0.75rem] text-sand-500">{agreement.counterpartyRole}</p>
              )}
            </div>
            <div className="rounded-2xl border border-cream-200 bg-white p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-400">Value</p>
              <p className={`mt-1.5 text-[0.88rem] font-medium ${hasAmount ? 'text-forest-800' : 'text-sand-500'}`}>
                {agreement.amount}
              </p>
              {agreement.version !== '—' && <p className="mt-0.5 text-[0.75rem] text-sand-500">{agreement.version}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-cream-200 bg-white p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sand-400">What this is</p>
            <p className="mt-1.5 text-[0.9rem] leading-relaxed text-forest-800">{agreement.purpose || agreement.title}</p>
            {(agreement.location || agreement.completion !== '—') && (
              <p className="mt-2 text-[0.76rem] text-sand-500">
                {agreement.location ? agreement.location : ''}
                {agreement.location && agreement.completion !== '—' ? ' · ' : ''}
                {agreement.completion !== '—' ? `Complete by ${agreement.completion}` : ''}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-forest-100 bg-forest-50/65 p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-forest-500">Next</p>
            <p className="mt-1.5 text-[0.9rem] font-medium leading-relaxed text-forest-800">
              {agreement.nextAction !== '—' ? agreement.nextAction : 'Nothing needs you right now.'}
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {actionLabel && (
              <button
                type="button"
                onClick={() => onOpenAgreement(agreement.id)}
                className="flex min-h-12 w-full items-center justify-between rounded-xl bg-forest-700 px-4 py-3 text-left text-[0.86rem] font-semibold text-cream-50 transition hover:bg-forest-800"
              >
                <span>{actionLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onOpenMoney(agreement.id)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cream-200 bg-white px-3 py-3 text-[0.82rem] font-semibold text-forest-700 transition hover:border-forest-300"
              >
                <Wallet className="h-4 w-4" />
                Money
              </button>
              <button
                type="button"
                onClick={() => onAskKS001(agreement.id)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cream-200 bg-white px-3 py-3 text-[0.82rem] font-semibold text-forest-700 transition hover:border-forest-300"
              >
                <MessageCircle className="h-4 w-4" />
                Ask SecurePay
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenAgreement(agreement.id)}
              className="flex min-h-12 w-full items-center justify-between rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-left text-[0.84rem] font-semibold text-forest-700 transition hover:border-forest-300 hover:bg-forest-100"
            >
              <span>Open Agreement</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <p className="pb-1 text-center text-[0.72rem] text-sand-400">
            {agreement.lastActivity} · {agreement.lastActivityTime}
          </p>
        </div>
      </section>
    </div>
  );
}
