import { Check, Clock, UserMinus } from 'lucide-react';
import type { AgreementPerson } from '../types';

interface AgreementPeopleProps {
  people: AgreementPerson[];
}

const statusConfig = {
  confirmed_current: { label: 'Confirmed current version', icon: Check, tone: 'text-forest-600 bg-forest-50' },
  joined_not_confirmed: { label: 'Joined — Not yet confirmed', icon: Clock, tone: 'text-ember-600 bg-ember-50' },
  not_joined: { label: 'Not yet joined', icon: UserMinus, tone: 'text-sand-500 bg-cream-100' },
  set_version: { label: 'Set version', icon: Check, tone: 'text-forest-600 bg-forest-50' },
};

export function AgreementPeople({ people }: AgreementPeopleProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">People</div>
      <div className="space-y-3">
        {people.map((person, i) => {
          const config = statusConfig[person.confirmationStatus];
          const Icon = config.icon;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-forest-50 flex items-center justify-center text-[0.75rem] font-medium text-forest-600 shrink-0">
                {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.875rem] font-medium text-forest-800">{person.name}</div>
                <div className="text-[0.75rem] text-sand-500">{person.role}</div>
              </div>
              <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium ${config.tone}`}>
                <Icon className="w-3 h-3" />
                {config.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
