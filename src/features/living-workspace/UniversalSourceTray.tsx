import { useEffect, useRef, useState } from 'react';
import { Camera, FileText, MapPin, ShieldCheck, Trash2 } from 'lucide-react';

type Intake='Photos'|'Documents'|'Places';
type LocalSource={id:number;kind:Intake;filename:string;label:string;mime:string|null;size:number|null;thumbnail:string|null};
const MAX_BYTES=2_000_000;
const nextId=(()=>{let id=1;return()=>id++;})();

/** Local-only intake preview. A file selected here has NOT been sent to KS001,
 * uploaded, interpreted or admitted as Agreement/Community evidence. The
 * canonical source menu and authenticated document/photo services are a
 * separate future integration, never replaced by a simulated attachment.
 */
export function UniversalSourceTray({tool,area,isDemo}:{tool:string;area:string;isDemo:boolean}) {
  const supported=tool==='Photos'||tool==='Documents'||tool==='Places';
  const [items,setItems]=useState<LocalSource[]>([]);
  const [label,setLabel]=useState('');
  const [caption,setCaption]=useState('');
  const [error,setError]=useState<string|null>(null);
  const [pending,setPending]=useState<{filename:string;mime:string|null;size:number;thumbnail:string|null}|null>(null);
  const [confirmation,setConfirmation]=useState<string|null>(null);
  const upload=useRef<HTMLInputElement|null>(null);
  const seq=useRef(0);
  useEffect(()=>{setItems([]);setCaption('');setLabel('');setError(null);setPending(null);setConfirmation(null);seq.current++;},[area,tool,isDemo]);

  function receive(file:File|undefined) {
    if(!file)return;
    setError(null);setConfirmation(null);setPending(null);
    const photo=tool==='Photos';
    const allowed=photo ? file.type.startsWith('image/') : (
      file.type==='application/pdf'||file.type==='text/plain'||file.type==='text/csv'||
      file.name.toLowerCase().endsWith('.docx')||file.name.toLowerCase().endsWith('.xlsx'));
    if(!allowed){setError('Choose a supported '+(photo?'image':'document')+' format. No file has been uploaded.');return;}
    if(file.size>MAX_BYTES){setError('Local preview supports files up to 2 MB. The original file has not been uploaded or altered.');return;}
    const sequence=seq.current;
    const prepare=(thumbnail:string|null)=>{
      if(seq.current!==sequence)return;
      setPending({filename:file.name,mime:file.type||null,size:file.size,thumbnail});
    };
    if(!photo){prepare(null);return;}
    const reader=new FileReader();
    reader.onerror=()=>{if(seq.current===sequence)setError('Could not preview this picture; it has not been uploaded.');};
    reader.onload=()=>prepare(typeof reader.result==='string'?reader.result:null);
    reader.readAsDataURL(file);
  }

  function saveLocalPreview(){
    if(!pending)return;
    setItems(current=>[...current,{id:nextId(),kind:tool==='Photos'?'Photos':'Documents',
      filename:pending.filename,label:caption.trim(),mime:pending.mime,size:pending.size,thumbnail:pending.thumbnail}]);
    setConfirmation((tool==='Photos'?'Photo':'Document')+' added to this preview. Not uploaded or saved to SecurePay.');
    setPending(null);setCaption('');setError(null);
  }

  function addPlace(){
    const value=label.trim();
    if(!value)return;
    setItems(current=>[...current,{id:nextId(),kind:'Places',filename:value,label:caption.trim(),
      mime:null,size:null,thumbnail:null}]);
    setLabel('');setCaption('');setError(null);setConfirmation('Place added to this preview. Not saved to SecurePay.');
  }
  if(!supported)return null;
  return <section aria-label={tool+' source intake'} data-universal-source-tray className="space-y-3">
    <p className="text-xs uppercase tracking-wider text-sand-600">{tool} · {area}</p>
    <h3 className="font-semibold text-sm">Add a {tool==='Photos'?'photo':tool==='Documents'?'document':'place'}</h3>
    <p className="text-xs text-sand-700">Collect the material first. You decide its caption and relevance. A preview is not an uploaded file, a verified fact or evidence accepted by any Agreement.</p>
    {tool==='Places'?<>
      <label className="block text-xs">Place or address
        <input maxLength={240} className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white p-3" value={label}
          onChange={event=>setLabel(event.target.value)} placeholder="e.g. Delivery location, Nairobi"/></label>
    </>:<>
      <input ref={upload} type="file" className="hidden"
        accept={tool==='Photos'?'image/jpeg,image/png,image/webp,image/heic':'application/pdf,text/plain,text/csv,.docx,.xlsx'}
        onChange={event=>{receive(event.target.files?.[0]);event.target.value='';}}/>
      <button type="button" onClick={()=>upload.current?.click()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cream-200 bg-white p-3 text-sm">
        {tool==='Photos'?<Camera size={18}/>:<FileText size={18}/>} Select from this device
      </button>
      <p className="text-xs text-sand-600">Up to 2 MB for local preview. No file is uploaded to SecurePay.</p>
      {pending&&<div aria-label="Photo or document ready to add" className="rounded-xl border border-cream-200 bg-white p-3">
        {pending.thumbnail&&<img src={pending.thumbnail} alt={'Preview of '+pending.filename} className="mb-3 max-h-64 w-full rounded-lg object-contain"/>}
        <p className="break-all text-sm font-semibold">{pending.filename}</p>
        <p className="mt-1 text-xs text-sand-600">Ready to add to this preview · Not yet added</p>
      </div>}
    </>}
    <label className="block text-xs">Caption or purpose (optional)
      <textarea rows={2} maxLength={500} className="mt-1 block w-full rounded-xl border border-cream-200 bg-white p-3"
        placeholder="Why is this relevant to your work?" value={caption} onChange={event=>setCaption(event.target.value)}/></label>
    {tool!=='Places'&&<button type="button" disabled={!pending} onClick={saveLocalPreview} className="min-h-11 w-full rounded-xl bg-forest-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Add {tool==='Photos'?'photo':'document'} to preview</button>}
    {confirmation&&<p role="status" className="rounded-xl border border-cream-200 bg-cream-100 p-3 text-sm font-medium text-forest-800">✓ {confirmation}</p>}
    {tool==='Places'&&<button type="button" disabled={!label.trim()} onClick={addPlace}
      className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white disabled:opacity-40">Add place to local preview</button>}
    {error&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs">{error}</p>}
    {items.length>0&&<div aria-label="Locally staged sources" className="space-y-2">
      <p className="text-xs font-semibold">Local previews · Not uploaded ({items.length})</p>
      {items.map(item=><article key={item.id} className="rounded-xl border border-cream-200 bg-white p-3">
        {item.thumbnail && <img src={item.thumbnail} alt={'Local preview of '+item.filename}
          className="mb-2 max-h-36 w-full rounded-lg object-contain" />}
        <div className="flex items-center justify-between gap-2"><p className="break-all text-xs font-semibold">{item.filename}</p>
          <button type="button" aria-label={'Remove '+item.filename} onClick={()=>{setItems(current=>current.filter(s=>s.id!==item.id));setConfirmation(null);}}
            className="min-h-11 min-w-11 rounded-lg bg-cream-100 p-2"><Trash2 size={16}/></button></div>
        {item.label&&<p className="mt-1 text-xs text-sand-700">{item.label}</p>}
        <p className="mt-1 text-xs text-sand-600">Selected locally · No upload · Unverified</p>
      </article>)}
      <button type="button" onClick={()=>{seq.current++;setItems([]);setPending(null);setConfirmation(null);}} className="min-h-11 rounded-lg bg-cream-100 px-3 text-xs">Clear local previews</button>
    </div>}
    <p className="flex gap-2 text-xs text-sand-600"><ShieldCheck size={15} className="shrink-0"/>
      {isDemo?'Demo mode never sends these sources anywhere.':'Real sign-in does not automatically authorise sharing. These staged materials are not yet transmitted to SecurePay.'}
    </p>
  </section>;
}
