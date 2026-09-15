import { User, Check, Clock } from 'lucide-react';
import type { DisputeDetail } from '../types';

interface DisputeMasterAppointmentProps {
  dispute: DisputeDetail;
}

export function DisputeMasterAppointment({ dispute }: DisputeMasterAppointmentProps) {
  const master = dispute.selectedMaster;
  const status = dispute.masterAppointmentStatus;
  if (!master) return null;

  return (
    <div className="space-y-3 animate-quiet-in">
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Appoint Master</div>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-forest-50 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-forest-600" />
          </div>
          <div>
            <div className="text-[0.875rem] font-medium text-forest-800">{master.name}</div>
            <div className="text-[0.78rem] text-sand-500">{master.title}</div>
          </div>
        </div>

        <div className="rounded-lg bg-cream-50 px-3 py-2.5 mb-3">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Question to resolve</div>
          <p className="text-[0.825rem] text-forest-800">
            Do the shower-area tiles show workmanship defects covered by the agreed defect-correction obligation, and what remedial action is appropriate?
          </p>
        </div>

        <div className="flex items-baseline justify-between mb-4">
          <span className="text-[0.78rem] text-sand-600">Cost</span>
          <span className="text-[0.875rem] font-medium text-forest-800">{dispute.masterCost || master.cost}</span>
        </div>

        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Both parties must agree</div>
        <div className="space-y-2 mb-4">
          {status && (
            <>
              <div className="flex items-center justify-between rounded-xl border border-cream-200 px-3 py-2">
                <span className="text-[0.825rem] text-forest-800">James</span>
                {status.james === 'agreed' ? (
                  <span className="flex items-center gap-1.5 text-[0.78rem] font-medium text-forest-600">
                    <Check className="w-3.5 h-3.5" />
                    Agreed
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[0.78rem] font-medium text-sand-500">
                    <Clock className="w-3.5 h-3.5" />
                    Waiting
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-cream-200 px-3 py-2">
                <span className="text-[0.825rem] text-forest-800">Peter</span>
                {status.peter === 'agreed' ? (
                  <span className="flex items-center gap-1.5 text-[0.78rem] font-medium text-forest-600">
                    <Check className="w-3.5 h-3.5" />
                    Agreed
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[0.78rem] font-medium text-sand-500">
                    <Clock className="w-3.5 h-3.5" />
                    Waiting
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        <p className="text-[0.72rem] text-sand-400 mb-3">
          No appointment until the required agreement exists.
        </p>
        <button className="w-full rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors">
          Agree to appoint Master
        </button>
      </div>
    </div>
  );
}
