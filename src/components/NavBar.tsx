import { Bell, User } from 'lucide-react';
import securepayWordmark from '../assets/brand/securepay/securepay-wordmark-horizontal.png';
import type { AppView } from '../types';
import { usePublicShell } from '../features/public/publicShell';
import { PublicNav } from '../features/public/PublicNav';

interface NavBarProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
}

/**
 * Human Experience Phase 2 — signed-out navigation still belongs to the public website. Once signed
 * in, the ordinary shell stops teaching SecurePay's module map. Deep links and specialist routes
 * remain real; Home/current work, attention and identity are the quiet persistent controls.
 */
export function NavBar(props: NavBarProps) {
  const publicShell = usePublicShell();
  if (publicShell) return <PublicNav actions={publicShell} />;
  return <AppNavBar {...props} />;
}

function AppNavBar({ view, onNavigate }: NavBarProps) {
  const notificationsActive = view === 'notifications';
  const accountActive = view === 'account' || view === 'settings' || view === 'business' || view === 'developer' || view === 'projects' || view === 'recovery';

  return (
    <nav
      aria-label="SecurePay"
      className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-cream-200/70 bg-cream-50/95 px-4 backdrop-blur-xl md:px-7"
      data-human-shell-nav
    >
      <button
        type="button"
        onClick={() => onNavigate('signed-in')}
        aria-label="SecurePay Home"
        className="flex min-h-11 items-center"
      >
        <img src={securepayWordmark} alt="SecurePay" className="h-6 w-auto" />
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onNavigate('notifications')}
          aria-label="Notifications"
          aria-current={notificationsActive ? 'page' : undefined}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
            notificationsActive ? 'bg-forest-50 text-forest-700' : 'text-sand-600 hover:bg-cream-100 hover:text-forest-700'
          }`}
        >
          <Bell aria-hidden="true" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('account')}
          aria-label="Account"
          aria-current={accountActive ? 'page' : undefined}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
            accountActive ? 'bg-forest-50 text-forest-700' : 'text-sand-600 hover:bg-cream-100 hover:text-forest-700'
          }`}
        >
          <User aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}
