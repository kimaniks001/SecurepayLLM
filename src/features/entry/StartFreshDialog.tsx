import { MomentSheet } from '../../components/dna/MomentSheet';

/**
 * User-Ready Beta Gate 1 (decision D1) -- starting something new while meaningful work in this tab has not been saved. The
 * tab keeps ONE anonymous possession record, so leaving unsaved work behind is real and is never done silently.
 * Stay here is the safe default (focused first; Escape = Stay here).
 */
export function StartFreshDialog({ title, busy, onSave, onStartFresh, onStay }: {
  title: string; busy: boolean; onSave: () => void; onStartFresh: () => void; onStay: () => void;
}) {
  const button = 'inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 text-[0.9rem] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 disabled:opacity-50 sm:w-auto';
  return (
    <MomentSheet role="alertdialog" title="Start fresh?" onClose={onStay} showClose={false}
      description={<>This work hasn’t been saved: <span className="font-medium text-forest-800">{title.replace(/[.!?…]+$/, '')}</span>. If you start fresh, you won’t be able to come back to it from this tab.</>}>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <button type="button" data-autofocus onClick={onStay} className={`${button} border border-cream-300 bg-white text-forest-800 hover:bg-cream-50`}>Stay here</button>
        <button type="button" disabled={busy} onClick={onStartFresh} className={`${button} border border-forest-200 bg-transparent text-forest-700 hover:bg-forest-50`}>Start fresh</button>
        <button type="button" disabled={busy} onClick={onSave} className={`${button} bg-forest-700 text-white hover:bg-forest-800`}>Save for later</button>
      </div>
    </MomentSheet>
  );
}
