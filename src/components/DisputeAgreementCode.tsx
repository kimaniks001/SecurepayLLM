import { Shield, Check } from 'lucide-react';

export function DisputeAgreementCode() {
  const rules = [
    'keep the dispute tied to this exact agreement/version',
    'isolate only the contested part',
    'show both parties the same information',
    'preserve each party\'s statement',
    'preserve evidence and activity',
    'not treat silence as agreement',
    'not allow the Agent to decide the outcome',
    'allow the parties to settle the disputed part themselves where possible',
    'escalate to a human Master only if needed',
  ];

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-forest-600" />
        <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">How this dispute will be handled</span>
      </div>
      <p className="text-[0.85rem] text-sand-600 mb-3">SecurePay will:</p>
      <ul className="space-y-2 mb-4">
        {rules.map((rule, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[0.825rem] text-forest-800">
            <Check className="w-3.5 h-3.5 text-forest-500 mt-0.5 shrink-0" />
            {rule}
          </li>
        ))}
      </ul>
      <p className="text-[0.825rem] text-sand-600 mb-3">
        Both parties must explicitly continue under these rules.
      </p>
      <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors">
        <Check className="w-4 h-4" />
        I agree to use the Agreement Code for this dispute
      </button>
    </div>
  );
}
