import {useEffect,useState} from 'react';
import {Check,Landmark,Plus,Trash2,X} from 'lucide-react';
import {
  MINI_ADDED_METHOD_LIMIT,MINI_ADDED_ROUTES,MINI_ADDED_METHOD_STORAGE,
  miniAddedMethodRoute,miniMethodAdd,miniMethodRemove,
  miniReadAddedMethods,miniWriteAddedMethods,
  type MiniAddedMethod,type MiniAddedRoute
} from '../../mini/miniAddedPaymentMethods';

/**
 * Same LOCAL sample method preferences as Mini, represented in the primary
 * Money workspace without any integration into real Agreement/provider flows.
 * Do not migrate these labels to real bank accounts or funding authorisation.
 */
export function SamplePaymentMethodsPanel(){
  const storage=()=>{
    try{return typeof window!=='undefined'?window.sessionStorage:undefined;}
    catch{return undefined;}
  };
  const [items,setItems]=useState<MiniAddedMethod[]>(()=>miniReadAddedMethods(storage()));
  const [selected,setSelected]=useState<string|null>(null);
  const [editing,setEditing]=useState(false);
  const [alias,setAlias]=useState('');
  const [route,setRoute]=useState<MiniAddedRoute>('MPESA');
  const [error,setError]=useState('');
  useEffect(()=>{miniWriteAddedMethods(items,storage());},[items]);
  const add=()=>{
    const result=miniMethodAdd(items,alias,route);
    if(!result){
      setError('Use a fictional nickname only. Do not enter phone, bank account or PIN details.');
      return;
    }
    setItems(result.items);setSelected(result.method.id);
    setAlias('');setRoute('MPESA');setEditing(false);setError('');
  };
  return <div className="space-y-3 text-sm" data-main-site-added-payment-methods="simulation-only">
    <div className="flex items-start gap-2 rounded-xl bg-cream-50 p-3 text-xs leading-5 text-sand-700">
      <Landmark size={17} className="mt-0.5 shrink-0 text-forest-700"/>
      <p><strong>Simulation only.</strong> These are labels for practising payment
        preferences. No bank or mobile-money account is connected, verified,
        charged or saved to SecurePayAPI. Actual choices come from verified
        Agreement funding options.</p>
    </div>
    {items.length>0&&<div className="space-y-2" aria-label="Fictional saved payment methods">
      {items.map(item=><div key={item.id}
        className="flex min-w-0 items-stretch overflow-hidden rounded-xl border border-cream-200 bg-white">
        <button type="button" aria-pressed={selected===item.id}
          className={'flex min-h-12 flex-1 items-center gap-2 px-3 py-2 text-left '+
            (selected===item.id?'bg-forest-50':'hover:bg-cream-50')}
          onClick={()=>setSelected(item.id)}>
          {selected===item.id?<Check size={16} className="shrink-0 text-forest-700"/>:
            <span className="h-4 w-4 shrink-0 rounded-full border border-forest-200"/>}
          <span className="min-w-0 flex-1">
            <strong className="block break-words text-xs text-forest-800">{item.alias}</strong>
            <small className="block text-[11px] text-sand-600">
              {miniAddedMethodRoute(item)===null?'Not connected — cannot initiate':
                MINI_ADDED_ROUTES.find(x=>x.id===item.route)?.name+' · test only'}
            </small>
          </span>
        </button>
        <button type="button" aria-label={'Remove sample method '+item.alias}
          className="min-w-11 border-l border-cream-200 text-sand-600 hover:bg-cream-50"
          onClick={()=>{setItems(old=>miniMethodRemove(old,item.id));
            if(selected===item.id)setSelected(null);}}>
          <Trash2 size={16} className="mx-auto"/>
        </button>
      </div>)}
    </div>}
    {!editing&&items.length<MINI_ADDED_METHOD_LIMIT&&
      <button type="button"
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-forest-300 bg-cream-50 px-3 text-xs font-semibold text-forest-700 hover:bg-forest-50"
        onClick={()=>{setEditing(true);setError('');}}>
        <Plus size={17}/>Add payment method (sample)
      </button>}
    {editing&&<div className="space-y-2 rounded-xl border border-forest-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-xs text-forest-800">New fictional method</strong>
        <button type="button" aria-label="Close new method form"
          className="min-h-9 min-w-9" onClick={()=>{setEditing(false);setError('');}}>
          <X size={16} className="mx-auto"/>
        </button>
      </div>
      <label className="block text-xs font-semibold" htmlFor="sp-money-method-alias">
        Nickname — no account details
      </label>
      <input id="sp-money-method-alias" className="min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm"
        type="text" maxLength={36} autoComplete="off" spellCheck={false}
        value={alias} onChange={e=>{setAlias(e.target.value);setError('');}}
        placeholder="e.g. Family mobile money"/>
      <label className="block text-xs font-semibold" htmlFor="sp-money-method-route">
        Example financial route
      </label>
      <select id="sp-money-method-route"
        className="min-h-11 w-full rounded-lg border border-cream-200 bg-white px-3 text-sm"
        value={route} onChange={e=>setRoute(e.target.value as MiniAddedRoute)}>
        {MINI_ADDED_ROUTES.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      {error&&<p role="alert" className="text-xs text-ember-700">{error}</p>}
      <button type="button" onClick={add}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-forest-800 px-3 font-semibold text-white">
        <Plus size={16}/>Save sample method
      </button>
    </div>}
    {selected&&items.some(item=>item.id===selected&&miniAddedMethodRoute(item)===null)&&
      <p role="status" className="rounded-lg border border-cream-200 bg-cream-50 p-2 text-xs text-sand-700">
        This provider is not connected. This label cannot be used for payment.
      </p>}
    <small className="block text-[11px] text-sand-500">
      Saved only for this browser tab under {MINI_ADDED_METHOD_STORAGE}. Real
      funding methods require signed-in provider verification and an Agreement-specific quote.
    </small>
  </div>;
}
