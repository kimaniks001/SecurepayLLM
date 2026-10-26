import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { SessionStore } from '../../api/securepay/session';
import type { AuthGateway } from '../../api/securepay/auth';
import { SignInExperience } from '../public/SignInExperience';
import { SignupForm } from '../join/JoinExperience';
import { SignupIssuedWelcome } from '../join/SignupIssuedWelcome';

type AuthStage = 'signin' | 'signup' | 'welcome';
type AuthMethods = Pick<AuthGateway,'signIn'|'completeOtp'|'resendOtp'|'signupStart'|'signupResend'|'signupVerify'>;

/**
 * Identity within the existing Living Workspace, NOT a separate app or chat.
 * The parent KS001 conversation, tool shelf, Vision and right-hand Check remain mounted
 * while this dialog is open. Only the existing AuthGateway/SessionStore issue identities.
 */
export function WorkspaceIdentityOverlay({auth,session,identityStagingReady,onDone,onChooseVision,onJoin,onBusiness,onActivation}:{
  auth:AuthMethods;
  session:SessionStore;
  identityStagingReady:boolean;
  onDone:()=>void;
  onChooseVision:()=>void;
  onJoin:()=>void;
  onBusiness:()=>void;
  onActivation:()=>void;
}){
  const [stage,setStage]=useState<AuthStage>('signin');
  const [issuedKsNumber,setIssuedKsNumber]=useState<string|null>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  const pane=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    closeButton.current?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape' && stage!=='welcome'){event.preventDefault();onDone();return;}
      if(event.key!=='Tab')return;
      const focusable=Array.from(pane.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')??[]);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    };
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[stage,onDone]);
  const complete=()=>{setIssuedKsNumber(null);onDone();};
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-forest-950/50 p-2 sm:p-5" data-gate-d-workspace-identity>
    <div ref={pane} role="dialog" aria-modal="true" aria-label={stage==='welcome'?'Your issued KS Number':stage==='signup'?'Get your KS Number':'Sign in to SecurePay'}
      className="flex max-h-[95dvh] w-full max-w-[780px] flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-cream-200 bg-cream-50 px-4 py-2">
        <div><p className="text-xs font-semibold text-forest-800">SecurePay · Your identity</p>
          <p className="text-xs text-sand-600">Your current work stays open behind this step.</p>
        </div>
        {stage!=='welcome'&&<button ref={closeButton} type="button" onClick={onDone} aria-label="Close identity step and return to Workspace"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-cream-100"><X size={18}/></button>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto" data-gate-d-identity-content>
      {stage==='signin'&&<SignInExperience
        auth={auth} session={session} onSignedIn={complete} onCancel={complete}
        onRecover={()=>{complete();window.location.hash='#/recovery';}}
        onGetKsNumber={()=>setStage('signup')}/>}
      {stage==='signup'&&<div className="mx-auto w-full max-w-xl space-y-4 p-5 sm:p-8" data-gate-d-workspace-signup>
        <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">Identity · Not financial activation</p>
        <h2 className="font-display text-3xl text-forest-900">Get your KS Number</h2>
        <p className="text-sm leading-6 text-sand-700">First we verify your contact. Then SecurePay issues your identity. Joining The Trust Project, representing a Business and connecting Money are separate choices.</p>
        {!identityStagingReady ? <section role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-sand-800" data-gate-d-signup-staging-hold>
          This development preview has not been certified against an isolated identity service. Signup is unavailable here so we do not accidentally create a real KS Number in production.
          <button type="button" onClick={()=>setStage('signin')} className="mt-3 block min-h-11 rounded-xl border border-forest-200 px-3 font-semibold">Return to sign in</button>
        </section> : <SignupForm auth={auth} session={session} context="GENERIC"
          onUseExisting={()=>setStage('signin')} onBack={()=>setStage('signin')}
          onIssued={ksNumber=>{setIssuedKsNumber(ksNumber);setStage('welcome');}}/>}
      </div>}
      {stage==='welcome'&&issuedKsNumber&&<div data-gate-d-workspace-issued>
        <SignupIssuedWelcome ksNumber={issuedKsNumber} onContinue={complete}
          onVision={()=>{complete();onChooseVision();}}
          onJoin={()=>{complete();onJoin();}}
          onBusiness={()=>{complete();onBusiness();}}
          onActivation={()=>{complete();onActivation();}}/>
      </div>}
      </div>
    </div>
  </div>;
}
