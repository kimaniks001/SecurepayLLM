import { ArrowRight, CircleHelp, ShieldCheck } from 'lucide-react';
import type { AgreementFormationDto } from '../api/securepay/agent/dto';
import { miniAgreementSlots } from './miniAgreementSlots.mjs';

/**
 * An extra onion layer within existing Mini. Server-sourced, read-only:
 * it cannot set terms, accept another participant, sign or touch money.
 * <details> exposes depth only when explicitly opened by the customer.
 */
export function MiniAgreementSlots({ formation }: { formation: AgreementFormationDto }) {
  const view = miniAgreementSlots(formation);
  if (!view) return <div className="spm-guest-prepared" role="status">
    SecurePay couldn't confirm the Agreement's details. No terms have been accepted.
  </div>;
  return <section className="spm-guest-prepared spm-mini-slots"
    aria-label="Agreement taking shape" data-mini-agreement-version={view.version}>
    <div className="spm-mini-slots-heading">
      <ShieldCheck size={17}/>
      <div><strong>Agreement taking shape</strong>
        <small>Draft understanding · version {view.version}</small>
      </div>
    </div>
    {view.summary && <p>{view.summary}</p>}
    {view.sections.length === 0 && <p>We haven't established the Agreement details yet. Continue talking with KS001.</p>}
    <div className="spm-mini-slots-list">
      {view.sections.map(section => <details key={section.id} className="spm-mini-slot">
        <summary>
          <span><strong>{section.title}</strong>
            <small>{section.items.length} {section.items.length===1?'detail':'details'}</small>
          </span><ArrowRight size={15} aria-hidden="true"/>
        </summary>
        <div className="spm-mini-slot-items">
          {section.items.map(item=><div key={item.key} className="spm-mini-slot-item">
            <strong>{item.title}</strong>
            <p>{item.value}</p>
            {item.detail && <small>{item.detail}</small>}
            {item.needsChecking && <small className="spm-mini-slot-unverified">Needs checking</small>}
          </div>)}
        </div>
      </details>)}
    </div>
    {view.sourceReading.length>0 && <p className="spm-mini-slot-note">
      SecurePay is still reading {view.sourceReading.length} source(s). These details may change.
    </p>}
    {view.unresolved.length>0 && <details className="spm-mini-slot spm-mini-slot-open">
      <summary><span><strong>Still to settle</strong>
        <small>{view.unresolved.length} open {view.unresolved.length===1?'point':'points'}</small>
      </span><ArrowRight size={15}/></summary>
      <div className="spm-mini-slot-items">
        {view.unresolved.map(item=><div key={item.id} className="spm-mini-slot-item">
          <p>{item.text}</p>{item.acknowledged && <small>Noted, but not resolved</small>}
        </div>)}
      </div>
    </details>}
    {view.question && <div className="spm-mini-slot-next">
      <CircleHelp size={16}/>
      <div><strong>What KS001 needs to clarify</strong><p>{view.question.text}</p>
        <small>Reply in the conversation above; nothing is decided automatically.</small></div>
    </div>}
    {(view.reviewBlockedReason || view.confirmationBlockedReason) && <p className="spm-mini-slot-note">
      {view.reviewBlockedReason || view.confirmationBlockedReason}
    </p>}
    <p className="spm-mini-slot-disclosure">
      A draft understanding, not an accepted Agreement. People, consent, dates and money remain subject to the required confirmations. No invitations, payments or funds have moved.
    </p>
  </section>;
}
