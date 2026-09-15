import { Lock, User, KeyRound } from 'lucide-react';
import type { SecureAuthResponse } from '../types';
import { ChoiceButtons } from './ChoiceButtons';

interface SecureAuthCardProps {
  data: SecureAuthResponse;
  onChoice: (value: string) => void;
}

const fieldIcons: Record<string, typeof Lock> = {
  text: User,
  password: Lock,
  otp: KeyRound,
};

export function SecureAuthCard({ data, onChoice }: SecureAuthCardProps) {
  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-lifted overflow-hidden max-w-md mx-auto animate-quiet-in">
      <div className="px-6 py-5">
        <div className="text-center mb-5">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-10 rounded-full bg-forest-50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-forest-600" />
            </div>
          </div>
          <h2 className="font-display text-lg text-forest-800">{data.title}</h2>
          <div className="mt-3 rounded-xl bg-cream-50 border border-cream-200 px-4 py-2.5 text-center">
            <div className="text-[0.875rem] font-medium text-forest-800">{data.identityName}</div>
            <div className="text-[0.78rem] text-sand-500 mt-0.5">{data.identityKsn}</div>
          </div>
          <p className="mt-3 text-[0.825rem] text-sand-600 leading-relaxed">{data.reason}</p>
        </div>

        <div className="space-y-3">
          {data.fields.map((field, i) => {
            const Icon = fieldIcons[field.type] || Lock;
            return (
              <div key={i}>
                <label className="text-[0.75rem] font-medium text-sand-600 uppercase tracking-wide">{field.label}</label>
                <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-cream-300 bg-cream-50 px-3.5 py-2.5">
                  <Icon className="w-4 h-4 text-sand-400" />
                  <input
                    type={field.type === 'password' ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    className="flex-1 bg-transparent text-[0.875rem] text-forest-800 placeholder:text-sand-400 outline-none"
                    readOnly
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[0.7rem] text-sand-400 text-center">Demo identity — no real authentication occurs</p>
      </div>

      <div className="px-6 pb-5">
        <ChoiceButtons
          data={{ type: 'CHOICE_BUTTONS', choices: [
            { label: data.primaryLabel, value: data.primaryValue },
            { label: data.secondaryLabel, value: data.secondaryValue },
          ] }}
          onChoice={onChoice}
        />
      </div>
    </div>
  );
}
