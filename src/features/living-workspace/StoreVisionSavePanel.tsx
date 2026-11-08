import { useEffect, useState } from 'react';
import { BookmarkPlus, X } from 'lucide-react';
import type { StoreOffer } from '../../types';
import type { VisionDreamGateway } from '../../api/securepay/visiondreams';
import type { AgentGateway } from '../../api/securepay/agent';
import type { VisionDreamDto } from '../../api/securepay/visiondreams/dto';
import { createVisionDreamController } from '../visionboard/dreams/controller';

type VisionApi={
 dreams:Pick<VisionDreamGateway,'mine'|'get'|'board'|'saveBoard'|'create'>;
 agent:Pick<AgentGateway,'createConversation'|'resumableConversationId'|'forgetResumableConversation'>;
};
function makeId(){
 return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
}
function noteForOffer(offer:StoreOffer){
 return [
  'Digital Store possibility — NOT a purchase, order, confirmed price or Agreement.',
  'What: '+offer.title,
  'Store: '+offer.storeName,
  'Source Store reference: '+offer.storeId,
  'Source offer reference: '+offer.id,
  'Listed price: '+offer.price+' ('+offer.currency+')',
  'Description: '+offer.description.slice(0,500),
  'Source listing updated: '+offer.version,
  'Recheck the seller, availability, current amount, delivery and scope before agreeing.',
 ].join('\n');
}
/** Saves a genuine Store-source note into the EXISTING versioned Dream board.
 * Never replaces the Dream board or calls an Agreement/Money API. */
export async function saveStoreOfferToDream(api:VisionApi,dreamId:string,offer:StoreOffer){
 const dream=await api.dreams.get(dreamId);
 if(dream.dreamId!==dreamId || dream.superseded || dream.locked)
  throw new Error('This Vision is not editable. Choose another Vision.');
 const board=await api.dreams.board(dreamId);
 if(board.dreamId!==dreamId)throw new Error('Vision board identity changed. Review before saving.');
 let doc:{v:1;objects:Array<Record<string,unknown>>};
 if(board.revision>0){
  try{
   const parsed=JSON.parse(board.documentJson) as {v?:number;objects?:unknown};
   if(parsed.v!==1||!Array.isArray(parsed.objects))
    throw new Error('Different Vision document format');
   doc={v:1,objects:parsed.objects as Array<Record<string,unknown>>};
  }catch{throw new Error('This Vision has an unfamiliar board format. Open it before adding Store items.');}
 }else{
  // DreamBuilder preserves a legacy text note when there is no board yet.
  const existing=dream.content?.trim();
  if(existing){
   try{
    const parsed=JSON.parse(existing) as {v?:number;objects?:unknown};
    doc=parsed.v===1&&Array.isArray(parsed.objects)
     ?{v:1,objects:parsed.objects as Array<Record<string,unknown>>}
     :{v:1,objects:[{id:makeId(),kind:'note',x:80,y:80,w:270,h:160,text:existing,tone:0}]};
   }catch{doc={v:1,objects:[{id:makeId(),kind:'note',x:80,y:80,w:270,h:160,text:existing,tone:0}]};}
  }else doc={v:1,objects:[]};
 }
 const note=noteForOffer(offer);
 const duplicate=doc.objects.some(item=>item.kind==='note'
  &&typeof item.text==='string'
  &&item.text.includes('Source Store reference: '+offer.storeId+'\n')
  &&item.text.includes('Source offer reference: '+offer.id+'\n'));
 if(duplicate)return 'Already saved in this Vision. You can find the original Store reference there.';
 const index=doc.objects.length;
 doc.objects.push({id:makeId(),kind:'note',x:80+(index%3)*285,y:80+Math.floor(index/3)*195,w:270,h:175,text:note,tone:0});
 const json=JSON.stringify(doc);
 if(new TextEncoder().encode(json).length>524288)
  throw new Error('This Vision board is full. Open it and organise its contents before adding more.');
 const saved=await api.dreams.saveBoard(dreamId,{
  schemaVersion:1,documentJson:json,expectedRevision:board.revision,idempotencyKey:makeId(),
 });
 if(saved.dreamId!==dreamId || saved.revision<=board.revision)
  throw new Error('SecurePay did not confirm the latest Vision board. Review it before retrying.');
 return 'Saved to Vision with the original Store reference. Nothing was purchased.';
}

export function StoreVisionSavePanel({offer,api,example,onClose,onPreviewSaved}:{
 offer:StoreOffer;
 api?:VisionApi;
 example:boolean;
 onClose:()=>void;
 onPreviewSaved?:(title:string,offer:StoreOffer)=>void;
}){
 const [dreams,setDreams]=useState<VisionDreamDto[]>([]);
 const [chosen,setChosen]=useState('new');
 const [title,setTitle]=useState('');
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 useEffect(()=>{
  if(example)return;
  if(!api){setError('Sign in to save to a real Vision.');return;}
  let active=true;setLoading(true);setError('');
  void api.dreams.mine().then(items=>{
   if(active){setDreams(items.filter(item=>!item.superseded&&!item.locked));setLoading(false);}
  }).catch(()=>{if(active){setError('Your saved Visions could not be loaded.');setLoading(false);}});
  return()=>{active=false;};
 },[api,example]);

 async function save(){
  if(busy)return;
  setError('');setSuccess('');
  if(chosen==='new'&&!title.trim()){setError('Give your Vision a short name or reference.');return;}
  if(example){
   onPreviewSaved?.(chosen==='new'?title.trim():chosen,offer);
   setSuccess('Example saved locally for this preview only. Nothing was saved to SecurePay.');
   return;
  }
  if(!api){setError('Sign in to save this item in your private Vision.');return;}
  setBusy(true);
  try{
   let id=chosen;
   if(chosen==='new'){
    const creator=createVisionDreamController(api.dreams as VisionDreamGateway,api.agent);
    const newDream=await creator.start(title.trim());
    if(!newDream){throw new Error(creator.getSnapshot().error||'Could not create the new Vision. Review your existing work before retrying.');}
    id=newDream.dreamId;
   }
   setSuccess(await saveStoreOfferToDream(api,id,offer));
  }catch(e){setError(e instanceof Error?e.message:'Store item was not confirmed saved.');}
  finally{setBusy(false);}
 }

 return <div className="fixed inset-0 z-[95] flex items-center justify-center bg-forest-950/40 p-3" data-store-save-vision>
  <section role="dialog" aria-modal="true" aria-label="Save Store item to Vision" className="w-full max-w-md space-y-3 rounded-2xl border border-cream-200 bg-white p-4 shadow-2xl sm:p-5">
   <div className="flex items-start justify-between gap-3">
    <div><p className="text-xs font-semibold uppercase tracking-wide text-forest-700">Save to Vision</p><h2 className="font-display text-lg text-forest-900">{offer.title}</h2><p className="mt-1 text-xs text-sand-600">{offer.storeName} · Source listing only</p></div>
    <button type="button" onClick={onClose} aria-label="Close Vision picker" className="flex size-10 items-center justify-center rounded-lg hover:bg-cream-50"><X size={18}/></button>
   </div>
   <p className="text-sm text-sand-700">Where does this item belong? It can sit alongside your photos, plans and notes until you decide what to do with it.</p>
   {example?<p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Preview only. No private Vision will be created on the server.</p>:loading?<p role="status" className="text-xs">Finding your Visions…</p>:null}
   <label className="block text-xs font-semibold text-forest-800">Choose a Vision
    <select value={chosen} onChange={event=>setChosen(event.target.value)}
      className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 bg-white px-3 text-sm">
      <option value="new">+ Name a new Vision</option>
      {dreams.map(dream=><option key={dream.dreamId} value={dream.dreamId}>{dream.title}</option>)}
    </select>
   </label>
   {chosen==='new'&&<label className="block text-xs font-semibold text-forest-800">Vision name or reference
     <input value={title} onChange={event=>setTitle(event.target.value)} maxLength={140} placeholder="e.g. My family home"
       className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm"/>
   </label>}
   {error&&<p role="alert" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{error}</p>}
   {success&&<p role="status" className="rounded-lg bg-forest-50 p-2 text-xs text-forest-800">{success}</p>}
   <div className="flex gap-2">
    <button type="button" disabled={busy||loading||!!success} onClick={()=>void save()}
      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-forest-800 px-3 text-sm font-semibold text-white disabled:opacity-40"><BookmarkPlus size={16}/>{busy?'Saving…':'Save item'}</button>
    <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-forest-200 px-3 text-xs">Done</button>
   </div>
  </section>
 </div>;
}
