import {useRef,useState,useSyncExternalStore} from 'react';
import type {SessionStore} from '../../api/securepay/session';
import {studioClient,type Capacity,type Personal} from './studioSession.mjs';
import {StudioRecords} from './StudioRecords';
import './studio.css';

export function SharedStudio({origin,session,onBack,allowBusiness=true}:{origin:string;session:SessionStore;onBack:()=>void;allowBusiness?:boolean}){
 const snapshot=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
 const initial=useRef(snapshot),token=useRef(session.getAccessToken());
 const current=()=>session.getSnapshot()===initial.current&&session.getSnapshot().status==='signed-in'&&session.getAccessToken()===token.current&&!session.isAccessTokenExpired()&&window.location.origin===origin;
 const [person,setPerson]=useState<Personal|null>(null),[businesses,setBusinesses]=useState<{ksNumber:string;label:string}[]>([]),[choice,setChoice]=useState(''),[title,setTitle]=useState(''),[purpose,setPurpose]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false);
 const client=()=>{if(!current()||!token.current)throw Error('Sign in again');return studioClient({origin,token:token.current,current,fetcher:fetch});};
 async function connect(){if(lock.current)return;lock.current=true;setBusy(true);setMessage('');setPerson(null);setChoice('');setBusinesses([]);try{const c=client(),p=await c.personal();const b=allowBusiness?await c.businesses():[];if(!current())throw Error('Account changed');setPerson(p);setBusinesses(b);setChoice('personal');}catch{setMessage('SecurePay could not verify your current identity. Reopen after signing in.');}finally{lock.current=false;setBusy(false);}}
 const capacity:Capacity|null=person&&choice?{kind:choice==='personal'?'personal':'business',ksNumber:choice==='personal'?person.ksNumber:choice,identityId:person.identityId,personalKsNumber:person.ksNumber}:null;
 return <section className="g4-studio" aria-label="Collaborative Offers">
 <button type="button" onClick={onBack}>Back</button><h1>Collaborative Offers</h1><p>One private Studio across SecurePay. Preparation is not commercial acceptance or Money.</p>
 {!current()?<p role="alert">Your account or session changed. Close this Studio and reopen after signing in.</p>:<>
 <button type="button" disabled={busy||!!person} onClick={()=>void connect()}>Verify my identity</button>
 {person&&<><label>Trade as<select value={choice} onChange={e=>{setTitle('');setPurpose('');setChoice(e.target.value);}}><option value="personal">Myself · {person.ksNumber}</option>{businesses.map(b=><option value={b.ksNumber} key={b.ksNumber}>{b.label} · {b.ksNumber}</option>)}</select></label>
 <label>Opportunity title<input value={title} maxLength={160} onChange={e=>setTitle(e.target.value)}/></label><label>Purpose<textarea value={purpose} maxLength={800} onChange={e=>setPurpose(e.target.value)}/></label>
 {capacity&&<StudioRecords key={capacity.kind+':'+capacity.ksNumber} organizer={capacity.ksNumber} title={title} purpose={purpose} request={(suffix,method='GET',body)=>client().scoped(capacity,suffix,method,body)}/>}</>}
 {message&&<p role="status">{message}</p>}</>}
 </section>;
}
