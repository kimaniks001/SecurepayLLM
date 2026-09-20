import { Home, FileText, Wallet, Store, Users, User, Bell } from 'lucide-react';
import securepayMark from '../assets/brand/securepay/securepay-mark-green.png';
import securepayWordmark from '../assets/brand/securepay/securepay-wordmark-horizontal.png';
import type { AppView } from '../types';

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

export function NavBar({ view, onNavigate }: NavBarProps) {
  const isActive = (itemView: AppView) => {
    if (itemView === 'signed-in' && (view === 'signed-in' || view === 'conversation')) return true;
    if (itemView === 'agreements' && (view === 'agreements' || view === 'agreement-detail' || view === 'agreement-builder')) return true;
    if (itemView === 'money' && (view === 'money' || view === 'dispute')) return true;
    if (itemView === 'store' && view === 'store') return true;
    if (itemView === 'community' && (view === 'community' || view === 'circle' || view === 'ecosystem')) return true;
    if (itemView === 'account' && (view === 'account' || view === 'settings' || view === 'business' || view === 'developer' || view === 'projects' || view === 'vision-board' || view === 'recovery')) return true;
    return false;
  };
  const notificationsActive = view === 'notifications';

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center justify-between px-6 lg:px-10 py-4 border-b border-cream-200/60 bg-cream-50/80 backdrop-blur-sm sticky top-0 z-30">
        <button onClick={() => onNavigate('signed-in')} className="flex items-center gap-2">
          <img src={securepayMark} alt="" className="h-7 w-7" />
          <img src={securepayWordmark} alt="SecurePay" className="h-6 w-auto" />
        </button>
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.view)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.825rem] font-medium transition-all ${
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
            className={`ml-1 p-2 rounded-lg transition-all ${notificationsActive ? 'text-forest-700 bg-forest-50' : 'text-sand-500 hover:text-forest-600 hover:bg-cream-100'}`}
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-cream-50/95 backdrop-blur-md border-t border-cream-200 px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.view)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
              isActive(item.view) ? 'text-forest-600' : 'text-sand-400'
            }`}
          >
            <item.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            <span className="text-[0.6rem] font-medium">{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => onNavigate('notifications')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${notificationsActive ? 'text-forest-600' : 'text-sand-400'}`}
        >
          <Bell style={{ width: 18, height: 18 }} />
          <span className="text-[0.6rem] font-medium">Alerts</span>
        </button>
      </nav>
    </>
  );
}
