import {useState} from 'react';
import {CheckCircle2,ShieldCheck,RefreshCcw} from 'lucide-react';
import type {CommunitySaverOwnItemGateway,CommunitySaverOwnItemEvidence} from '../api/securepay/community-saver-own-item';

type Props={
  gateway:CommunitySaverOwnItemGateway;
  agreementId:string;
  versionId:string;
  itemId:string;
  itemTitle:string;
  baselineMinor:number;
  prepare:()=>Promise<unknown>;
};
const codeCopy:Record<string,string>={
  AGREEMENT_CLOSED:'This Agreement is no longer active.',
  CURRENT_CONSENT_MISSING:'The current Agreement terms still need confirmation.',
  ITEM_FUNDING_UNVERIFIED:'The item’s funding could not be confirmed.',
  REGULATED_CUSTODY_AND_PLATFORM_VERIFICATION_REQUIRED:
    'The item has an internal Money record, but regulated custody and its approved facilitation platform are not yet verified.'
};
/** Deliberate, single-item read only — never a public market or Plug enquiry. */
export function MiniCommunitySaverItemCheck({gateway,agreementId,versionId,itemId,itemTitle,baselineMinor,prepare}:Props){
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<CommunitySaverOwnItemEvidence|null>(null);
  const [message,setMessage]=useState('');
  const check=async()=>{
    if(busy)return;
    setBusy(true);setResult(null);setMessage('');
    try{
      await prepare();
      const reply=await gateway.read(agreementId,itemId,versionId);
      if(!reply||reply.agreementId!==agreementId||
        reply.agreementVersionId!==versionId||reply.itemId!==itemId||
        reply.currency!=='KES'||reply.baselineMinor!==baselineMinor||
        reply.itemTitle!==itemTitle||
        reply.platformState!=='UNVERIFIED'||reply.matchingState!=='BLOCKED'||
        reply.published!==false||reply.plugAssigned!==false||
        reply.providerVerified!==false||reply.agreementChanged!==false||
        reply.moneyAuthorized!==false)
        throw Error('Unexpected source status');
      setResult(reply);
    }catch{
      setMessage('The current item could not be checked. Refresh your Agreement and try again. No one was contacted.');
    }finally{setBusy(false);}
  };
  return <div className="spm-mini-saver-item" data-mini-phase7-private-item>
    <button type="button" className="spm-quiet-button" disabled={busy}
      onClick={()=>void check()}>
      {busy?<RefreshCcw size={15}/>:<ShieldCheck size={15}/>}
      {busy?'Checking this item…':'Check Community Saver eligibility'}
    </button>
    {message&&<p className="spm-sell-hint" role="status">{message}</p>}
    {result&&<div className="spm-mini-saver-status" role="status">
      <strong><ShieldCheck size={15}/> Private item check only</strong>
      <p>{codeCopy[result.reasonCode]||
        'Community Saver matching is not available until the source and costs are verified.'}</p>
      {result.confirmationState==='ALL_CURRENT'&&
        <small><CheckCircle2 size={13}/> All current participant confirmations were found.</small>}
      <small>No offer, other trader details, Plug assignment or payment was created.</small>
    </div>}
  </div>;
}
