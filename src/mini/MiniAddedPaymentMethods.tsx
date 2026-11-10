import { useEffect,useState } from 'react';
import {Check,Plus,Trash2,X} from 'lucide-react';
import {
  MINI_ADDED_METHOD_LIMIT,MINI_ADDED_ROUTES,
  miniAddedMethodRoute,miniMethodAdd,miniMethodRemove,
  miniReadAddedMethods,miniWriteAddedMethods,
  type MiniAddedMethod,type MiniAddedRoute
} from './miniAddedPaymentMethods';
import type {MiniLanguage} from './miniModel';

/** Shared compact, user-created labels inside BOTH existing Mini simulators.
 * This never collects payment data and never adds a provider to the backend.
 */
export function MiniAddedPaymentMethods({language,disabled,selectedId,onSelect,onRemoveSelected}:{
  language:MiniLanguage;
  disabled:boolean;
  selectedId:string|null;
  onSelect:(method:MiniAddedMethod)=>void;
  onRemoveSelected:()=>void;
}){
  const sw=language==='sw';
  const storage=()=>{
    try{return typeof window!=='undefined'?window.sessionStorage:undefined;}
    catch{return undefined;}
  };
  const [methods,setMethods]=useState<MiniAddedMethod[]>(()=>
    miniReadAddedMethods(storage()));
  const [editing,setEditing]=useState(false);
  const [alias,setAlias]=useState('');
  const [route,setRoute]=useState<MiniAddedRoute>('MPESA');
  const [error,setError]=useState('');
  useEffect(()=>{
    miniWriteAddedMethods(methods,storage());
  },[methods]);

  const save=()=>{
    const created=miniMethodAdd(methods,alias,route);
    if(!created){
      setError(sw?'Tumia jina la mfano pekee, bila namba ya simu/akaunti.':
        'Use a short fictional label, not an account or phone number. No duplicates.');
      return;
    }
    setMethods(created.items);setAlias('');setRoute('MPESA');
    setEditing(false);setError('');
    onSelect(created.method);
  };
  const remove=(method:MiniAddedMethod)=>{
    if(disabled)return;
    if(selectedId===method.id)onRemoveSelected();
    setMethods(current=>miniMethodRemove(current,method.id));
    setError('');
  };
  return <div className="spm-methods" data-mini-added-methods="simulation-only">
    {methods.length>0&&<div className="spm-added-method-list" aria-label="Saved fictional payment methods">
      {methods.map(method=><div className="spm-added-method" key={method.id}>
        <button type="button" className={'spm-added-method-choice'+
          (selectedId===method.id?' spm-added-method-selected':'')}
          disabled={disabled} aria-pressed={selectedId===method.id}
          onClick={()=>onSelect(method)}>
          {selectedId===method.id?<Check size={16}/>:<span className="spm-added-method-circle"/>}
          <span><strong>{method.alias}</strong><small>{method.route==='OTHER'?
            'Not connected · cannot start payment':
            'Uses '+MINI_ADDED_ROUTES.find(x=>x.id===method.route)?.name+' · test only'}</small></span>
        </button>
        <button className="spm-added-method-remove" type="button" disabled={disabled}
          aria-label={'Remove sample method '+method.alias}
          onClick={()=>remove(method)}><Trash2 size={16}/></button>
      </div>)}
    </div>}
    {!editing&&methods.length<MINI_ADDED_METHOD_LIMIT&&
      <button type="button" className="spm-add-method-launch" disabled={disabled}
        onClick={()=>{setEditing(true);setError('');}}>
        <Plus size={16}/>{sw?'Ongeza njia ya malipo (jaribio)':'Add payment method'}
      </button>}
    {editing&&<div className="spm-add-method-form">
      <div className="spm-added-form-title">
        <strong>{sw?'Ongeza njia ya mfano':'Add a fictional payment method'}</strong>
        <button type="button" aria-label="Close add method form"
          onClick={()=>{setEditing(false);setError('');}}><X size={16}/></button>
      </div>
      <label htmlFor="spm-added-method-alias">
        {sw?'Jina la utambulisho (si namba ya akaunti)':'Nickname (not account details)'}
      </label>
      <input id="spm-added-method-alias" className="spm-added-method-input" type="text"
        autoComplete="off" maxLength={36} spellCheck={false} value={alias}
        placeholder="e.g. My personal mobile money" onChange={e=>{setAlias(e.target.value);setError('');}}/>
      <label htmlFor="spm-added-method-route">
        {sw?'Aina ya malipo ya mfano':'Test route / provider type'}
      </label>
      <select id="spm-added-method-route" value={route}
        onChange={e=>setRoute(e.target.value as MiniAddedRoute)}>
        {MINI_ADDED_ROUTES.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <p className="spm-added-method-caution">
        {sw?'Jaribio tu. Usiandike namba za akaunti, PIN au simu.':
          'Simulation only. No account numbers, phone numbers, PINs or provider credentials.'}
      </p>
      {error&&<p className="spm-error" role="alert">{error}</p>}
      <button type="button" className="spm-secondary" onClick={save} disabled={disabled}>
        <Plus size={16}/>{sw?'Hifadhi jina la mfano':'Save fictional method'}
      </button>
    </div>}
    {selectedId&&methods.some(method=>method.id===selectedId&&
      miniAddedMethodRoute(method)===null)&&
      <p className="spm-method-not-connected" role="status">
        {sw?'Mtoa huduma huyu hajaunganishwa. Huwezi kuanza malipo.':
          'This provider is not connected. You can keep the label, but cannot start a payment or a test attempt with it.'}
      </p>}
    {methods.length>0&&<small className="spm-added-method-foot">
      {sw?'Majina yanahifadhiwa kwa muda kwenye tab hii tu. Hakuna akaunti iliyounganishwa.':
        'Fictional labels are remembered in this browser tab only; no account is linked.'}
    </small>}
  </div>;
}
