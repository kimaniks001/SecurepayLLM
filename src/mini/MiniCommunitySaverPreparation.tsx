import {useState} from 'react';
import {ShieldCheck,RefreshCcw} from 'lucide-react';
import type {
  CommunitySaverPreparationGateway,CommunitySaverPreparationPlatform,
  CommunitySaverPreparationView
} from '../api/securepay/community-saver-preparation';

type Props={
  gateway:CommunitySaverPreparationGateway;
  agreementId:string;
  versionId:string;
  itemId:string;
  baselineMinor:number;
  prepare:()=>Promise<unknown>;
};
const choices:{label:string;value:CommunitySaverPreparationPlatform}[]=[
  {label:'Shortstays',value:'SHORTSTAYS'},
  {label:'My Ride',value:'MY_RIDE'},
  {label:'Storage',value:'STORAGE'}
];
const copy:Record<string,string>={
  PLATFORM_NOT_APPROVED:'This type of service is not part of Community Saver.',
  AGREEMENT_ITEM_OR_CURRENT_CONSENT_REQUIRED:
    'The original Agreement item or current confirmations need review.',
  NO_GENUINE_APPROVED_PROVIDER_SOURCE:
    'We need current availability, an approved provider quote and the actual cancellation terms from this service.',
  NO_INDEPENDENTLY_OPTED_IN_COMPATIBLE_MATCH:
    'The provider information can be checked, but no independently opted-in compatible opportunity has been verified.',
  CANNOT_VERIFY_PRIVATE_SAVING:'The proposed saving could not be established from authoritative records.',
  NOT_REALIZED_NEEDS_SEPARATE_LATER_ACCEPTANCE_AND_MONEY:
    'These figures are for review only. Final acceptance, the original funding position and Money remain separate.'
};
const kes=(minor:number)=>'KSh '+(minor/100).toLocaleString('en-KE',{
  maximumFractionDigits:2,minimumFractionDigits:0
});

/**
 * Real-account, signed-in, staging-gated preparation for ONE OWN priced item.
 * No cross-party identity, opportunity feed, payout or legal acceptance.
 */
export function MiniCommunitySaverPreparation({gateway,agreementId,versionId,
  itemId,baselineMinor,prepare}:Props) {
  const [platform,setPlatform]=useState<CommunitySaverPreparationPlatform>('MY_RIDE');
  const [status,setStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [result,setResult]=useState<CommunitySaverPreparationView|null>(null);
  const select=(next:CommunitySaverPreparationPlatform)=>{
    setPlatform(next);setStatus('idle');setResult(null);
  };
  const inspect=async()=>{
    if(status==='loading')return;
    setStatus('loading');setResult(null);
    try{
      await prepare();
      const reply=await gateway.inspect(agreementId,itemId,versionId,platform);
      if(!reply||reply.phase!=='PREPARATION_ONLY_MONEY_DEFERRED'
          ||reply.agreementId!==agreementId
          ||reply.currentAgreementVersionId!==versionId
          ||reply.itemId!==itemId||reply.platformCode!==platform
          ||reply.currency!=='KES'
          ||reply.originalItemMinor!==baselineMinor
          ||reply.moneyDeferred!==true
          ||reply.realizedSavingVerified!==false
          ||reply.otherTraderDetailsReleased!==false
          ||reply.realPlugInvitationSent!==false
          ||reply.agreementAmended!==false
          ||reply.anyMoneyAuthorized!==false)
        throw Error('Unexpected preparation authority');
      setResult(reply);setStatus('ready');
    }catch{
      setStatus('error');
    }
  };
  return <section className="spm-mini-saver-item" data-mini-saver-preparation-only>
    <p className="spm-sell-hint"><ShieldCheck size={14}/> Community Saver · prepare now, Money later</p>
    <div className="spm-sell-pill-row" aria-label="Approved facilitation service">
      {choices.map(c=><button key={c.value} type="button"
        className={'spm-sell-answer-pill'+(platform===c.value?' selected':'')}
        aria-pressed={platform===c.value} onClick={()=>select(c.value)}>{c.label}</button>)}
    </div>
    <button type="button" className="spm-quiet-button"
      disabled={status==='loading'} onClick={()=>void inspect()}>
      {status==='loading'?<RefreshCcw size={15}/>:<ShieldCheck size={15}/>}
      {status==='loading'?'Checking this item…':'Prepare Community Saver review'}
    </button>
    {status==='error'&&<p className="spm-sell-hint" role="status">
      We could not check the current service information. No trader or provider was contacted.
    </p>}
    {result&&<div className="spm-mini-saver-status" role="status">
      <strong>{result.status==='HYPOTHETICAL_SAVING_FOR_REVIEW'?
        'Possible saving for review':'Preparation check'}</strong>
      <p>{copy[result.reasonCode]||
        'A separately verified provider and qualified participant review are still required.'}</p>
      {result.status==='HYPOTHETICAL_SAVING_FOR_REVIEW'&&
        result.providerSourceVerified&&result.hypotheticalNewItemCostMinor!==null&&
        result.hypotheticalSavingMinor!==null&&
        result.hypotheticalSavingPercent!==null&&
        <div>
          <p>My original item: {kes(result.originalItemMinor)}</p>
          <p>Possible new item cost: {kes(result.hypotheticalNewItemCostMinor)}</p>
          <p>Possible saving: {kes(result.hypotheticalSavingMinor)} ({result.hypotheticalSavingPercent.toFixed(2)}%)</p>
        </div>}
      <small>Money is deferred. No realized saving, other trader details, Plug assignment, Agreement change or payment was created.</small>
    </div>}
  </section>;
}
