import { useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, TestTube2 } from 'lucide-react';
import type { MiniDraft, MiniLanguage } from './miniModel';
import { MiniFundingPreview } from './MiniFundingPreview';
import {
  MONEY_OWNER_SAMPLE, MONEY_OWNER_SCHEDULES, moneyOwnerSteps,
  type MoneyOwnerScheduleId,
} from './miniMoneyOwnerTest.mjs';

const money=(minor:number)=>
  'KSh '+(minor/100).toLocaleString('en-KE',
    {minimumFractionDigits:2,maximumFractionDigits:2});

/**
 * Owner-only sandbox INSIDE the original Mini. It reuses the existing
 * MiniFundingPreview and its 3 rail state machine, not a second Money engine.
 *
 * All data is the same frozen, fictional Amina/Njeri chair Agreement.
 * NEVER mounted for live first-party sessions or on production hosts.
 */
export function MiniOwnerMoneyTest({language,onBack,buyer,sourceMatches,
  sellerJoined,sellerConfirmed}:{
  language:MiniLanguage;
  onBack:()=>void;
  buyer:boolean;
  sourceMatches:boolean;
  sellerJoined:boolean;
  sellerConfirmed:boolean;
}) {
  const [schedule,setSchedule]=useState<MoneyOwnerScheduleId>('FULL');
  const [stageIndex,setStageIndex]=useState<number|null>(null);
  const steps=moneyOwnerSteps(MONEY_OWNER_SAMPLE.amountMinor,schedule);
  const chosen=stageIndex===null?null:steps?.[stageIndex]||null;
  const sw=language==='sw';
  const trialDraft:MiniDraft|null=chosen?{
    intent:'pay',
    description:'TEST ONLY · '+MONEY_OWNER_SAMPLE.title+' · '+chosen.label,
    amount:(chosen.amountMinor/100).toFixed(2),
    counterparty:'Fictional seller Njeri · No real account',
    note:'SIMULATION ONLY. No provider, ledger, Agreement Money or release.',
    quantity:'',unit:'',
  }:null;

  if(chosen&&trialDraft&&buyer&&sourceMatches){
    return <section className="spm-mini-owned-list" data-mini-money-owner="sample-provider-test">
      <div className="spm-demo-flag"><TestTube2 size={16}/>
        {sw?'JARIBIO TU · Hakuna pesa':'MINI MONEY TEST · SIMULATION ONLY'}
      </div>
      <div className="spm-mini-agreement-fact">
        <strong>{MONEY_OWNER_SAMPLE.publicReference} · {chosen.label}</strong>
        <p>{money(chosen.amountMinor)} · fictional amount to test</p>
        <small>Real Agreement Money remains NOT FUNDED. No seller approval of this
          instalment, no bank connection and no transfer.</small>
      </div>
      <MiniFundingPreview key={schedule+'-'+stageIndex} draft={trialDraft}
        language={language} onBack={()=>setStageIndex(null)}/>
      <small>Simulated provider confirmation is only a UI outcome.
        It never advances a milestone, marks an Agreement paid, or settles funds.</small>
    </section>;
  }

  return <section className="spm-mini-owned-list spm-mini-my-agreements"
    data-mini-money-owner="synthetic-only" aria-label="Mini Money owner testing">
    <button type="button" className="spm-back" onClick={onBack}>
      <ArrowLeft size={16}/>{sw?'Rudi kwa KS001':'Back to KS001'}
    </button>
    <div className="spm-persona"><TestTube2 size={17}/>Money · Owner test</div>
    <div className="spm-demo-flag"><ShieldCheck size={16}/>
      SIMULATION ONLY · NO REAL MONEY
    </div>
    <h1 className="spm-question">Test Money in Mini</h1>
    <p>Use an existing fictional Agreement to test when and how Mini shows
      payment choices. The test does not create money, a payment receipt or
      an executable deposit.</p>

    <div className="spm-mini-agreement-fact">
      <strong>{MONEY_OWNER_SAMPLE.title}</strong>
      <small>{MONEY_OWNER_SAMPLE.publicReference} · Synthetic Amina / Njeri example</small>
      <p>Original sample principal: {money(MONEY_OWNER_SAMPLE.amountMinor)}</p>
      <small>Actual Money position: NOT FUNDED · Fees not quoted · No authorised rail</small>
      <small>Supplier in the demo: {sellerJoined?'Joined':'Not joined'}
        {' · '}{sellerConfirmed?'Sample version confirmation recorded':'Confirmation pending'}
      </small>
    </div>
    {!sourceMatches&&<p role="alert" className="spm-error">
      The original synthetic Agreement amount could not be matched. The
      Money test is disabled rather than relying on a browser-entered amount.
    </p>}
    {!buyer&&<p role="status" className="spm-mini-owned-note">
      You are viewing Mini as Njeri, the seller. Only Amina, the fictional
      buyer, can run this buyer-side payment simulation. Switch to Amina.
    </p>}
    {buyer&&sourceMatches&&<>
      <label className="spm-label" htmlFor="mini-owner-money-schedule">
        Compare a hypothetical payment schedule
      </label>
      <select id="mini-owner-money-schedule" className="spm-field"
        value={schedule}
        onChange={e=>{setSchedule(e.target.value as MoneyOwnerScheduleId);setStageIndex(null);}}>
        {MONEY_OWNER_SCHEDULES.map(option=><option key={option.id}
          value={option.id}>{option.label}</option>)}
      </select>
      <small>The amounts below always add to the same source total.
        These splits have NOT been offered or approved by Njeri.</small>
      {steps?.map((step,i)=><div className="spm-mini-owned-item" key={step.sequence}>
        <div>
          <strong>{i+1}. {step.label}</strong>
          <small>{money(step.amountMinor)} · Proposed / not payable</small>
        </div>
        <button type="button" className="spm-secondary"
          onClick={()=>setStageIndex(i)}>
          Test route <ArrowRight size={15}/>
        </button>
      </div>)}
      <p className="spm-mini-owned-note">
        <strong>Expected safety result:</strong> Choice Bank, M-Pesa and PesaLink
        each allow a fictional pending, confirmed, failed or unknown outcome.
        Every outcome must still say NO REAL PAYMENT. An unknown result must
        block blind retries. A failed result may start a new test.
      </p>
      {!sellerConfirmed&&<small>
        The example seller has not confirmed the Agreement yet.
        In real Money this would be an approval blocker. These buttons
        exercise only the provider-UI simulator, not actual payment eligibility.
      </small>}
    </>}
  </section>;
}
