import {useState} from 'react';
import {AlertCircle,ShieldCheck,CheckCircle2} from 'lucide-react';
import {communitySaverPreScreen} from './communitySaverPreScreen.mjs';

const cents=(v:number)=>'KSh '+(v/100).toLocaleString('en-KE',{
  maximumFractionDigits:2,minimumFractionDigits:0
});
const q=communitySaverPreScreen({
  platformCode:'MY_RIDE',
  items:[
    {agreementId:'fictional-original-mabati',agreementVersionId:'v1',itemId:'lorry',baselineMinor:1_000_000,currency:'KES'},
    {agreementId:'fictional-original-boards',agreementVersionId:'v1',itemId:'pickup',baselineMinor:400_000,currency:'KES'}
  ],
  carrierOrHostCostMinor:1_000_000,
  otherIncrementalCostMinor:10_000,
  additionalProviderRewardMinor:0
});

/**
 * Illustrative Stage 7E3 funded-agreement replacement WATERFALL.
 * No canonical Agreement or regulated Money action is performed.
 */
export function MiniCommunitySaverFundedMoneyPreview(){
  const [refund,setRefund]=useState<'pending'|'simulated-received'>('pending');
  if(!q.ok)return null;
  const [a,b]=q.allocations;
  const aRebate=a.projectedSavingMinor;
  const bNewContribution=b.projectedCostMinor;
  const residual=bNewContribution-aRebate;
  return <section className="spm-saver-card" data-mini-saver-funded-money-preview>
    <div className="spm-saver-card-heading">
      <span>What happens to funded Money?</span><strong>Fictional safety check</strong>
    </div>
    <p className="spm-saver-description">Trader A already funded the KSh 10,000 lorry. Trader B already funded a KSh 4,000 pickup. SecurePay must not rewrite either original Agreement or count the same lorry twice.</p>
    <div className="spm-saver-detail">
      <div className="spm-saver-row"><span>Original A lorry remains funded</span><strong>{cents(a.baselineMinor)}</strong></div>
      <div className="spm-saver-row"><span>B's earlier pickup refund required</span><strong>{cents(b.baselineMinor)}</strong></div>
      <div className="spm-saver-row"><span>New shared provider cost (same lorry)</span><strong>{cents(1_000_000)}</strong></div>
      <div className="spm-saver-row"><span>Additional costs</span><strong>{cents(10_000)}</strong></div>
      <div className="spm-saver-row"><span>Conditional qualified Plug fee</span><strong>{cents(q.plugFeeMinor)}</strong></div>
    </div>
    <p className="spm-saver-description">Try the two refund states. These are fictional review controls, not an actual bank or provider confirmation.</p>
    <div className="spm-sell-pill-row">
      <button type="button" className={'spm-sell-answer-pill'+(refund==='pending'?' selected':'')}
        aria-pressed={refund==='pending'} onClick={()=>setRefund('pending')}>Refund pending</button>
      <button type="button" className={'spm-sell-answer-pill'+(refund==='simulated-received'?' selected':'')}
        aria-pressed={refund==='simulated-received'} onClick={()=>setRefund('simulated-received')}>
        Simulate refund received
      </button>
    </div>
    {refund==='pending'?<div className="spm-saver-detail" role="status">
      <strong><AlertCircle size={16}/> Previous pickup funds unresolved</strong>
      <p>Trader B's KSh 4,000 has not been confirmed as refunded by the original provider and regulated custody records. No replacement funding, rebate or Plug payout can follow from this demonstration.</p>
      <div className="spm-saver-row"><span>Pending original refund</span><strong>{cents(b.baselineMinor)}</strong></div>
    </div>:<div className="spm-saver-detail" role="status">
      <strong><CheckCircle2 size={16}/> Fictional refund assumed for illustration</strong>
      <p>Only after a REAL provider/bank attests the original pickup refund could the following separate funding instructions be considered. They are not authorized here.</p>
      <div className="spm-saver-row"><span>Proposed new contribution by B</span><strong>{cents(bNewContribution)}</strong></div>
      <div className="spm-saver-row"><span>Proposed reimbursement to A</span><strong>{cents(aRebate)}</strong></div>
      <div className="spm-saver-row"><span>Remaining for Plug and other costs</span><strong>{cents(residual)}</strong></div>
      <div className="spm-saver-row"><span>Conditional Plug fee (not earned)</span><strong>{cents(q.plugFeeMinor)}</strong></div>
      <div className="spm-saver-row"><span>Other legitimate costs</span><strong>{cents(10_000)}</strong></div>
      <p>Trader A's final projected item cost is {cents(a.projectedCostMinor)}; Trader B's is {cents(b.projectedCostMinor)}. Both preserve at least 25% NET saving.</p>
    </div>}
    <p className="spm-saver-footer"><ShieldCheck size={15}/>
      There is no payment button because funded Agreements cannot be silently amended. Actual refunds, revised Agreements, payer approvals, stage-specific regulated rails and earned Plug fees all require separate verified authority.
    </p>
  </section>;
}
