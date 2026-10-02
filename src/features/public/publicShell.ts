import { createContext, createElement, useContext, type ReactNode } from 'react';

/**
 * Public Experience Convergence Phase 2 -- which shell a screen is in.
 *
 * `AgentExperience` provides a value ONLY while nobody is signed in. `NavBar` reads it and renders the
 * public navigation instead of the signed-in app navigation, so every screen a signed-out visitor can reach
 * (Home, a conversation, Store, Community, Recovery, Help) shows the public shell without each screen having
 * to know. The default is `null`: anything rendered outside the provider -- and every signed-in screen --
 * keeps the unchanged signed-in `NavBar`.
 */
export type PublicSectionId = 'how-it-works' | 'trust-project' | 'for-business';

export interface PublicShellActions {
  /** Back to the public Home. */
  home: () => void;
  /** The public Sign in route (`#/sign-in`). Authentication only. */
  signIn: () => void;
  /** Public Experience Convergence Phase 4 -- the live `#/join` route. */
  join: () => void;
  /** Open the public, source-first Skills Institute doorway. */
  institute: () => void;
  /** Scroll to a public Home chapter and move focus to its heading (never changes `location.hash`). */
  section: (id: PublicSectionId) => void;
  /** Move focus to the KS001 composer ("Skip to KS001"). */
  skipToKs001: () => void;
}

const PublicShellContext = createContext<PublicShellActions | null>(null);

export function PublicShellProvider({ value, children }: { value: PublicShellActions | null; children: ReactNode }) {
  return createElement(PublicShellContext.Provider, { value }, children);
}

/** `null` when signed in (or outside the provider) -- the signed-in app shell. */
export function usePublicShell(): PublicShellActions | null {
  return useContext(PublicShellContext);
}

/**
 * The bottom padding every app screen reserves for the signed-in mobile bottom navigation. The public shell
 * has no bottom navigation, so it reserves nothing.
 */
export function useAppNavPadding(): string {
  return usePublicShell() ? '' : 'pb-16 md:pb-0';
}

/**
 * A stable object whose methods forward to whatever handlers the router registered on its latest render.
 * It lets the provider sit outside the router (so the router's early returns are all covered) while the
 * handlers still close over the router's current state.
 */
export function createPublicShellBridge(): PublicShellActions & { bind: (actions: PublicShellActions) => void } {
  let current: PublicShellActions | null = null;
  return {
    bind: actions => { current = actions; },
    home: () => current?.home(),
    signIn: () => current?.signIn(),
    join: () => current?.join(),
    institute: () => current?.institute(),
    section: id => current?.section(id),
    skipToKs001: () => current?.skipToKs001(),
  };
}

const prefersReducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scrolls a public chapter into view and moves programmatic focus to its heading. Returns false if not rendered. */
export function focusPublicSection(id: PublicSectionId): boolean {
  if (typeof document === 'undefined') return false;
  const heading = document.querySelector<HTMLElement>(`[data-public-section="${id}"] h2`);
  if (!heading) return false;
  // Focus first (without scrolling), then scroll: a focus() call made during a smooth scroll cancels it in Chrome.
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  return true;
}

/** Focuses the visible KS001 composer, if one is rendered. */
export function focusKs001Composer(): boolean {
  if (typeof document === 'undefined') return false;
  const composer = [...document.querySelectorAll<HTMLTextAreaElement>('[data-ks001-composer]')].find(el => el.offsetParent !== null)
    ?? document.querySelector<HTMLTextAreaElement>('[data-ks001-composer]');
  if (!composer) return false;
  composer.focus({ preventScroll: true });
  composer.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  return true;
}
