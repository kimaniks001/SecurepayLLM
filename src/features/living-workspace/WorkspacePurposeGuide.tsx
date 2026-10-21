import { ArrowRight, Compass, ShieldCheck } from 'lucide-react';
import type { Ks001WorkspaceMode } from './personas';
import { workspacePurpose } from './workspacePurpose';

type Area = Exclude<Ks001WorkspaceMode,'work'>;

/** Owner-approved Gate 5B context, inside the EXISTING right-hand Living Workspace.
 * No synthetic answers, shadow records, membership decisions or Money authority.
 */
export function WorkspacePurposeGuide({area,onContinueToWork}:{
  area:Area;onContinueToWork:()=>void;
}) {
  const guidance=workspacePurpose(area);
  return <section aria-label={guidance.label+' purpose and next step'} data-approved-gate5b-purpose={area}
    className="mb-4 space-y-3 rounded-xl border border-cream-200 bg-[#f8faf6] p-3 text-sm">
    <div className="flex items-center gap-2">
      <Compass size={17} className="shrink-0 text-forest-700" aria-hidden="true"/>
      <h2 className="font-display text-lg text-forest-900">Where you are · {guidance.label}</h2>
    </div>
    <p className="leading-6 text-sand-700">{guidance.belongs}</p>
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-forest-900"><ShieldCheck size={16} aria-hidden="true"/> Important boundary</p>
      <p className="mt-1 text-xs leading-5 text-sand-700">{guidance.boundary}</p>
    </div>
    <div>
      <p className="text-xs font-semibold text-forest-900">One useful next step</p>
      <p className="mt-1 text-xs leading-5 text-sand-700">{guidance.next}</p>
    </div>
    <button type="button" onClick={onContinueToWork}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-forest-200 bg-white px-3 text-xs font-semibold text-forest-800 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-700">
      Open My Work <ArrowRight size={16} aria-hidden="true"/>
    </button>
    <p className="text-[11px] leading-4 text-sand-600">Opening My Work does not transfer, publish, approve or pay for anything.</p>
  </section>;
}
