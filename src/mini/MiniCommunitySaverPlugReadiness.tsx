import {useState} from 'react';
import {ArrowLeft,CheckCircle2,RefreshCcw,ShieldCheck} from 'lucide-react';
import {communitySaverActivities,
  type CommunitySaverActivity,
  type CommunitySaverPlugReadiness,
  type CommunitySaverPlugReadinessGateway
} from '../api/securepay/community-saver-plug-readiness';

const reason:Record<string,string>={
  MARKET_NOT_ACTIVE:'Your Plug market participation is not active. Confirm your Market Ready standing first.',
  BASIC_QUALIFICATION_REQUIRED:'Complete the basic Plug assessment before specialising.',
  CAPABILITY_NOT_QUALIFIED:'The relevant verification or pooling skills still need assessment.',
  PLUG_NOT_AVAILABLE:'Your availability is off or does not include the required skills.',
  SPECIALISM_NOT_ASSESSED:'This specific activity has not been assessed and approved for you.',
  SPECIALISM_NOT_CURRENT:'Your specialist qualification is suspended, expired or needs rechecking.',
  PROVIDER_AND_LICENCE_VERIFICATION_STILL_REQUIRED:
    'Your specialism is on record. A real assignment still needs legal/provider checks and an approved opportunity.',
  QUALIFICATION_UNAVAILABLE:'Your training status cannot be verified right now. No opportunity has been offered.'
};

/** A private personal qualification check. The person must deliberately
 * select an activity and request a fresh check. No trader details are fetched.
 */
export function MiniCommunitySaverPlugReadiness({gateway,prepare,onBack}:{
  gateway:CommunitySaverPlugReadinessGateway;
  prepare:()=>Promise<unknown>;
  onBack:()=>void;
}) {
  const [activity,setActivity]=useState<CommunitySaverActivity>('MY_RIDE_CARGO_COMPATIBILITY');
  const [status,setStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [result,setResult]=useState<CommunitySaverPlugReadiness|null>(null);
  const choose=(next:CommunitySaverActivity)=>{
    setActivity(next);setStatus('idle');setResult(null);
  };
  const check=async()=>{
    if(status==='loading')return;
    setResult(null);setStatus('loading');
    try {
      await prepare();
      const current=await gateway.mine(activity);
      // This route is an advisory status for SELF only; never accept a response
      // claiming live assignment, access to other traders, or payment rights.
      if(!current||current.activityCode!==activity||
          current.canReceiveLiveAssignment!==false||
          current.canSeeOtherTraders!==false||
          current.moneyAuthorized!==false)
        throw Error('Untrusted Plug readiness');
      setResult(current);setStatus('ready');
    } catch {
      setResult(null);setStatus('error');
    }
  };
  return <section data-mini-saver-plug-readiness className="spm-saver">
    <button className="spm-quiet-button" type="button" onClick={onBack}>
      <ArrowLeft size={16}/>Back to SecurePay
    </button>
    <div className="spm-saver-intro">
      <span className="spm-saver-eyebrow"><ShieldCheck size={15}/> MY COMMUNITY SAVER SKILLS</span>
      <h2>What can I help with?</h2>
      <p>Community Saver opportunities go only to Plugs qualified for the particular work. Choose one area to check.</p>
    </div>
    <div className="spm-sell-pill-row" aria-label="Select your Plug specialty">
      {communitySaverActivities.map(choice=><button
        className={'spm-sell-answer-pill'+(activity===choice.code?' selected':'')}
        type="button" key={choice.code} aria-pressed={activity===choice.code}
        onClick={()=>choose(choice.code)}>
        {choice.platform}
      </button>)}
    </div>
    <div className="spm-saver-card">
      <strong>{communitySaverActivities.find(x=>x.code===activity)?.label}</strong>
      <p className="spm-saver-description">
        First SecurePay checks your current Plug status, the right general skills, your availability and an assessor-approved specialty.
        A general property or trading qualification cannot substitute for this activity.
      </p>
      <button type="button" className="spm-secondary spm-sell-wide"
        disabled={status==='loading'} onClick={()=>void check()}>
        {status==='loading'?<RefreshCcw size={16}/>:<ShieldCheck size={16}/>}
        {status==='loading'?'Checking your record…':'Check my qualification'}
      </button>
      {status==='error'&&<p role="status" className="spm-saver-description">
        Your private qualification could not be checked. No work was accepted.</p>}
      {result&&<div className="spm-saver-detail" role="status">
        <strong>{result.mayEnterPrivateScreening?
          'Specialism verified for further review':'Further qualification needed'}</strong>
        <p>{reason[result.reasonCode]||
          'A fresh assessor or provider verification is required before any assignment.'}</p>
        {result.specialistAssessed&&result.specialistValidUntil&&
          <small><CheckCircle2 size={13}/>Assessed specialty expiry: {
            new Date(result.specialistValidUntil).toLocaleDateString('en-KE')}</small>}
        <p>Real Community Saver work is not yet being offered here. You have not received another trader's details and no payment has been authorized.</p>
      </div>}
    </div>
    <p className="spm-saver-footer"><ShieldCheck size={15}/>
      Qualifications are checked independently for My Ride, Shortstays and Storage.
      SecurePay does not issue a regulated professional licence by itself.
    </p>
  </section>;
}
