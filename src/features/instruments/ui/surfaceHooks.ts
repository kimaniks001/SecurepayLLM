import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from 'react';

export function useSurfaceKeys(root: RefObject<HTMLElement>, variant: 'panel' | 'sheet', onEscape: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.stopPropagation(); onEscape(); return; }
    if (variant === 'sheet' && event.key === 'Tab' && root.current) {
      const focusables = [...root.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')].filter(el => el.tabIndex >= 0);
      if (focusables.length === 0) return;
      const first = focusables[0]; const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };
}

/** Hands focus back to whatever invoked a surface once it closes. Always mount the host so this can run. */
export function useReturnFocus(active: boolean) {
  const returnTo = useRef<HTMLElement | null>(null);
  const was = useRef(false);
  useLayoutEffect(() => {
    if (active && !was.current) returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!active && was.current) {
      const target = returnTo.current;
      returnTo.current = null;
      if (target && document.contains(target) && !target.hasAttribute('disabled')) target.focus();
    }
    was.current = active;
  }, [active]);
}


/** A modal sheet must close on Escape even when focus has slipped to the page body (e.g. after tapping blank space). */
export function useSheetEscape(variant: 'panel' | 'sheet', onEscape: () => void) {
  const latest = useRef(onEscape);
  latest.current = onEscape;
  useEffect(() => {
    if (variant !== 'sheet') return;
    const handler = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') latest.current(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [variant]);
}
