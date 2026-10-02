import { useEffect, useId, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';
import securepayWordmark from '../../assets/brand/securepay/securepay-wordmark-horizontal.png';
import type { PublicSectionId, PublicShellActions } from './publicShell';
import { PUBLIC_NAV_SECTIONS } from './publicContent';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50';

/**
 * Public Experience Convergence Phase 2 -- the signed-out navigation. Desktop: brand, three chapter links,
 * Sign in. Mobile: brand, Sign in and a menu with the three chapter links, and no bottom bar. It never shows
 * the signed-in app destinations (Agreements, Money, Store, Community, Account, Notifications …).
 */
export function PublicNav({ actions }: { actions: PublicShellActions }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const closeMenu = (returnFocus: boolean) => {
    setMenuOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!menuOpen) return;
    const sheet = sheetRef.current;
    sheet?.querySelector<HTMLElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); return; }
      if (event.key !== 'Tab' || !sheet) return;
      // Keep focus inside the open sheet.
      const focusable = [...sheet.querySelectorAll<HTMLElement>('button')];
      if (focusable.length === 0) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const goToSection = (id: PublicSectionId) => { setMenuOpen(false); actions.section(id); };

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-cream-200/60 bg-cream-50/85 backdrop-blur-sm" data-public-nav>
      <a
        href="#ks001"
        onClick={event => { event.preventDefault(); actions.skipToKs001(); }}
        className={`sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-medium text-cream-50 ${focusRing}`}
      >
        Skip to KS001
      </a>
      <nav aria-label="SecurePay" className="flex items-center justify-between gap-3 px-4 md:px-6 lg:px-10 py-3 md:py-3.5">
        <button type="button" onClick={() => { setMenuOpen(false); actions.home(); }} aria-label="SecurePay home" className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg ${focusRing}`}>
          <img src={securepayMark} alt="" className="h-7 w-7" />
          <img src={securepayWordmark} alt="" className="hidden min-[400px]:block h-6 w-auto" />
        </button>

        <div className="hidden md:flex items-center gap-1">
          {PUBLIC_NAV_SECTIONS.map(section => (
            <button key={section.id} type="button" onClick={() => goToSection(section.id)}
              className={`min-h-11 rounded-lg px-3.5 text-[0.875rem] font-medium text-forest-700 hover:bg-cream-100 hover:text-forest-800 transition-colors ${focusRing}`}>
              {section.label}
            </button>
          ))}
          <button type="button" onClick={() => { setMenuOpen(false); actions.institute(); }}
            className={`min-h-11 rounded-lg px-3.5 text-[0.875rem] font-medium text-forest-700 hover:bg-cream-100 hover:text-forest-800 transition-colors ${focusRing}`}>
            Institute
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Phase 4 -- Sign in is secondary, Join is primary. */}
          <button type="button" onClick={() => { setMenuOpen(false); actions.signIn(); }}
            className={`min-h-11 rounded-xl border border-forest-200 bg-white/70 px-3 sm:px-4 text-[0.875rem] font-medium text-forest-800 hover:bg-forest-50 transition-colors ${focusRing}`}>
            Sign in
          </button>
          <button type="button" onClick={() => { setMenuOpen(false); actions.join(); }} data-public-join-cta
            className={`min-h-11 rounded-xl bg-forest-600 px-3 sm:px-4 text-[0.875rem] font-medium text-cream-50 hover:bg-forest-700 transition-colors ${focusRing}`}>
            Join
          </button>
          <button
            ref={triggerRef}
            type="button"
            className={`md:hidden flex h-11 w-11 items-center justify-center rounded-xl text-forest-700 hover:bg-cream-100 ${focusRing}`}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => (menuOpen ? closeMenu(true) : setMenuOpen(true))}
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <>
          <div
            ref={sheetRef}
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="md:hidden absolute inset-x-0 top-full z-30 border-b border-cream-200 bg-cream-50 px-4 pb-4 pt-2 shadow-lifted animate-fade-in-down"
          >
            <ul className="space-y-1">
              {PUBLIC_NAV_SECTIONS.map(section => (
                <li key={section.id}>
                  <button type="button" onClick={() => goToSection(section.id)}
                    className={`flex min-h-12 w-full items-center rounded-xl px-3 text-left text-[0.95rem] font-medium text-forest-800 hover:bg-cream-100 ${focusRing}`}>
                    {section.label}
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => { setMenuOpen(false); actions.institute(); }}
                  className={`flex min-h-12 w-full items-center rounded-xl px-3 text-left text-[0.95rem] font-medium text-forest-800 hover:bg-cream-100 ${focusRing}`}>
                  Institute
                </button>
              </li>
            </ul>
          </div>
        </>
      )}
    </header>
    {/* The tap-outside backdrop sits OUTSIDE the header: the header's backdrop blur makes it the containing
        block for fixed children, which would collapse a fixed backdrop inside it to the header's own box. */}
    {menuOpen && <div className="md:hidden fixed inset-0 z-20 bg-forest-900/20 animate-fade-in" aria-hidden="true" onClick={() => closeMenu(true)} />}
    </>
  );
}
