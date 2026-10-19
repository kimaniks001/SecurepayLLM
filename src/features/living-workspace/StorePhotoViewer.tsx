import { useEffect, useState, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Images, Maximize2, Minus, Plus, X } from 'lucide-react';

/** Show only source-provided images. Unavailable photos retain an honest placeholder. */
export type StoreImage={src:string|null;title:string};
export function StorePhoto({images,index=0,className='',sample=false}:{
 images:readonly StoreImage[];index?:number;className?:string;sample?:boolean;
}){
 const [open,setOpen]=useState(false);
 const [current,setCurrent]=useState(index);
 const [scale,setScale]=useState(1);
 const [failed,setFailed]=useState<Record<string,boolean>>({});
 const [pinch,setPinch]=useState<number|null>(null);
 const item=images[current]??images[index]??{src:null,title:'Store photo'};
 const usable=(x:StoreImage)=>Boolean(x.src&&!failed[x.src]);
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';
   const key=(e:KeyboardEvent)=>{
     if(!['Escape','ArrowLeft','ArrowRight'].includes(e.key))return;
     // Consume modal keys before the Workspace's Escape-to-close-shelf handler.
     e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
     if(e.key==='Escape')setOpen(false);
     if(e.key==='ArrowLeft'&&images.length>1)move(-1);
     if(e.key==='ArrowRight'&&images.length>1)move(1);
   };
   window.addEventListener('keydown',key,true);
   return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',key,true)};
 },[open,images.length]);
 function move(delta:number){setCurrent(i=>(i+delta+images.length)%images.length);setScale(1);}
 const touch=(e:TouchEvent)=>{if(e.touches.length===2){const a=e.touches[0],b=e.touches[1];const distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
   if(pinch!==null&&pinch>0)setScale(v=>Math.max(1,Math.min(5,v*distance/pinch)));setPinch(distance);
 }else setPinch(null);};
 const thumbnail=images[index]??{src:null,title:'Store photo'};
 return <>
   <button type="button" className={'group relative block overflow-hidden bg-gradient-to-br from-cream-100 to-forest-100 '+className}
      aria-label={'Enlarge '+thumbnail.title} onClick={()=>{setCurrent(index);setScale(1);setOpen(true);}}>
     {usable(thumbnail)?<img src={thumbnail.src!} alt={thumbnail.title} loading="lazy" className="h-full w-full object-cover"
       onError={()=>setFailed(v=>({...v,[thumbnail.src!]:true}))}/>:<span className="flex h-full items-center justify-center gap-2 px-2 text-center text-xs text-sand-700"><Images size={20}/> {sample?'Sample image unavailable':'No authorised photo available'}</span>}
     <span className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-forest-900"><Maximize2 size={15}/></span>
     {sample&&<span className="absolute bottom-1 right-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-forest-900">SAMPLE</span>}
   </button>
   {open&&typeof document!=='undefined'&&createPortal(<div role="dialog" aria-modal="true" aria-label={'Photo preview: '+item.title}
      className="fixed inset-0 z-[9999] flex flex-col bg-black/95 text-white" data-store-lightbox>
     <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
       <p className="min-w-0 truncate text-sm">{item.title}{sample?' · sample photograph':''}</p>
       <button type="button" autoFocus onClick={()=>setOpen(false)} aria-label="Close photo preview" className="min-h-11 min-w-11 rounded-lg bg-white/15 p-3"><X size={18}/></button>
     </div>
     <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3" onTouchMove={touch} onTouchEnd={()=>setPinch(null)}
       style={{touchAction:'pinch-zoom'}}>
       {usable(item)?<img src={item.src!} alt={item.title} onError={()=>setFailed(v=>({...v,[item.src!]:true}))}
         className="max-h-full max-w-full select-none object-contain" draggable={false}
         style={{transform:'scale('+scale+')',transformOrigin:'center'}}
         onDoubleClick={()=>setScale(v=>v===1?2:1)}/>:<span className="text-sm">No photo is available for this item.</span>}
       {images.length>1&&<><button type="button" aria-label="Previous photo" onClick={()=>move(-1)} className="absolute left-2 top-1/2 min-h-11 min-w-11 rounded-full bg-black/60 p-3"><ChevronLeft/></button>
         <button type="button" aria-label="Next photo" onClick={()=>move(1)} className="absolute right-2 top-1/2 min-h-11 min-w-11 rounded-full bg-black/60 p-3"><ChevronRight/></button></>}
     </div>
     <div className="flex shrink-0 items-center justify-center gap-3 p-3">
       <button type="button" aria-label="Zoom out" onClick={()=>setScale(v=>Math.max(1,v-0.5))} className="min-h-11 min-w-11 rounded-lg bg-white/15 p-3"><Minus/></button>
       <span className="text-xs">{Math.round(scale*100)}% · Pinch to zoom · {current+1} / {images.length}</span>
       <button type="button" aria-label="Zoom in" onClick={()=>setScale(v=>Math.min(5,v+0.5))} className="min-h-11 min-w-11 rounded-lg bg-white/15 p-3"><Plus/></button>
     </div>
   </div>,document.body)}
 </>;
}
