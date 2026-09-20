import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useIsDesktop, useKeyboardInset } from './hooks';

/**
 * The ONE presentation frame for every contextual SecurePay surface (an Interaction Instrument, the
 * "Find on SecurePay" discovery surface, and whatever comes next): on desktop an anchored panel
 * portalled into the top of the UNDERSTOOD column (the conversation stays fully visible beside it); on a
 * phone a bottom sheet that rides above the keyboard, traps focus, and closes on Escape / backdrop.
 * It owns only geometry, focus and dismissal -- never content or authority.
 */
export function SurfaceShell({ variant, titleId, root, onKeyDown, onBackdrop, children }: {
  variant: 'panel' | 'sheet'; titleId: string; root: RefObject<HTMLDivElement>; onKeyDown: (event: KeyboardEvent) => void; onBackdrop: () => void; children: ReactNode;
}) {
  const inset = useKeyboardInset(variant === 'sheet');
  if (variant === 'panel') {
    return <div ref={root} role="region" aria-labelledby={titleId} onKeyDown={onKeyDown} className="rounded-2xl border border-forest-200 bg-white shadow-lifted animate-fade-in-up">{children}</div>;
  }
  return <div className="fixed inset-0 z-40">
    <div aria-hidden="true" className="absolute inset-0 bg-forest-900/30 animate-fade-in" onClick={onBackdrop} />
    <div ref={root} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown} style={{ bottom: inset }}
      className="absolute inset-x-0 max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-white shadow-lifted animate-fade-in-up pb-[env(safe-area-inset-bottom)]">
      <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-cream-400" />
      {children}
    </div>
  </div>;
}

/** Desktop: portal the panel into the workbench column's slot; phone: render the sheet in place. */
export function SurfaceMount({ children, panelSlot }: { children: (variant: 'panel' | 'sheet') => ReactNode; panelSlot: HTMLElement | null }) {
  const desktop = useIsDesktop();
  if (!desktop) return <>{children('sheet')}</>;
  return panelSlot ? createPortal(children('panel'), panelSlot) : null;
}
