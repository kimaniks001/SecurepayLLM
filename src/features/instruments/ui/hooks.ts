import { useEffect, useState } from 'react';

/** True at Tailwind's `md` breakpoint and up. Exactly one instrument surface (panel OR sheet) is mounted at a time. */
export function useIsDesktop(): boolean {
  const query = '(min-width: 768px)';
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);
  return matches;
}

/**
 * On a phone the on-screen keyboard shrinks the VISUAL viewport but not the layout viewport, so a
 * `fixed bottom-0` sheet would sit behind it. This reports how far the keyboard covers the bottom
 * of the layout viewport so the sheet can lift by exactly that much and keep the active input visible.
 */
export function useKeyboardInset(enabled: boolean): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!enabled || !viewport) { setInset(0); return; }
    const measure = () => setInset(Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop)));
    measure();
    viewport.addEventListener('resize', measure);
    viewport.addEventListener('scroll', measure);
    return () => { viewport.removeEventListener('resize', measure); viewport.removeEventListener('scroll', measure); };
  }, [enabled]);
  return inset;
}
