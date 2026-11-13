import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { MeasuredRateBasis } from '../api/securepay/measured-services';
import { ArrowRight, RefreshCcw, ShieldCheck } from 'lucide-react';
import { ApiError } from '../api/securepay/http';
import type { ConfirmedQuantity, EvidenceAssessment, MeasuredReport } from
  '../api/securepay/measured-evidence';
import type {
  MeasuredBillingGateway, ConfirmedDispute, ResolutionSummary,
  ResolutionOutcome, ReviewedBill, BillReview, PlannedPayment, PlannedReview,
  AgreementPlanAddendumStatus,
} from '../api/securepay/measured-billing';

/**
 * One INNER onion layer of the existing Mini "Work evidence" Agreement tool.
 * Every command is explicit and authenticated. No bank, escrow, deposit
 * collection or payment command exists here. User-facing amounts are
 * formatted for Kenya but all submitted amounts are EXACT integer minor units.
 */
type MilestoneRow={
  id:number; title:string; amount:string; requiredEvidence:string; due:string;
};
const isHex=(s:unknown)=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const noMoney=(value:unknown)=>!!value&&typeof value==='object'&&
  'paymentEnabled' in value&&value.paymentEnabled===false;
const notFound=(e:unknown)=>e instanceof ApiError&&e.status===404;
const stale=(e:unknown)=>e instanceof ApiError&&e.status===409;
const random=()=>crypto.randomUUID().replaceAll('-','');
const quantity=(s:string):number|null=>{
  if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(s))return null;
  const [whole,part='']=s.split('.');
  const n=Number(whole)*100+Number(part.padEnd(2,'0'));
  return Number.isSafeInteger(n)&&n>0?n:null;
};
const minor=(s:string):number|null=>{
  if(s.trim()==='')return 0;
  if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(s))return null;
  const [whole,part='']=s.split('.');
  const n=Number(whole)*100+Number(part.padEnd(2,'0'));
  return Number.isSafeInteger(n)&&n>=0?n:null;
};
const inputFromMinor=(value:number)=>{
  if(!Number.isSafeInteger(value)||value<0)return '';
  const n=BigInt(value);
  return (n/100n).toString()+'.'+(n%100n).toString().padStart(2,'0');
};
const money=(n:number,currency:string)=>{
  if(!Number.isSafeInteger(n)||n<0)return 'Amount needs checking';
  const exact=BigInt(n);
  const shillings=(exact/100n).toLocaleString('en-KE');
  const cents=(exact%100n).toString().padStart(2,'0');
  return currency+' '+shillings+'.'+cents;
};
const units=(n:number)=>
  Number.isSafeInteger(n)?(n/100).toFixed(2):'Needs checking';

export function MiniMeasuredBillingJourney({
  agreementId,report,confirmed,assessment,viewerIdentityId,rateBasis,gateway,prepare,
}:{
  agreementId:string;
  report:MeasuredReport;confirmed:ConfirmedQuantity;
  assessment:EvidenceAssessment|null;viewerIdentityId:string;
  rateBasis:MeasuredRateBasis;
  gateway:MeasuredBillingGateway;prepare:()=>Promise<unknown>;
}) {
  const [opened,setOpened]=useState(false);
  const [busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);
  const [blocked,setBlocked]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [dispute,setDispute]=useState<ConfirmedDispute|null>(null);
  const [resolution,setResolution]=useState<ResolutionSummary|null>(null);
  const [outcome,setOutcome]=useState<ResolutionOutcome|null>(null);
  const [bill,setBill]=useState<ReviewedBill|null>(null);
  const [billReview,setBillReview]=useState<BillReview|null>(null);
  const [plan,setPlan]=useState<PlannedPayment|null>(null);
  const [planReview,setPlanReview]=useState<PlannedReview|null>(null);
  const [addendum,setAddendum]=useState<AgreementPlanAddendumStatus|null>(null);
  const [annexRejection,setAnnexRejection]=useState('');
  const [revising,setRevising]=useState(false);
  const [staleBill,setStaleBill]=useState(false);
  const [disputeReason,setDisputeReason]=useState('');
  const [allegedQuantity,setAllegedQuantity]=useState('');
  const [disputeEvidence,setDisputeEvidence]=useState('');
  const [resolutionReason,setResolutionReason]=useState('');
  const [resolutionQuantity,setResolutionQuantity]=useState('');
  const [resolutionEvidence,setResolutionEvidence]=useState('');
  const [reviewReason,setReviewReason]=useState('');
  const [billReason,setBillReason]=useState('');
  const [planReason,setPlanReason]=useState('');
  const [deposit,setDeposit]=useState('0');
  const [stages,setStages]=useState<MilestoneRow[]>([
    {id:1,title:'On completion',amount:'',
      requiredEvidence:'Independent confirmation of completed work',due:''},
  ]);
  const nextStage=useRef(1);
  const requestNumber=useRef(0);
  const keys=useRef(new Map<string,string>());
  const key=(action:string)=>{
    let existing=keys.current.get(action);
    if(!existing){existing=random();keys.current.set(action,existing);}
    return existing;
  };
  const reporter=viewerIdentityId===confirmed.reporterIdentityId;
  const beneficiary=viewerIdentityId===confirmed.confirmedByIdentityId;
  const canAct=report.versionCurrent &&
    confirmed.versionId===report.versionId &&
    confirmed.reportDigest===report.reportDigest &&
    confirmed.state==='PARTY_CONFIRMED_NONPAYABLE' &&
    confirmed.paymentEnabled===false &&
    (reporter||beneficiary);
  const linked=assessment?.evidence.filter(x=>!x.superseded)??[];
  const approved=linked.filter(x=>x.independentCanonicalApproval);
  const getOrNull=async<T,>(fetch:()=>Promise<T>):Promise<T|null>=>{
    try{return await fetch();}
    catch(e){if(notFound(e))return null;throw e;}
  };

  const refresh=async()=>{
    const ticket=++requestNumber.current;
    setReady(false);setBusy(true);setError('');setStaleBill(false);
    try{
      await prepare();
      if(!canAct||!isHex(report.reportDigest)||!isHex(report.versionHash))
        throw Error('Work source or identity is not current');
      const currentDispute=await getOrNull(()=>
        gateway.dispute(agreementId,report.reportId));
      if(ticket!==requestNumber.current)return;
      if(currentDispute&&(!noMoney(currentDispute) ||
          !currentDispute.billingHeld ||
          currentDispute.confirmedQuantityId!==confirmed.id ||
          currentDispute.reportDigest!==report.reportDigest))
        throw Error('Dispute lineage or hold cannot be verified');
      setDispute(currentDispute);
      let currentResolution:ResolutionSummary|null=null;
      let currentOutcome:ResolutionOutcome|null=null;
      if(currentDispute){
        currentResolution=await gateway.resolution(agreementId,report.reportId);
        if(!noMoney(currentResolution) ||
            currentResolution.disputeId!==currentDispute.id)
          throw Error('Independent resolution status is not authoritative');
        if(currentResolution.resolved){
          currentOutcome=await gateway.resolvedOutcome(agreementId,report.reportId);
          if(!noMoney(currentOutcome) ||
              currentOutcome.originalConfirmedId!==confirmed.id ||
              currentOutcome.disputeId!==currentDispute.id ||
              currentOutcome.state!=='RESOLVED_NONPAYABLE')
            throw Error('Resolved source is not exact');
        }
      }
      if(ticket!==requestNumber.current)return;
      setResolution(currentResolution);setOutcome(currentOutcome);
      let nextBill:ReviewedBill|null=null;
      let nextBillReview:BillReview|null=null;
      let nextPlan:PlannedPayment|null=null;
      let nextPlanReview:PlannedReview|null=null;
      let nextAnnex:AgreementPlanAddendumStatus|null=null;
      let previousBillHeld=false;
      if(!currentDispute||currentOutcome){
        try{nextBill=await gateway.latestBill(agreementId,report.reportId);}
        catch(e){
          if(stale(e))previousBillHeld=true;
          else if(!notFound(e))throw e;
        }
        if(nextBill){
          if(!noMoney(nextBill) || nextBill.invoiceIssued!==false ||
              nextBill.payable!==false ||
              nextBill.confirmedQuantityId!==confirmed.id ||
              nextBill.reportDigest!==report.reportDigest ||
              nextBill.resolutionOutcomeId!==(currentOutcome?.id??null) ||
              !isHex(nextBill.sourceKey))
            throw Error('Bill source or payment boundary mismatch');
          nextBillReview=await gateway.billReview(agreementId,nextBill.id);
          if(!noMoney(nextBillReview) ||
              nextBillReview.sourceKey!==nextBill.sourceKey ||
              nextBillReview.totalMinor!==nextBill.totalMinor)
            throw Error('Beneficiary bill review is inconsistent');
          try{nextPlan=await gateway.latestPlan(agreementId,nextBill.id);}
          catch(e){if(!notFound(e))throw e;}
          if(nextPlan){
            if(!noMoney(nextPlan)||
                nextPlan.billSourceKey!==nextBill.sourceKey ||
                nextPlan.billTotalMinor!==nextBill.totalMinor ||
                !Array.isArray(nextPlan.milestones) ||
                nextPlan.depositCollected!==false)
              throw Error('Saved deposit allocation is not the current bill plan');
            nextPlanReview=await gateway.planReview(
              agreementId,nextBill.id,nextPlan.id);
            if(!noMoney(nextPlanReview) ||
                nextPlanReview.planDigest!==nextPlan.planDigest ||
                nextPlanReview.billTotalMinor!==nextBill.totalMinor)
              throw Error('Independent milestone review is inconsistent');
            if(nextPlanReview.beneficiaryAccepted){
              nextAnnex=await gateway.addendumStatus(
                agreementId,nextBill.id,nextPlan.id);
              if(!noMoney(nextAnnex) ||
                  nextAnnex.billId!==nextBill.id ||
                  nextAnnex.planId!==nextPlan.id ||
                  nextAnnex.planDigest!==nextPlan.planDigest ||
                  nextAnnex.canonicalAgreementVersionPreserved!==true)
                throw Error('Agreement addendum consent does not match the plan');
            }
          }
        }
      }
      if(ticket!==requestNumber.current)return;
      setBill(nextBill);setBillReview(nextBillReview);
      setPlan(nextPlan);setPlanReview(nextPlanReview);setAddendum(nextAnnex);
      setStaleBill(previousBillHeld);
      setBlocked(false);setReady(true);
      setNotice('Checked against current SecurePay records.');
    }catch{
      if(ticket===requestNumber.current){
        setBlocked(true);setReady(false);setDispute(null);setResolution(null);
        setOutcome(null);setBill(null);setBillReview(null);
        setPlan(null);setPlanReview(null);setAddendum(null);
        setError('SecurePay could not verify this work, its reviews or current bill. No action was approved. Recheck before proceeding.');
      }
    }finally{if(ticket===requestNumber.current)setBusy(false);}
  };

  useEffect(()=>{
    if(!opened)return;
    void refresh();
    // The owner-scoped Agreement tool unmounts on identity/version change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[opened,agreementId,confirmed.id,viewerIdentityId]);

  const act=async(label:string,fn:()=>Promise<void>)=>{
    if(!canAct||!ready||blocked||busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      await prepare();await fn();
      await refresh();
      setNotice(label+' recorded; current SecurePay state rechecked.');
    }catch{
      setBlocked(true);
      setError('The server outcome is uncertain or the Agreement changed. Recheck before repeating. No deposit or payment has occurred.');
    }finally{setBusy(false);}
  };

  const raiseDispute=async()=>{
    const explanation=disputeReason.trim();
    const alternative=allegedQuantity.trim()?quantity(allegedQuantity):null;
    if(!explanation||explanation.length>1200 ||
        (allegedQuantity.trim()&&alternative===null) ||
        (alternative!==null&&(!disputeEvidence||
          alternative===confirmed.effectiveHundredths))){
      setError('Explain the dispute. Changing the quantity requires a different amount and linked evidence.');
      return;
    }
    await act('Confirmed-work dispute',async()=>{
      const saved=await gateway.openDispute(agreementId,report.reportId,{
        expectedConfirmedQuantityId:confirmed.id,
        expectedVersionId:confirmed.versionId,
        expectedVersionHash:confirmed.versionHash,
        expectedReportDigest:confirmed.reportDigest,
        expectedConfirmedHundredths:confirmed.effectiveHundredths,
        allegedHundredths:alternative,
        evidenceBindingId:disputeEvidence||null,
        reason:explanation,
        idempotencyKey:key('raise:'+confirmed.id+':'+
          alternative+':'+disputeEvidence+':'+explanation),
      });
      if(!noMoney(saved)||!saved.billingHeld ||
          saved.confirmedQuantityId!==confirmed.id)
        throw Error('Dispute hold not confirmed');
    });
  };

  const proposeResolution=async()=>{
    if(!dispute)return;
    const proposed=quantity(resolutionQuantity);
    const explanation=resolutionReason.trim();
    if(proposed===null||!explanation||explanation.length>1200||
        (proposed!==confirmed.effectiveHundredths&&!resolutionEvidence)){
      setError('Set proposed hours/km and a reason; changing them requires approved linked proof.');
      return;
    }
    await act('Dispute resolution proposal',async()=>{
      const saved=await gateway.proposeResolution(agreementId,report.reportId,{
        expectedDisputeId:dispute.id,expectedConfirmedId:confirmed.id,
        expectedVersionId:confirmed.versionId,
        expectedVersionHash:confirmed.versionHash,
        expectedReportDigest:confirmed.reportDigest,
        proposedHundredths:proposed,
        sourceEvidenceBindingId:resolutionEvidence||null,
        reason:explanation,
        idempotencyKey:key('resolve-propose:'+dispute.id+':'+proposed+':'+
          resolutionEvidence+':'+explanation),
      });
      if(saved.disputeId!==dispute.id||
          saved.proposedHundredths!==proposed||
          !isHex(saved.reviewDigest)||saved.payable!==false)
        throw Error('Resolution proposal is inconsistent');
    });
  };

  const decideResolution=async(choice:'ACCEPT'|'REJECT')=>{
    if(!resolution?.proposalId||!resolution.reviewDigest)return;
    const reason=choice==='REJECT'?reviewReason.trim():null;
    if(choice==='REJECT'&&!reason)
      {setError('Explain why the proposed resolution is rejected.');return;}
    await act('Dispute resolution review',async()=>{
      const saved=await gateway.decideResolution(
        agreementId,report.reportId,resolution.proposalId!,{
          expectedReviewDigest:resolution.reviewDigest!,choice,
          reviewNote:reason,
          idempotencyKey:key('resolution-review:'+resolution.proposalId+':'+choice),
        });
      if(saved.proposalId!==resolution.proposalId||
          saved.reviewDigest!==resolution.reviewDigest||
          saved.choice!==choice||saved.payable!==false)
        throw Error('Independent resolution response mismatch');
    });
  };

  const sealResolution=async()=>{
    if(!resolution?.proposalId||!resolution.reviewDigest)return;
    await act('Independent dispute outcome',async()=>{
      const saved=await gateway.sealResolution(
        agreementId,report.reportId,resolution.proposalId!,{
          expectedReviewDigest:resolution.reviewDigest!,
          idempotencyKey:key('resolution-seal:'+resolution.proposalId),
        });
      if(!noMoney(saved)||saved.disputeId!==dispute?.id||
          saved.state!=='RESOLVED_NONPAYABLE')
        throw Error('Nonpayable resolution outcome mismatch');
    });
  };

  const prepareBill=async()=>{
    await act('Measured bill for review',async()=>{
      const saved=await gateway.prepareBill(agreementId,report.reportId,{
        expectedVersionId:confirmed.versionId,
        expectedVersionHash:confirmed.versionHash,
        expectedReportDigest:confirmed.reportDigest,
        expectedConfirmedId:confirmed.id,
        expectedResolutionOutcomeId:outcome?.id??null,
        idempotencyKey:key('bill:'+confirmed.id+':'+(outcome?.id??'original')),
      });
      if(!noMoney(saved)||saved.invoiceIssued!==false||
          saved.payable!==false ||
          saved.reportId!==report.reportId ||
          saved.confirmedQuantityId!==confirmed.id ||
          saved.resolutionOutcomeId!==(outcome?.id??null))
        throw Error('Bill proposal did not match confirmed work');
    });
  };

  const decideBill=async(choice:'ACCEPT'|'REJECT')=>{
    if(!bill)return;
    const reason=choice==='REJECT'?billReason.trim():null;
    if(choice==='REJECT'&&!reason)
      {setError('Explain why the amount should not be accepted.');return;}
    await act('Charge review',async()=>{
      const saved=await gateway.decideBill(agreementId,bill.id,{
        expectedSourceKey:bill.sourceKey,expectedTotalMinor:bill.totalMinor,
        choice,reason,idempotencyKey:key('bill-review:'+bill.id+':'+choice),
      });
      if(saved.billId!==bill.id||saved.sourceKey!==bill.sourceKey||
          saved.choice!==choice||saved.paymentEnabled!==false)
        throw Error('Independent bill review mismatch');
    });
  };

  const beginRevision=()=>{
    if(!plan||!bill||!reporter)return;
    // Preserve previous accepted plan and exact consent as history.
    // A new revision requires a fresh beneficiary review and fresh annex.
    setDeposit(inputFromMinor(plan.plannedDepositMinor));
    setStages(plan.milestones.map((stage,i)=>({
      id:i+1,title:stage.title,amount:inputFromMinor(stage.amountMinor),
      requiredEvidence:stage.requiredEvidence,
      due:stage.dueAt?.slice(0,10)??'',
    })));
    nextStage.current=plan.milestones.length;
    setRevising(true);
  };
  const addStage=()=>{
    if(stages.length>=5)return;
    const id=++nextStage.current;
    setStages(old=>[...old,{id,title:'',amount:'',
      requiredEvidence:'',due:''}]);
  };
  const patchStage=(id:number,field:keyof MilestoneRow,value:string)=>{
    if(field==='id')return;
    setStages(old=>old.map(r=>r.id===id?{...r,[field]:value}:r));
  };
  const proposedPlan=()=>{
    const down=minor(deposit);
    if(down===null||!bill||down>=bill.totalMinor)return null;
    const amounts=stages.map(r=>minor(r.amount));
    if(amounts.some(x=>x===null||x===0))return null;
    const sum=amounts.reduce((total,x)=>total+BigInt(x??0),BigInt(down));
    if(sum!==BigInt(bill.totalMinor))return null;
    const prepared=stages.map((r,i)=>{
      const due=r.due?new Date(r.due+'T12:00:00'):null;
      return {title:r.title.trim(),amountMinor:amounts[i]!,
        requiredEvidence:r.requiredEvidence.trim(),
        dueAt:due&&!Number.isNaN(due.getTime())?due.toISOString():null};
    });
    if(prepared.some(p=>!p.title||p.title.length>160||
        !p.requiredEvidence||p.requiredEvidence.length>500))return null;
    if(stages.some(r=>r.due) && prepared.some((p,i)=>stages[i].due&&!p.dueAt))
      return null;
    return {plannedDepositMinor:down,milestones:prepared};
  };
  const proposePlan=async()=>{
    if(!bill||!billReview?.beneficiaryAccepted)return;
    const plan=proposedPlan();
    if(!plan){
      setError('The proposed deposit and milestone amounts must add up exactly to the reviewed charge. Each stage needs a title and evidence.');
      return;
    }
    const fingerprint=JSON.stringify({source:bill.sourceKey,...plan});
    await act('Deposit and milestone proposal',async()=>{
      const saved=await gateway.proposePlan(agreementId,bill.id,{
        expectedVersionId:bill.versionId,
        expectedBillSourceKey:bill.sourceKey,
        expectedBillTotalMinor:bill.totalMinor,
        plannedDepositMinor:plan.plannedDepositMinor,
        milestones:plan.milestones,
        idempotencyKey:key('plan:'+bill.id+':'+fingerprint),
      });
      if(!noMoney(saved)||saved.billId!==bill.id||
          saved.billTotalMinor!==bill.totalMinor||
          saved.plannedDepositMinor!==plan.plannedDepositMinor||
          saved.depositCollected!==false||!isHex(saved.planDigest))
        throw Error('Deposit and milestone plan not saved with exact bill');
    });
  };

  const decidePlan=async(choice:'ACCEPT'|'REJECT')=>{
    if(!bill||!plan)return;
    const reason=choice==='REJECT'?planReason.trim():null;
    if(choice==='REJECT'&&!reason)
      {setError('Explain why the proposed deposit or milestones are rejected.');return;}
    await act('Deposit and milestone review',async()=>{
      const saved=await gateway.decidePlan(agreementId,bill.id,plan.id,{
        expectedPlanDigest:plan.planDigest,choice,reason,
        idempotencyKey:key('plan-review:'+plan.id+':'+choice),
      });
      if(saved.planId!==plan.id||saved.planDigest!==plan.planDigest||
          saved.choice!==choice||saved.depositCollected!==false||
          saved.payable!==false)
        throw Error('Plan response did not match reviewed terms');
    });
  };

  const openAddendum=async()=>{
    if(!bill||!plan||!planReview?.beneficiaryAccepted||!reporter)return;
    await act('Agreement-linked payment plan',async()=>{
      const stored=await gateway.openAddendum(agreementId,bill.id,plan.id,{
        expectedVersionId:bill.versionId,
        expectedVersionHash:bill.versionHash,
        expectedBillSourceKey:bill.sourceKey,
        expectedPlanDigest:plan.planDigest,
        idempotencyKey:key('agreement-annex:'+plan.id),
      });
      if(stored.planId!==plan.id ||
          stored.planDigest!==plan.planDigest ||
          stored.billSourceKey!==bill.sourceKey ||
          stored.versionId!==bill.versionId)
        throw Error('Canonical Agreement addendum did not match the source');
    });
  };

  const decideAddendum=async(choice:'ACCEPT'|'REJECT')=>{
    if(!bill||!plan||!addendum?.addendumId||!addendum.viewerNeedsConsent)return;
    const note=choice==='REJECT'?annexRejection.trim():null;
    if(choice==='REJECT'&&!note){
      setError('Explain which deposit or milestone term should change.');
      return;
    }
    await act('Agreement addendum decision',async()=>{
      const result=await gateway.decideAddendum(
        agreementId,bill.id,plan.id,addendum.addendumId!,{
          expectedPlanDigest:plan.planDigest,choice,note,
          idempotencyKey:key('annex-decision:'+addendum.addendumId+':'+choice),
        });
      if(result.planDigest!==plan.planDigest ||
          result.choice!==choice ||
          result.identityId!==viewerIdentityId)
        throw Error('The recorded consent is not the signed-in participant');
      setAnnexRejection('');
    });
  };

  const sealAddendum=async()=>{
    if(!bill||!plan||!addendum?.addendumId||
        !addendum.viewerMaySeal||!beneficiary)return;
    await act('All-party Agreement addendum',async()=>{
      const result=await gateway.sealAddendum(
        agreementId,bill.id,plan.id,addendum.addendumId!,{
          expectedPlanDigest:plan.planDigest,
          idempotencyKey:key('annex-seal:'+addendum.addendumId),
        });
      if(!noMoney(result) || result.payable!==false ||
          result.state!=='AGREEMENT_ADDENDUM_NONPAYABLE' ||
          result.planDigest!==plan.planDigest ||
          result.versionId!==bill.versionId)
        throw Error('The sealed Agreement plan did not match the original work');
    });
  };

  const unit=rateBasis==='PER_HOUR'?'hours':'kilometres';
  return <details className="spm-mini-slot" data-g8="metered-billing"
      onToggle={e=>setOpened(e.currentTarget.open)}>
    <summary>Review charge, deposit and milestones
      <small>Only after work confirmation · no payment</small>
      <ArrowRight size={15}/></summary>
    <div className="spm-mini-slot-items">
      <small><ShieldCheck size={14}/> {units(confirmed.effectiveHundredths)} {unit}
        confirmed by the other party. This is still not a payable invoice.</small>
      <button type="button" className="spm-secondary" disabled={busy}
        onClick={()=>void refresh()}>
        <RefreshCcw size={14}/>{busy?'Rechecking…':'Recheck SecurePay'}
      </button>
      {error&&<p role="alert" className="spm-error">{error}</p>}
      {notice&&!error&&<small role="status">{notice}</small>}
      {!ready&&<small>Current Agreement and evidence decisions must be verified before taking any action.</small>}
      {ready&&!dispute&&<details className="spm-mini-slot" data-g8="post-seal-dispute">
        <summary>Something wrong with confirmed work? <small>Preserve history</small></summary>
        <div className="spm-mini-slot-items">
          <label className="spm-label" htmlFor="g8-postseal-reason">Explain the problem</label>
          <textarea id="g8-postseal-reason" className="spm-field" rows={2}
            maxLength={1200} value={disputeReason}
            onChange={e=>setDisputeReason(e.target.value)}
            disabled={busy||blocked}/>
          <label className="spm-label" htmlFor="g8-postseal-quantity">
            Alternative {unit} (optional)</label>
          <input id="g8-postseal-quantity" className="spm-field"
            value={allegedQuantity} inputMode="decimal"
            onChange={e=>setAllegedQuantity(e.target.value)}
            disabled={busy||blocked}/>
          {allegedQuantity.trim()&&<ProofSelector
            id="g8-dispute-proof" value={disputeEvidence}
            onChange={setDisputeEvidence} items={linked}
            disabled={busy||blocked}/>}
          <button type="button" className="spm-secondary"
            disabled={busy||blocked||!canAct||!disputeReason.trim()||
              (!!allegedQuantity.trim()&&!disputeEvidence)}
            onClick={()=>void raiseDispute()}>Record a work dispute</button>
          <small>This action places the confirmed charge on hold.
            The original signed measurement is not erased.</small>
        </div>
      </details>}
      {ready&&dispute&&<div className="spm-mini-agreement-fact">
        <strong>Work under dispute — billing held</strong>
        <small>{dispute.reason}</small>
        {outcome?<small>Separately resolved at {units(outcome.resolvedHundredths)} {unit}.
            Original and dispute kept in history.</small>:
          <small>Neither the original charge nor a revised amount can become payable.</small>}
        {resolution&&<small>{resolution.status.replaceAll('_',' ').toLowerCase()}
          {resolution.proposalId?' · proposed '+units(resolution.proposedHundredths)+' '+unit:''}
        </small>}
        {resolution&&!resolution.proposalId&&!outcome&&
          <div className="spm-mini-slot-items">
            <label className="spm-label" htmlFor="g8-resolve-qty">Proposed agreed {unit}</label>
            <input id="g8-resolve-qty" className="spm-field"
              value={resolutionQuantity} inputMode="decimal"
              placeholder={units(confirmed.effectiveHundredths)}
              disabled={busy||blocked}
              onChange={e=>setResolutionQuantity(e.target.value)}/>
            <label className="spm-label" htmlFor="g8-resolve-note">Why this resolution?</label>
            <textarea id="g8-resolve-note" className="spm-field"
              value={resolutionReason} rows={2} maxLength={1200}
              disabled={busy||blocked}
              onChange={e=>setResolutionReason(e.target.value)}/>
            <ProofSelector id="g8-resolve-evidence" value={resolutionEvidence}
              onChange={setResolutionEvidence} items={approved}
              disabled={busy||blocked}/>
            <button type="button" className="spm-secondary"
              disabled={busy||blocked||!resolutionReason.trim()||
                !resolutionQuantity.trim()||
                (quantity(resolutionQuantity)!==confirmed.effectiveHundredths&&
                 !resolutionEvidence)}
              onClick={()=>void proposeResolution()}>Propose a resolution</button>
          </div>}
        {resolution?.proposalId&&!outcome&&<>
          {resolution.proposerIdentityId!==viewerIdentityId&&
            resolution.status==='AWAITING_INDEPENDENT_RESOLUTION_REVIEW'&&<>
            <button type="button" className="spm-secondary"
              disabled={busy||blocked}
              onClick={()=>void decideResolution('ACCEPT')}>
              Accept proposed resolution</button>
            <label className="spm-label" htmlFor="g8-resolve-review">Reason if disputed</label>
            <textarea id="g8-resolve-review" className="spm-field" rows={2}
              disabled={busy||blocked} value={reviewReason}
              onChange={e=>setReviewReason(e.target.value)}/>
            <button type="button" className="spm-quiet-button"
              disabled={busy||blocked||!reviewReason.trim()}
              onClick={()=>void decideResolution('REJECT')}>
              Reject resolution</button>
          </>}
          {beneficiary&&
            resolution.status==='ALL_RESPONSES_ACCEPTED_AWAITING_SEAL'&&
            <button type="button" className="spm-secondary"
              disabled={busy||blocked} onClick={()=>void sealResolution()}>
              Confirm independently reviewed resolution</button>}
        </>}
        {!outcome&&<small>Work remains on hold. A rejected resolution requires an explicit new human process, not an automatic release.</small>}
      </div>}
      {ready&&(!dispute||outcome)&&<div className="spm-mini-agreement-fact">
        <strong>Charge calculated from the agreed tariff</strong>
        {staleBill&&<small>A previous bill was held because its source changed.
          A new bill must be reviewed separately.</small>}
        {!bill&&reporter&&<button type="button" className="spm-secondary"
          disabled={busy||blocked||!canAct}
          onClick={()=>void prepareBill()}>Prepare charge for review</button>}
        {bill&&<>
          <strong>{money(bill.totalMinor,bill.currency)}</strong>
          <small>Rate portion {money(bill.variableMinor,bill.currency)}
            {bill.fixedMinor>0?' + fixed trip fee '+money(bill.fixedMinor,bill.currency):''}.
            {bill.effectiveHundredths>0?' Based on '+units(bill.effectiveHundredths)+' '+unit:''}</small>
          <small>{billReview?.state.replaceAll('_',' ').toLowerCase()||
            'Awaiting actual beneficiary review'} · no invoice issued</small>
          {beneficiary&&billReview?.state==='AWAITING_BENEFICIARY_BILL_REVIEW'&&<>
            <button type="button" className="spm-secondary" disabled={busy||blocked}
              onClick={()=>void decideBill('ACCEPT')}>Accept this charge</button>
            <label htmlFor="g8-bill-dispute" className="spm-label">Reason if wrong</label>
            <textarea id="g8-bill-dispute" className="spm-field" rows={2}
              value={billReason} disabled={busy||blocked}
              onChange={e=>setBillReason(e.target.value)}/>
            <button type="button" className="spm-quiet-button"
              disabled={busy||blocked||!billReason.trim()}
              onClick={()=>void decideBill('REJECT')}>Dispute this charge</button>
          </>}
          {billReview?.beneficiaryAccepted&&<div className="spm-mini-agreement-fact">
            <strong>Deposit and evidence milestones</strong>
            {!plan&&reporter&&<PlanEditor bill={bill} deposit={deposit}
              onDeposit={setDeposit} rows={stages} setRows={setStages}
              addStage={addStage} patchStage={patchStage}
              blocked={busy||blocked} onSubmit={()=>void proposePlan()}/>}
            {plan&&<>
              <small>Plan revision {plan.revisionNumber}: proposed deposit
                {' '+money(plan.plannedDepositMinor,bill.currency)} (not collected)</small>
              {plan.milestones.map(stage=>
                <div className="spm-mini-slot-item" key={stage.sequenceNumber}>
                  <strong>{stage.title} · {money(stage.amountMinor,bill.currency)}</strong>
                  <small>Evidence needed: {stage.requiredEvidence}</small>
                  {stage.dueAt&&<small>Planned date: {new Date(stage.dueAt).toLocaleDateString('en-KE')}</small>}
                </div>)}
              <small>{planReview?.state.replaceAll('_',' ').toLowerCase()||
                ' Awaiting independent plan review'}</small>
              {beneficiary&&planReview?.state==='AWAITING_BENEFICIARY_PLAN_REVIEW'&&<>
                <button type="button" className="spm-secondary"
                  disabled={busy||blocked} onClick={()=>void decidePlan('ACCEPT')}>
                  Accept planned deposit and stages</button>
                <label className="spm-label" htmlFor="g8-plan-reject">
                  Reason if terms need changing</label>
                <textarea id="g8-plan-reject" className="spm-field" rows={2}
                  disabled={busy||blocked} value={planReason}
                  onChange={e=>setPlanReason(e.target.value)}/>
                <button type="button" className="spm-quiet-button"
                  disabled={busy||blocked||!planReason.trim()}
                  onClick={()=>void decidePlan('REJECT')}>
                  Reject this plan</button>
              </>}
              {reporter&&planReview?.state==='PLAN_REJECTED'&&
                <PlanEditor bill={bill} deposit={deposit}
                  onDeposit={setDeposit} rows={stages} setRows={setStages}
                  addStage={addStage} patchStage={patchStage}
                  blocked={busy||blocked} onSubmit={()=>void proposePlan()}/>}
              {planReview?.beneficiaryAccepted&&
                <div className="spm-mini-agreement-fact" data-g8="agreement-addendum">
                  <strong>Agreement-linked deposit and milestone consent</strong>
                  <small>The reviewed allocation is not yet an Agreement addendum.
                    Each party must separately accept the exact terms. Confirmed
                    work, evidence and its tariff version stay unchanged.</small>
                  {addendum&&<small role="status">
                    {addendum.state.replaceAll('_',' ').toLowerCase()} ·
                    {addendum.accepted}/{addendum.requiredParties} parties accepted
                    {addendum.outstanding>0?' · '+addendum.outstanding+' remaining':''}
                  </small>}
                  {reporter&&addendum?.state==='AWAITING_AGREEMENT_ADDENDUM'&&
                    <button type="button" className="spm-secondary"
                      disabled={busy||blocked||!ready}
                      onClick={()=>void openAddendum()}>
                      Ask parties to sign this payment-plan addendum</button>}
                  {addendum?.viewerNeedsConsent&&addendum.addendumId&&
                    addendum.rejected===0&&<>
                    <button type="button" className="spm-secondary"
                      disabled={busy||blocked||!ready}
                      onClick={()=>void decideAddendum('ACCEPT')}>
                      Accept this Agreement addendum</button>
                    <label className="spm-label" htmlFor="g8-annex-reason">
                      Why should this plan change?</label>
                    <textarea className="spm-field" id="g8-annex-reason"
                      rows={2} maxLength={1200} value={annexRejection}
                      disabled={busy||blocked}
                      onChange={e=>setAnnexRejection(e.target.value)}/>
                    <button type="button" className="spm-quiet-button"
                      disabled={busy||blocked||!ready||!annexRejection.trim()}
                      onClick={()=>void decideAddendum('REJECT')}>
                      Reject the Agreement addendum</button>
                  </>}
                  {beneficiary&&addendum?.viewerMaySeal&&addendum.addendumId&&
                    <button type="button" className="spm-secondary"
                      disabled={busy||blocked||!ready}
                      onClick={()=>void sealAddendum()}>
                      Confirm every party signed this exact addendum</button>}
                  {addendum?.annexCurrent&&
                    <small role="status">Signed Agreement addendum recorded.
                      This is not a deposit receipt, an invoice or payment authority.</small>}
                  {addendum?.state==='ADDENDUM_REJECTED_NEW_PLAN_REQUIRED'&&
                    <small>The plan needs revision and fresh consent.
                      The old proposed terms remain in history.</small>}
                  {reporter&&!revising&&
                    (addendum?.annexCurrent ||
                     addendum?.state==='ADDENDUM_REJECTED_NEW_PLAN_REQUIRED')&&
                    <button type="button" className="spm-quiet-button"
                      disabled={busy||blocked||!ready} onClick={beginRevision}>
                      Change planned deposit or milestone terms</button>}
                  {reporter&&revising&&
                    <PlanEditor bill={bill} deposit={deposit}
                      onDeposit={setDeposit} rows={stages} setRows={setStages}
                      addStage={addStage} patchStage={patchStage}
                      blocked={busy||blocked||!ready}
                      onSubmit={()=>{setRevising(false);void proposePlan();}}/>}
                  <small>Any revision needs fresh independent review and signatures.
                    Once funds are received or moving, payment terms are frozen.</small>
                </div>}
            </>}
          </div>}
        </>}
      </div>}
      <small>All confirmed work, reviewed bills and planned deposits remain separate from SecurePay Money. Actual funding, provider confirmation and releases need the later certified Money gate.</small>
    </div>
  </details>;
}

function ProofSelector({id,value,onChange,items,disabled}:{
  id:string;value:string;onChange:(v:string)=>void;
  items:NonNullable<EvidenceAssessment['evidence']>;disabled:boolean;
}) {
  return <>
    <label className="spm-label" htmlFor={id}>Linked evidence</label>
    <select id={id} value={value} className="spm-field"
      disabled={disabled} onChange={e=>onChange(e.target.value)}>
      <option value="">Choose existing evidence if needed</option>
      {items.map((p,i)=><option key={p.bindingId} value={p.bindingId}>
        Proof {i+1} · {p.evidenceType} · {p.evidenceReviewState.replaceAll('_',' ').toLowerCase()}
      </option>)}
    </select>
  </>;
}
function PlanEditor({bill,deposit,onDeposit,rows,setRows,addStage,patchStage,blocked,onSubmit}:{
  bill:ReviewedBill;deposit:string;onDeposit:(value:string)=>void;
  rows:MilestoneRow[];setRows:Dispatch<SetStateAction<MilestoneRow[]>>;
  addStage:()=>void;
  patchStage:(id:number,field:keyof MilestoneRow,value:string)=>void;
  blocked:boolean;onSubmit:()=>void;
}) {
  const down=minor(deposit);
  const amounts=rows.map(r=>minor(r.amount));
  const calculated=down===null||amounts.some(x=>x===null)?null:
    amounts.reduce((v,x)=>v+BigInt(x??0),BigInt(down));
  const valid=calculated!==null && calculated===BigInt(bill.totalMinor) &&
    down!==null&&down<bill.totalMinor && rows.every(r=>
      !!r.title.trim()&&!!r.requiredEvidence.trim()&&minor(r.amount)!==null&&
      (minor(r.amount)??0)>0);
  return <div className="spm-mini-slot-items" data-g8="deposit-milestones-plan">
    <p>Propose how this agreed total would be allocated.
      Nothing is charged or collected by making this plan.</p>
    <label className="spm-label" htmlFor="g8-planned-deposit">
      Proposed deposit (KSh, optional)</label>
    <input className="spm-field" id="g8-planned-deposit" inputMode="decimal"
      value={deposit} disabled={blocked}
      onChange={e=>onDeposit(e.target.value)}/>
    {rows.map((r,index)=><div className="spm-mini-agreement-fact" key={r.id}>
      <strong>Milestone {index+1}</strong>
      <label className="spm-label" htmlFor={'g8-stage-title-'+r.id}>
        When should this part be considered complete?</label>
      <input className="spm-field" id={'g8-stage-title-'+r.id}
        value={r.title} maxLength={160} disabled={blocked}
        onChange={e=>patchStage(r.id,'title',e.target.value)}/>
      <label className="spm-label" htmlFor={'g8-stage-amount-'+r.id}>
        Planned amount in KSh</label>
      <input className="spm-field" id={'g8-stage-amount-'+r.id}
        value={r.amount} inputMode="decimal" disabled={blocked}
        onChange={e=>patchStage(r.id,'amount',e.target.value)}/>
      <label className="spm-label" htmlFor={'g8-stage-proof-'+r.id}>
        Proof required before any future payment</label>
      <textarea className="spm-field" rows={2} maxLength={500}
        id={'g8-stage-proof-'+r.id} disabled={blocked}
        value={r.requiredEvidence}
        onChange={e=>patchStage(r.id,'requiredEvidence',e.target.value)}/>
      <label className="spm-label" htmlFor={'g8-stage-date-'+r.id}>
        Due date (optional)</label>
      <input className="spm-field" id={'g8-stage-date-'+r.id}
        type="date" disabled={blocked} value={r.due}
        onChange={e=>patchStage(r.id,'due',e.target.value)}/>
      {rows.length>1&&<button type="button" className="spm-quiet-button"
        disabled={blocked} onClick={()=>setRows(v=>v.filter(s=>s.id!==r.id))}>
        Remove this stage</button>}
    </div>)}
    {rows.length<5&&<button type="button" className="spm-quiet-button"
      disabled={blocked} onClick={addStage}>Add another milestone</button>}
    <strong>Bill total: {money(bill.totalMinor,bill.currency)}</strong>
    <small>{calculated===null?'Check all amounts':
      calculated>BigInt(Number.MAX_SAFE_INTEGER)?'Allocation exceeds safe display range':
      'Allocation: '+money(Number(calculated),bill.currency)+
      (calculated===BigInt(bill.totalMinor)?' · exact total':' · amounts must match')}</small>
    <button type="button" className="spm-secondary" disabled={blocked||!valid}
      onClick={onSubmit}>Propose deposit and milestones</button>
    <small>Each stage needs actual evidence and independent acceptance.
      Collection and release of money are not enabled.</small>
  </div>;
}
