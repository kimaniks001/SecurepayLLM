import { AlertCircle, Clock } from 'lucide-react';
import type { DisputeDetail } from '../types';

interface DisputeUnresolvedProps {
  dispute: DisputeDetail;
}

export function DisputeUnresolved({ dispute }: DisputeUnresolvedProps) {
  return (
    <div className="space-y-3 animate-quiet-in">
      <div className="rounded-2xl border border-ember-200 bg-ember-50/50 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-ember-600" />
          <span className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide">Unresolved</span>
        </div>
        <p className="text-[0.85rem] text-ember-700 mb-2">
          The parties have not reached matching instructions after the Master opinion.
        </p>
        <p className="text-[0.825rem] text-sand-600 mb-3">
          SecurePay does not manufacture a forced resolution. The disputed component remains restricted according to the real authority.
        </p>
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Current state</div>
        <div className="space-y-2">
          {dispute.match?.disagreedPoints.map((pt, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-cream-50 px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-sand-400 shrink-0" />
              <div className="flex-1">
                <div className="text-[0.78rem] font-medium text-sand-600">{pt.label}</div>
                <div className="text-[0.78rem] text-forest-800">James: {pt.james}</div>
                <div className="text-[0.78rem] text-forest-800">Peter: {pt.peter}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Available next steps</div>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2 text-[0.825rem] text-forest-800">
            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
            Continue discussing the disputed component
          </li>
          <li className="flex items-start gap-2 text-[0.825rem] text-forest-800">
            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
            Propose a new resolution based on the Master opinion
          </li>
          <li className="flex items-start gap-2 text-[0.825rem] text-sand-500">
            <span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" />
            Escalate to a formal legal framework (where available)
          </li>
        </ul>
      </div>

      <p className="text-[0.72rem] text-sand-400 px-1">
        Silence is never agreement. No response does not mean accepted, resolved, released, or refunded. The disputed amount remains restricted according to authoritative SecurePay Money rules.
      </p>
    </div>
  );
}
