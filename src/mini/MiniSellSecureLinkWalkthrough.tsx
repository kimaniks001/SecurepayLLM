import {useState} from 'react';
import {ArrowRight, Check, CheckCircle2, Copy, FileText, Link2, MessageCircle, QrCode, Send, ShieldCheck} from 'lucide-react';

type Stage = 'review' | 'draft' | 'proposed' | 'link' | 'buyer';
type Props = {
  title: string;
  moneyText: string;
  description: string;
  place: string;
  timing: string;
  onChangeOffer: () => void;
};

/**
 * Isolated owner-preview walkthrough of the SAME visible seller milestones as
 * the real KS001 -> version-reviewed Agreement -> standard SecureLink flow.
 *
 * NO auth gateways, IDs, SecureLink slugs, URLs, QR data, payments, contact
 * transmission, signature, delivery, or actual Agreement writes exist here.
 */
export function MiniSellSecureLinkWalkthrough({
  title,moneyText,description,place,timing,onChangeOffer
}:Props) {
  const [stage,setStage]=useState<Stage>('review');
  const [acknowledged,setAcknowledged]=useState(false);
  const [showQrExample,setShowQrExample]=useState(false);
  const stages: Stage[]=['review','draft','proposed','link'];
  const currentIndex=stages.indexOf(stage);

  return <section className="spm-sell-link-walkthrough" data-mini-securelink-walkthrough="isolated" aria-label="Agreement and SecureLink walkthrough">
    <div className="spm-sell-walkthrough-head">
      <strong><ShieldCheck size={17}/> From offer to SecureLink</strong>
      <small>Walkthrough only · nothing is sent or created</small>
    </div>
    <div className="spm-sell-walkthrough-steps" aria-label="Agreement formation">
      {['Check terms','Draft Agreement','Ready for buyer','SecureLink'].map((label,index)=>
        <span key={label} className={index<=(stage==='buyer'?3:currentIndex)?'is-done':''}>
          {index<(stage==='buyer'?4:currentIndex)?<Check size={13}/>:index+1} {label}
        </span>
      )}
    </div>

    {stage==='review'&&<>
      <strong className="spm-sell-inline-question">Are these the terms you want your buyer to review?</strong>
      <div className="spm-sell-review-card">
        <strong>{title}</strong>
        <p>{description||'The item or work described in your offer'}</p>
        <small>Price proposed: {moneyText}</small>
        <small>Buyer: To be confirmed by the buyer</small>
        <small>Where: {place||'To be agreed'}</small>
        <small>When: {timing||'To be agreed'}</small>
        <small>Availability, permissions and any unanswered terms still need confirmation.</small>
      </div>
      <div className="spm-sell-pill-row">
        <button type="button" className={acknowledged?'spm-sell-walkthrough-pill selected':'spm-sell-walkthrough-pill'}
          onClick={()=>setAcknowledged(true)}>
          <CheckCircle2 size={15}/> These are the terms I'll share
        </button>
        <button type="button" className="spm-sell-walkthrough-pill" onClick={onChangeOffer}>
          I need to change something
        </button>
      </div>
      {acknowledged&&<button type="button" className="spm-secondary spm-sell-wide"
        onClick={()=>setStage('draft')}><FileText size={16}/> Set up draft Agreement <ArrowRight size={16}/></button>}
    </>}

    {stage==='draft'&&<>
      <div className="spm-sell-review-card">
        <strong><CheckCircle2 size={17}/> Draft Agreement prepared — example</strong>
        <p>SecurePay would preserve the reviewed terms as a draft with its own version.</p>
        <small>It is not accepted by the buyer, and no Money action has begun.</small>
      </div>
      <button type="button" className="spm-secondary spm-sell-wide"
        onClick={()=>setStage('proposed')}>Propose Agreement for buyer review <ArrowRight size={16}/></button>
    </>}

    {stage==='proposed'&&<>
      <div className="spm-sell-review-card">
        <strong><CheckCircle2 size={17}/> Ready for buyer review — example</strong>
        <p>The Agreement has proposed terms. The buyer must see and confirm the actual version, not simply receive a message.</p>
        <small>No invitation has been sent. Buyer has not accepted or paid.</small>
      </div>
      <button type="button" className="spm-secondary spm-sell-wide"
        onClick={()=>setStage('link')}><Link2 size={16}/> Show SecureLink step <ArrowRight size={16}/></button>
    </>}

    {(stage==='link'||stage==='buyer')&&<>
      <div className="spm-sell-review-card spm-sell-walkthrough-link">
        <strong><Link2 size={18}/> SecureLink</strong>
        <span className="spm-sell-walkthrough-placeholder" aria-label="Sample of the SecureLink address field">
          SecureLink address appears here after issuance
        </span>
        <p>In the real app, SecurePay issues a unique, server-verified link to this exact Agreement. This walkthrough has not issued a URL or QR code.</p>
        <div className="spm-sell-pill-row" aria-label="SecureLink delivery choices — example only">
          <button className="spm-sell-walkthrough-pill" type="button" disabled><Copy size={15}/> Copy link</button>
          <button className="spm-sell-walkthrough-pill" type="button" disabled><Send size={15}/> Share link</button>
          <button className="spm-sell-walkthrough-pill" type="button"
            aria-expanded={showQrExample} onClick={()=>setShowQrExample(v=>!v)}>
            <QrCode size={15}/> {showQrExample?'Hide QR example':'Show QR example'}
          </button>
        </div>
        {showQrExample&&<div className="spm-sell-qr-display" data-mini-nonscannable-qr-example>
          <QrCode size={112} strokeWidth={1.1} aria-hidden="true"/>
          <p>Layout example only — this is an icon, NOT a scannable QR code. The real QR appears only with a server-issued link.</p>
        </div>}
        <small>Still not shared · not accepted · no Money authorized</small>
      </div>
      <div className="spm-sell-pill-row">
        <button type="button" className="spm-sell-walkthrough-pill"
          onClick={()=>setStage(stage==='buyer'?'link':'buyer')}>
          {stage==='buyer'?'Back to SecureLink':'See what the buyer would see'} <ArrowRight size={15}/>
        </button>
      </div>
    </>}

    {stage==='buyer'&&<div className="spm-sell-review-card" data-mini-securelink-buyer-view="sample">
      <strong><MessageCircle size={17}/> Buyer's view — sample</strong>
      <p>Someone has offered you: <strong>{title}</strong>.</p>
      <small>{moneyText} · {timing||'Time to agree'} · {place||'Place to agree'}</small>
      <p>They can read the exact Agreement, ask a question, request a change, or confirm their own acceptance. The sender cannot confirm on their behalf.</p>
      <small>No buyer action is enabled in this walkthrough.</small>
    </div>}

    <p className="spm-sell-hint">This is a visual demonstration, not a real SecureLink. Only the signed-in SecurePay backend can issue a shareable link. We will review link-versus-QR delivery separately.</p>
  </section>;
}
