import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * User-Ready Beta Gate 1 -- surface LEVEL 4 (moment): a focused interruption that returns the person exactly where they were.
 * A centred dialog on desktop and a bottom sheet on phones, from one component. Accessibility contract (tested):
 *  - role="dialog" (or "alertdialog" for a decision that must be answered), aria-modal, labelled by its title;
 *  - focus moves in (the element marked `data-autofocus`, else the first control) and is TRAPPED (Tab/Shift+Tab cycle);
 *  - Escape and the backdrop close it (unless `dismissible={false}`);
 *  - focus RETURNS to whatever had it before opening;
 *  - motion is the global reduced-motion-aware fade (see index.css).
 */
export function MomentSheet({ title, description, children, onClose, role = 'dialog', dismissible = true, showClose = true, labelledBy }: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  role?: 'dialog' | 'alertdialog';
  dismissible?: boolean;
  showClose?: boolean;
  labelledBy?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = panel.current;
    const first = root?.querySelector<HTMLElement>('[data-autofocus]') ?? root?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? root)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== 'Tab' || !root) return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) { event.preventDefault(); return; }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === firstItem || !root.contains(document.activeElement))) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
    };
  }, [dismissible]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" data-moment-sheet>
      <div className="absolute inset-0 bg-forest-900/30 animate-fade-in" aria-hidden="true" onClick={dismissible ? onClose : undefined} />
      <div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="surface-moment relative w-full max-h-[88dvh] overflow-y-auto rounded-t-3xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 animate-fade-in-up focus:outline-none md:max-w-md md:rounded-2xl md:pb-5"
      >
        <div aria-hidden="true" className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-cream-300 md:hidden" />
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-lg leading-snug text-forest-800">{title}</h2>
          {showClose && dismissible && (
            <button type="button" onClick={onClose} aria-label="Close"
              className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sand-500 hover:bg-cream-100 hover:text-forest-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {description && <div id={descriptionId} className="mt-1 text-[0.9rem] leading-relaxed text-sand-700">{description}</div>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
