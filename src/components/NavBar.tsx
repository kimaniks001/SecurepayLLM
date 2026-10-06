import { Home, FileText, Wallet, Store, Users, User, Bell } from 'lucide-react';
import securepayMark from '../assets/brand/securepay/securepay-mark-green.png';
import securepayWordmark from '../assets/brand/securepay/securepay-wordmark-horizontal.png';
import type { AppView } from '../types';
import { usePublicShell } from '../features/public/publicShell';
import { PublicNav } from '../features/public/PublicNav';

interface NavBarProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
}

const navItems: { icon: typeof Home; label: string; view: AppView }[] = [
  { icon: Home, label: 'Home', view: 'signed-in' },
  { icon: FileText, label: 'Agreements', view: 'agreements' },
  { icon: Wallet, label: 'Money', view: 'money' },
  { icon: Store, label: 'Store', view: 'store' },
  { icon: Users, label: 'Community', view: 'community' },
  { icon: User, label: 'Account', view: 'account' },
];

// Masterpiece mobile doctrine: five obvious destinations. Money is reached from the Agreement
// that gives it meaning; Account/notifications remain available from page-level affordances.
const mobileNavItems: { icon: typeof Home; label: string; view: AppView }[] = [
  { icon: Home, label: 'Home', view: 'signed-in' },
  { icon: FileText, label: 'Vision', view: 'vision-board' },
  { icon: FileText, label: 'Agreements', view: 'agreements' },
  { icon: Store, label: 'Store', view: 'store' },
  { icon: Users, label: 'Community', view: 'community' },
];

/**
 * Public Experience Convergence Phase 2 -- signed-out visitors get the public navigation (see
 * `PublicShell`); the signed-in app navigation below is unchanged.
 */
export function NavBar(props: NavBarProps) {
  const publicShell = usePublicShell();
  if (publicShell) return <PublicNav actions={publicShell} />;
  return <AppNavBar {...props} />;
}

function AppNavBar({ view, onNavigate }: NavBarProps) {
  const isActive = (itemView: AppView) => {
    if (itemView === 'signed-in' && (view === 'signed-in' || view === 'conversation')) return true;
    if (itemView === 'agreements' && (view === 'agreements' || view === 'agreement-detail' || view === 'agreement-builder')) return true;
    if (itemView === 'money' && (view === 'money' || view === 'dispute')) return true;
    if (itemView === 'store' && view === 'store') return true;
    if (itemView === 'community' && (view === 'community' || view === 'circle' || view === 'ecosystem')) return true;
    if (itemView === 'vision-board' && view === 'vision-board') return true;
    if (itemView === 'account' && (view === 'account' || view === 'settings' || view === 'business' || view === 'developer' || view === 'projects' || view === 'recovery')) return true;
    return false;
  };
  const notificationsActive = view === 'notifications';

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center justify-between gap-3 px-6 lg:px-10 py-3 border-b border-cream-200/60 bg-cream-50/80 backdrop-blur-sm sticky top-0 z-30">
        {/* Phase 4 (UR-223): at md the full brand crowded Home -- the mark alone there, mark + wordmark from lg. */}
        <button onClick={() => onNavigate('signed-in')} aria-label="SecurePay" className="flex min-h-11 shrink-0 items-center gap-2">
          <img src={securepayMark} alt="" className="h-7 w-7" />
          <img src={securepayWordmark} alt="" className="hidden lg:block h-6 w-auto" />
        </button>
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.view)}
              className={`flex min-h-11 items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.825rem] font-medium transition-all ${
                isActive(item.view)
                  ? 'text-forest-700 bg-forest-50'
                  : 'text-sand-500 hover:text-forest-600 hover:bg-cream-100'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
          {/* Task doctrine: a restrained attention entry, not another primary tab -- icon-only,
              no badge count, visually quieter than the labeled items above (see
              docs/PHASE6_CONVERGENCE_PRODUCTION.md's Notifications placement note). */}
          <button
            onClick={() => onNavigate('notifications')}
            aria-label="Notifications"
            className={`ml-1 inline-flex h-11 w-11 items-center justify-center rounded-lg transition-all ${notificationsActive ? 'text-forest-700 bg-forest-50' : 'text-sand-500 hover:text-forest-600 hover:bg-cream-100'}`}
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav — five obvious destinations, large enough to understand at a glance. */}
      <nav className="sp-mobile-tabbar md:hidden fixed bottom-0 left-0 right-0 z-30 bg-cream-50/96 backdrop-blur-xl border-t border-cream-200/80 px-2 pt-1.5 flex items-center justify-around">
        {mobileNavItems.map((item) => {
          const active = isActive(item.view);
          return (
            <button
              key={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(item.view)}
              className={`sp-mobile-tab relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 transition-colors ${
                active ? 'text-forest-700' : 'text-sand-500'
              }`}
            >
              <item.icon aria-hidden="true" style={{ width: 20, height: 20 }} />
              <span className="text-[0.64rem] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
