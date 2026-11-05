import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import type { EmbedTransferGateway, EmbedTransferClaimed } from '../../api/securepay/embed/transfer';
import { SignInExperience } from '../public/SignInExperience';

const SITE=/^[a-z0-9][a-z0-9_-]{2,63}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TICKET=/^[A-Za-z0-9_-]{43}$/;
const TOKEN=/^[A-Za-z0-9_-]{43,256}$/;

interface Incoming {
  siteId: string;
  conversationId: string;
  ticket: string;
  guestToken: string;
  expiresAt: string;
  sourceOrigin: string;
  nonce: string;
}
interface Props {
  gateway: EmbedTransferGateway;
  auth: AuthGateway;
  session: SessionStore;
  onClaimed: (result: EmbedTransferClaimed) => void;
  onCancel: () => void;
  /** Enabled ONLY against a reviewed staging SecurePay receiver + API. */
  stagingReady: boolean;
}

/**
 * Public embed's named SecurePay-origin transfer receiver. Does not replace
 * SecurePay sign-in, SessionStore, ownership, Agreement handoff or workspace.
 *
 * Flow: host explicitly starts transfer -> popup asks opener for one-time
 * ticket over postMessage -> verified SecurePay sign-in -> person explicitly
 * accepts -> backend claims same conversation and retires guest token ->
 * original existing Living Workspace reopens it under authenticated identity.
 *
 * Ticket/guest token stay in this page's memory. Never URL, storage or logs.
 */
export function EmbedTransferReceiveExperience({
  gateway,auth,session,onClaimed,onCancel,stagingReady
}:Props) {
  const sessionState=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
  const [incoming,setIncoming]=useState<Incoming|null>(null);
  const [notice,setNotice]=useState('Waiting for Estate.ke to share your saved work…');
  const [busy,setBusy]=useState(false);
  const [failed,setFailed]=useState(false);
  const sourceWindow=useRef<Window|null>(null);
  const receiverNonce=useRef<string|null>(null);
  const consumed=useRef(false);

  useEffect(()=>{
    if(!stagingReady) {setNotice('SecurePay handoff is disabled outside the approved staging environment.');return;}
    const opener=window.opener;
    if(!opener){setNotice('Return to Estate.ke and select Continue in SecurePay again.');return;}
    sourceWindow.current=opener;
    const nonce=window.crypto.randomUUID();
    receiverNonce.current=nonce;
    function onMessage(e:MessageEvent){
      if(e.source!==opener || !e.data || typeof e.data!=='object' ||
        e.data.type!=='securepay.embed.transfer.offer' ||
        e.data.nonce!==nonce || consumed.current)return;
      // The origin is supplied by the BROWSER, never trusted from the payload.
      if(!/^https:\/\//.test(e.origin) || !SITE.test(e.data.siteId) ||
        !UUID.test(e.data.conversationId) ||
        !TICKET.test(e.data.ticket) || !TOKEN.test(e.data.guestToken) ||
        !Number.isFinite(Date.parse(e.data.expiresAt)) ||
        Date.parse(e.data.expiresAt)<=Date.now() ||
        Date.parse(e.data.expiresAt)>Date.now()+6*60_000 ||
        e.data.receiverOrigin!==window.location.origin)return;
      setIncoming({
        siteId:e.data.siteId,conversationId:e.data.conversationId,
        ticket:e.data.ticket,guestToken:e.data.guestToken,
        expiresAt:e.data.expiresAt,sourceOrigin:e.origin,nonce
      });
      setNotice('');
    }
    window.addEventListener('message',onMessage);
    // A ready signal carries NO secret and is sent only to this actual opener.
    opener.postMessage({type:'securepay.embed.transfer.ready',nonce},'*');
    return()=>{
      window.removeEventListener('message',onMessage);
      sourceWindow.current=null;
    };
  },[stagingReady]);

  async function claim(){
    if(!incoming||busy||consumed.current||session.getSnapshot().status!=='signed-in'||!stagingReady)return;
    if(Date.parse(incoming.expiresAt)<=Date.now()){
      setNotice('That transfer expired. Return to Estate.ke to start again.');
      setIncoming(null);return;
    }
    setBusy(true);setFailed(false);setNotice('');
    try{
      await ensureFreshSession(session,auth);
      const result=await gateway.claim({
        ticket:incoming.ticket,guestToken:incoming.guestToken,
        siteId:incoming.siteId,conversationId:incoming.conversationId
      });
      if(result.siteId!==incoming.siteId||result.conversationId!==incoming.conversationId||
        result.returnOrigin!==incoming.sourceOrigin || !UUID.test(result.savedBuildId))
        throw new Error('The server did not confirm the original Estate work.');
      consumed.current=true;
      // Only a generic status, the verified originating reference and source nonce go back.
      // No identity, token, conversation text, Agreement, signature or money data.
      try {
        sourceWindow.current?.postMessage({
          type:'securepay.embed.transfer.claimed',nonce:incoming.nonce,
          siteId:result.siteId,returnReference:result.returnReference,
          status:'SECUREPAY_WORK_SAVED'
        },incoming.sourceOrigin);
      }catch(_){/* Return status can be re-checked on the estate independently later. */}
      // Prevent the estate host from navigating this authenticated SecurePay page.
      try{window.opener=null;}catch(_){}
      onClaimed(result);
    }catch(_){
      setFailed(true);
      setNotice('SecurePay could not confirm this transfer. No Agreement or payment was authorised. If the response was interrupted, retry the same ticket.');
    }finally{setBusy(false);}
  }

  const source=incoming?.sourceOrigin ? new URL(incoming.sourceOrigin).hostname : 'Estate.ke';
  return <main className="min-h-screen bg-cream-100 px-4 py-8 text-forest-800" data-securepay-embed-receiver>
    <section className="mx-auto max-w-lg rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-forest-600">SecurePay · Continue My Work</p>
      <h1 className="mt-1 font-display text-2xl font-semibold">Continue where you started</h1>
      {incoming ? <>
        <p className="mt-3 text-sm text-sand-700">
          You began a KS001 conversation at <strong>{source}</strong>.
          Move that same conversation to your private SecurePay workspace?
        </p>
        <p className="mt-2 text-xs text-sand-600">Your saved conversation is not yet a signed Agreement. No one is invited or paid by continuing.</p>
        {sessionState.status!=='signed-in' ?
          <div className="mt-3">
            <p className="mb-2 text-sm font-medium">Sign in with your KS Number to claim this work.</p>
            <SignInExperience auth={auth} session={session}
              onSignedIn={()=>{}} onCancel={onCancel}
              onRecover={()=>setNotice('Use account recovery separately, then restart the Estate transfer.')}
            />
          </div>
          : <button type="button" disabled={busy||consumed.current}
              onClick={()=>void claim()}
              className="mt-4 rounded-xl bg-forest-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {busy?'Checking and saving…':failed?'Retry same secure transfer':'Yes, continue in My Work'}
            </button>}
      </> : <p className="mt-3 text-sm text-sand-700">{notice}</p>}
      {notice && incoming && <p role="status" className="mt-3 text-sm text-red-700">{notice}</p>}
      <button type="button" onClick={onCancel}
        className="mt-4 block min-h-10 text-sm text-sand-700 underline">
        Cancel and go to SecurePay
      </button>
    </section>
  </main>;
}
