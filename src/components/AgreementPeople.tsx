import { Check, Clock, HelpCircle, RefreshCw, User, UserMinus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AgreementPerson } from '../types';

interface AgreementPeopleProps {
  people: AgreementPerson[];
  /** Real-mode: the deliberate Invite action and the invitation list live here, in the People area itself. */
  children?: ReactNode;
}

const statusConfig = {
  confirmed_current: { label: 'Confirmed current version', icon: Check, tone: 'text-forest-600 bg-forest-50' },
  joined_not_confirmed: { label: 'Joined — Not yet confirmed', icon: Clock, tone: 'text-ember-600 bg-ember-50' },
  not_joined: { label: 'Not yet joined', icon: UserMinus, tone: 'text-sand-500 bg-cream-100' },
  set_version: { label: 'Set version', icon: Check, tone: 'text-forest-600 bg-forest-50' },
};

/** Kind-specific icon AND words: no state is conveyed by colour alone. */
const kindConfig = {
  current: { icon: Check, tone: 'text-forest-700 bg-forest-50' },
  needs: { icon: RefreshCw, tone: 'text-ember-700 bg-ember-50' },
  waiting: { icon: Clock, tone: 'text-sand-700 bg-cream-100' },
  unknown: { icon: HelpCircle, tone: 'text-sand-700 bg-cream-100' },
  neutral: { icon: User, tone: 'text-forest-700 bg-cream-100' },
};

export function AgreementPeople({ people, children }: AgreementPeopleProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">People</div>
      <ul className="space-y-3" aria-label="People on this Agreement">
        {people.map((person, i) => {
          const config = person.statusText ? kindConfig[person.statusKind ?? 'neutral'] : statusConfig[person.confirmationStatus];
          const Icon = config.icon;
          const label = person.statusText ?? statusConfig[person.confirmationStatus].label;
          return (
            <li key={i} className="flex items-start gap-3">
              <div aria-hidden="true" className="w-9 h-9 rounded-full bg-forest-50 flex items-center justify-center text-[0.75rem] font-medium text-forest-600 shrink-0">
                {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="break-words text-[0.875rem] font-medium text-forest-800">{person.name}</div>
                <div className="text-[0.75rem] text-sand-500">{person.role}</div>
                <div className={`mt-1.5 inline-flex max-w-full items-start gap-1.5 rounded-2xl px-2.5 py-1 text-[0.75rem] font-medium ${config.tone}`}>
                  <Icon aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="min-w-0 break-words">{label}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {children}
    </div>
  );
}
