import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, LockKeyhole, RefreshCcw } from 'lucide-react';
import type { AuthGateway } from '../api/securepay/auth';
import type { SessionStore } from '../api/securepay/session';
import { createIdentityController } from '../features/identity/controller';

/**
 * Existing SecurePay KS Number/OTP controller; no second identity system.
 * Mounted only inside the approved, API-isolated first-party Mini pilot.
 * Signing in does NOT create, accept, join, send or fund an Agreement.
 */
export function MiniIdentityStep({auth,session,onDone,onCancel}:{
  auth:Pick<AuthGateway,'signIn'|'completeOtp'|'resendOtp'>;
  session:SessionStore;
  onDone:()=>void;
  onCancel:()=>void;
}){
  const [identity]=useState(()=>createIdentityController(auth,session));
  const s=useSyncExternalStore(identity.subscribe,identity.getSnapshot,identity.getSnapshot);
  useEffect(()=>{ if(s.phase==='signed-in')onDone(); },[s.phase,onDone]);
  const onSubmit=()=>{
    if(s.phase==='credentials')void identity.submitCredentials();
    else if(s.phase==='otp')void identity.submitOtp();
  };
  return <section className="spm-mini-identity" aria-label="Sign in to save or resume SecurePay work">
    <button type="button" className="spm-back" onClick={onCancel}><ArrowLeft size={16}/>Back to KS001</button>
    <div className="spm-persona"><LockKeyhole size={16}/><span>Your KS Number</span></div>
    <h2 className="spm-question">{s.phase==='otp'?'Enter your one-time code':'Sign in to save your work'}</h2>
    <p className="spm-capture-note">Your work stays in SecurePay. Signing in only confirms your identity; it does not accept an Agreement or move money.</p>
    <form className="spm-mini-auth-form" onSubmit={event=>{event.preventDefault();onSubmit();}}>
      {s.phase==='credentials' && <>
        <label className="spm-label" htmlFor="spm-m3-ksnumber">KS Number</label>
        <input className="spm-field" id="spm-m3-ksnumber" value={s.ksNumber}
          onChange={event=>identity.setKsNumber(event.target.value)} autoComplete="username"
          maxLength={60} required disabled={s.busy} />
        <label className="spm-label" htmlFor="spm-m3-password">Password</label>
        <input className="spm-field" id="spm-m3-password" type="password" value={s.password}
          onChange={event=>identity.setPassword(event.target.value)} autoComplete="current-password"
          required disabled={s.busy} />
      </>}
      {s.phase==='otp' && <>
        <label className="spm-label" htmlFor="spm-m3-code">Code</label>
        <input className="spm-field" id="spm-m3-code" value={s.otp} inputMode="numeric"
          onChange={event=>identity.setOtp(event.target.value)} autoComplete="one-time-code"
          maxLength={20} required disabled={s.busy} />
      </>}
      {s.error && <p className="spm-error" role="alert">{s.error}</p>}
      <button type="submit" className="spm-primary" disabled={s.busy ||
        (s.phase==='credentials'?!(s.ksNumber.trim()&&s.password):!s.otp.trim())}>
        {s.busy?'Checking…':s.phase==='otp'?'Verify identity':'Continue securely'}
      </button>
    </form>
    {s.phase==='otp' && <div className="spm-mini-identity-actions">
      <button type="button" className="spm-quiet-button" disabled={s.busy}
        onClick={()=>void identity.resendOtp()}><RefreshCcw size={14}/>Resend code</button>
      <button type="button" className="spm-quiet-button" disabled={s.busy}
        onClick={()=>identity.reset()}>Start again</button>
    </div>}
  </section>;
}
