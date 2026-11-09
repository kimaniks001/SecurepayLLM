import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, CalendarDays, CircleAlert, FileCheck2,
  LoaderCircle, MessageCircle, ShieldCheck, ShoppingBag
} from 'lucide-react';
import type { MiniDraft, MiniLanguage } from './miniModel';
import type { MiniDemoStatus } from './checkoutDemoFixtures';
import type { MiniFundingTestStatus, MiniTestRailId } from './miniFundingSimulator';
import { MiniFundingPreview } from './MiniFundingPreview';
import { MiniGuestChat } from './MiniGuestChat';
import {
  acknowledgeGate2Review, getGate2Snapshot,
  type SandboxGate2Snapshot
} from './gate2SandboxClient';

type LoadState = 'loading' | 'ready' | 'expired' | 'unavailable';
type Screen = 'review' | 'funding' | 'chat';

/** Gate 2 sandbox. Uses the same existing Mini and simulated rail component.
 * Review is a TEST transition only, never legal acceptance or a real order.
 */
export function MiniGate2Sandbox({session, language}: {session:string;language:MiniLanguage}) {
  const sw = language === 'sw';
  const [loading,setLoading] = useState<LoadState>('loading');
  const [snapshot,setSnapshot] = useState<SandboxGate2Snapshot|null>(null);
  const [screen,setScreen] = useState<Screen>('review');
  const [cameFrom,setCameFrom] = useState<'review'|'funding'>('review');
  const [chatStarted,setChatStarted] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [simulatedStatus,setSimulatedStatus] = useState<MiniDemoStatus>('NOT_STARTED');

  useEffect(()=>{
    const controller = new AbortController();
    const timeout = window.setTimeout(()=>controller.abort(),8000);
    void getGate2Snapshot(session,controller.signal).then(result=>{
      if(controller.signal.aborted)return;
      if(result.kind==='ready'){
        setSnapshot(result.data);
        setLoading('ready');
      } else setLoading(result.kind);
    }).finally(()=>window.clearTimeout(timeout));
    return ()=>{window.clearTimeout(timeout);controller.abort();};
  },[session]);

  useEffect(()=>{
    if(loading!=='ready'||!snapshot)return;
    const remaining=snapshot.expiresAt-Date.now();
    if(remaining<=0){setLoading('expired');return;}
    const id=window.setTimeout(()=>setLoading('expired'),remaining);
    return ()=>window.clearTimeout(id);
  },[snapshot,loading]);

  useEffect(()=>{
    window.scrollTo(0,0);
    document.querySelector<HTMLElement>('.spm-frame')?.scrollTo(0,0);
  },[screen,loading]);

  const returnPath = snapshot?.order.hostReturnPath || '/checkout-gate2-store.html';
  const backToHost = () => {
    if(window.parent!==window) {
      window.parent.postMessage({
        type:'SECUREPAY_MINI_OWNER_DEMO_RETURN_V1',version:1,
        fixtureId:snapshot?.order.fixtureId,
        result:simulatedStatus,simulated:true,sandboxGate:2,
        agreementAccepted:false,orderCreated:false
      },window.location.origin);
      return;
    }
    window.location.assign(returnPath);
  };
  const onDemoStateChange = useCallback((status:MiniFundingTestStatus, method:MiniTestRailId|null)=>{
    setSimulatedStatus(status==='SELECT_METHOD'&&!method?'NOT_STARTED':status);
  },[]);
  const showChat = () => {
    setCameFrom(screen==='funding'?'funding':'review');
    setChatStarted(true);setScreen('chat');
  };
  const reviewTerms = async () => {
    if(!snapshot||busy||snapshot.stage==='TERMS_REVIEWED') {
      if(snapshot?.stage==='TERMS_REVIEWED')setScreen('funding');
      return;
    }
    setBusy(true);setError('');
    try {
      // Server validates this test acknowledgment against the encrypted draft
      // and returns another encrypted claim. No signature is ever created.
      const reviewed = await acknowledgeGate2Review(session);
      if(reviewed.kind!=='ready') {
        setError(reviewed.kind==='expired'?'This test review expired. Return and try again.':
          'Could not review these sample terms. Please try again.');
        return;
      }
      const loaded = await getGate2Snapshot(reviewed.session);
      if(loaded.kind!=='ready'||loaded.data.stage!=='TERMS_REVIEWED'||
          loaded.data.agreement.mayExploreSimulatedRails!==true||
          loaded.data.order.sandboxId!==snapshot.order.sandboxId||
          loaded.data.order.amountMinor!==snapshot.order.amountMinor||
          loaded.data.agreement.version!==snapshot.agreement.version) {
        setError('The sample review could not be confirmed. No payment was made.');
        return;
      }
      setSnapshot(loaded.data);
      setScreen('funding');
    } finally {setBusy(false);}
  };

  if(loading!=='ready'||!snapshot) {
    return <section className="spm-content spm-server-wait" role="status" aria-live="polite">
      {loading==='loading'?<LoaderCircle size={23}/>:<CircleAlert size={23}/>}
      <h1 className="spm-question">{loading==='loading'
        ? (sw?'Inaandaa makubaliano ya jaribio…':'Preparing sample agreement…')
        : loading==='expired'?'Sample checkout expired':'Sample checkout unavailable'}</h1>
      <p className="spm-lead">{loading==='loading'
        ? 'Loading test terms from the preview server.'
        : 'Nothing was ordered, signed, reserved or paid. Start again from the Store or ShortStays.'}</p>
      {loading!=='loading'&&<button type="button" className="spm-primary" onClick={backToHost}>
        <ArrowLeft size={17}/>{sw?'Rudi kwenye tovuti':'Return to website'}
      </button>}
    </section>;
  }
  const {order,agreement}=snapshot;
  const reviewed=snapshot.stage==='TERMS_REVIEWED';
  const Icon=order.source==='STORE'?ShoppingBag:CalendarDays;
  const draft:MiniDraft={
    intent:'pay',description:order.description,
    amount:(order.amountMinor/100).toFixed(2),
    quantity:order.quantity,unit:order.unit,
    note:agreement.terms+' Sample terms only, not a real agreement.',
    counterparty:''
  };

  return <section className="spm-hosted-demo spm-gate2" data-sandbox-gate="2"
      data-order-fixture={order.fixtureId}>
    {screen==='review'&&<div className="spm-hosted-review">
      <div className="spm-demo-flag"><FileCheck2 size={16}/>
        {sw?'JARIBIO TU · Hakuna mkataba':'SANDBOX · No agreement signed'}
      </div>
      <div className="spm-hosted-source"><Icon size={17}/>
        <span>{order.source==='STORE'?'Digital Store':'ShortStays'}</span>
        <small>{sw?'Muundo wa mfano':'Sample transaction'}</small>
      </div>
      <h1 className="spm-question">{sw?'Kagua oda na masharti':'Review order & terms'}</h1>
      <div className="spm-hosted-summary">
        <small>{order.reference} · {order.orderVersion}</small>
        <strong>{order.description}</strong>
        <span>{order.details}</span>
        <div className="spm-hosted-price">
          {'KSh '+(order.amountMinor/100).toLocaleString('en-KE',{maximumFractionDigits:2})}
        </div>
        <span>{order.merchant}</span>
        <div className="spm-gate2-agreement">
          <strong>{sw?'Makubaliano ya mfano':'Sample agreement'}</strong>
          <span>{agreement.sellerObligation}</span>
          <span>{agreement.buyerObligation}</span>
          <small>{agreement.terms}</small>
        </div>
      </div>
      <p className="spm-hosted-safety"><ShieldCheck size={16}/>
        {sw?'Hakuna mtu aliyesaini. Hakuna pesa zilizotumwa.':
          'No one has signed or accepted. No stock, room or money moved.'}
      </p>
      {error&&<p className="spm-error" role="alert">{error}</p>}
      <button type="button" className="spm-primary" disabled={busy} onClick={()=>void reviewTerms()}>
        {busy?'Checking sample terms…':
          reviewed ? 'Continue to payment simulation' : 'Reviewed — continue to simulation'}
        <ArrowRight size={17}/>
      </button>
      <button type="button" className="spm-quiet-button" onClick={showChat}>
        <MessageCircle size={16}/>{sw?'Unahitaji msaada? Uliza KS001':'Need help? Ask KS001'}
      </button>
      <button type="button" className="spm-quiet-button" onClick={backToHost}>
        <ArrowLeft size={16}/>{sw?'Rudi kwenye tovuti':'Back to website'}
      </button>
    </div>}

    {reviewed&&<div className="spm-hosted-finance" hidden={screen!=='funding'}>
      <div className="spm-gate2-reviewed">Sample terms reviewed · NOT SIGNED · NOT PAID</div>
      <MiniFundingPreview draft={draft} language={language}
        guidedDemo
        onDemoStateChange={onDemoStateChange}
        onBack={()=>setScreen('review')}
        onReturnToHost={backToHost}
        returnLabel={sw?'Rudi kwenye tovuti':order.source==='STORE'?'Return to Store':'Return to ShortStays'}/>
      <button type="button" className="spm-quiet-button" onClick={showChat}>
        <MessageCircle size={16}/>Need help? Ask KS001
      </button>
    </div>}

    {chatStarted&&<div className="spm-hosted-chat" hidden={screen!=='chat'}>
      <MiniGuestChat draft={draft} language={language} onBack={()=>setScreen(cameFrom)}/>
    </div>}
  </section>;
}
