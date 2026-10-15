import { useEffect, useRef, useState } from 'react';
import { Camera, FileText, MapPin, ShieldCheck, Trash2 } from 'lucide-react';
import type { AgentGateway } from '../../api/securepay/agent';
import type { AgentSourceArtifactDto } from '../../api/securepay/agent/dto';
import jsQR from 'jsqr';
import { isOutcomeUnknown, sourceIngestionErrorText } from '../sources/controller';

type Intake='Photos'|'Documents'|'Places';
type LocalSource={id:number;kind:Intake;filename:string;label:string;mime:string|null;size:number|null;thumbnail:string|null};
const PHOTO_TASKS=[
  {id:'contract',label:'Quick Contract',hint:'Extract parties, work and terms to review'},
  {id:'qr',label:'Read QR code',hint:'Decode and inspect what the code contains'},
  {id:'receipt',label:'Process receipt',hint:'Extract items and payment information'},
  {id:'invoice',label:'Process invoice',hint:'Review supplier, amounts and terms'},
  {id:'delivery',label:'Record delivery',hint:'Document arrival, damage or missing items'},
  {id:'location',label:'Identify location',hint:'Review available location clues'},
  {id:'find',label:'Find similar items',hint:'Explore products and suppliers'},
  {id:'vision',label:'Add to Vision',hint:'Use this photo as project inspiration'},
] as const;
const MAX_BYTES=2_000_000;
const PHOTO_MIME_TYPES=['image/jpeg','image/png'] as const; // Match canonical KS001 source ingestion.
const nextId=(()=>{let id=1;return()=>id++;})();

/** Local-only intake preview. A file selected here has NOT been sent to KS001,
 * uploaded, interpreted or admitted as Agreement/Community evidence. The
 * canonical source menu and authenticated document/photo services are a
 * separate future integration, never replaced by a simulated attachment.
 */
export function UniversalSourceTray({tool,area,isDemo,gateway,conversationId,onContinueTask,onEnsureConversation}:{tool:string;area:string;isDemo:boolean;gateway?:AgentGateway;conversationId?:string|null;onEnsureConversation?:()=>Promise<string>;onContinueTask?:(source:AgentSourceArtifactDto,task:string)=>Promise<void>}) {
  const supported=tool==='Photos'||tool==='Documents'||tool==='Places';
  const [items,setItems]=useState<LocalSource[]>([]);
  const [label,setLabel]=useState('');
  const [caption,setCaption]=useState('');
  const [error,setError]=useState<string|null>(null);
  const [pending,setPending]=useState<{filename:string;mime:string|null;size:number;thumbnail:string|null}|null>(null);
  const [confirmation,setConfirmation]=useState<string|null>(null);
  const [selectedTask,setSelectedTask]=useState<string>('');
  const [qrValue,setQrValue]=useState<string|null>(null);
  const [qrState,setQrState]=useState<string|null>(null);
  const [locationChoice,setLocationChoice]=useState<'unset'|'enabled'|'skipped'>('unset');
  const upload=useRef<HTMLInputElement|null>(null);
  const camera=useRef<HTMLInputElement|null>(null);
  const pendingFile=useRef<File|null>(null);
  const [uploadState,setUploadState]=useState<'idle'|'uploading'|'confirmed'|'unknown'|'error'>('idle');
  const [uploadMessage,setUploadMessage]=useState('');
  const [serverSource,setServerSource]=useState<AgentSourceArtifactDto|null>(null);
  const [taskBusy,setTaskBusy]=useState(false);
  const [reviewed,setReviewed]=useState(false);
  const seq=useRef(0);
  useEffect(()=>{setItems([]);setCaption('');setLabel('');setError(null);setPending(null);setConfirmation(null);setSelectedTask('');setQrValue(null);setQrState(null);setLocationChoice('unset');pendingFile.current=null;setUploadState('idle');setUploadMessage('');setServerSource(null);setReviewed(false);seq.current++;},[area,tool,isDemo]);

  function receive(file:File|undefined) {
    if(!file)return;
    setError(null);setConfirmation(null);setPending(null);setSelectedTask('');pendingFile.current=null;setUploadState('idle');setUploadMessage('');setQrValue(null);setQrState(null);setLocationChoice('unset');
    const photo=tool==='Photos';
    const allowed=photo ? PHOTO_MIME_TYPES.some(type=>type===file.type) : (
      file.type==='application/pdf'||file.type==='text/plain'||file.type==='text/csv'||
      file.name.toLowerCase().endsWith('.docx')||file.name.toLowerCase().endsWith('.xlsx'));
    if(!allowed){setError(photo?'Choose a JPEG or PNG photo. Other formats cannot yet be safely read by KS001. Nothing was uploaded.':'Choose a supported document format. Nothing was uploaded.');return;}
    if(file.size===0){setError('This file is empty. Choose another picture.');return;}
    if(file.size>MAX_BYTES){setError('Local preview supports files up to 2 MB. The original file has not been uploaded or altered.');return;}
    const sequence=seq.current;
    const prepare=(thumbnail:string|null)=>{
      if(seq.current!==sequence)return;
      pendingFile.current=file;
      setPending({filename:file.name,mime:file.type||null,size:file.size,thumbnail});
    };
    if(!photo){prepare(null);return;}
    const reader=new FileReader();
    reader.onerror=()=>{if(seq.current===sequence)setError('Could not preview this picture; it has not been uploaded.');};
    reader.onload=()=>prepare(typeof reader.result==='string'?reader.result:null);
    reader.readAsDataURL(file);
  }

  async function inspectQr(){
    if(!pending?.thumbnail)return;
    setQrState('Reading the QR code on this device…');setQrValue(null);
    try {
      type QRDetector={detect:(image:HTMLImageElement)=>Promise<Array<{rawValue:string}>>};
      const native=window as Window & {BarcodeDetector?:new (options:{formats:string[]})=>QRDetector};
      const picture=new Image();picture.src=pending.thumbnail;await picture.decode();
      let decoded:string|null=null;
      if(native.BarcodeDetector){
        try{decoded=(await new native.BarcodeDetector({formats:['qr_code']}).detect(picture))[0]?.rawValue ?? null;}catch{ /* Try the locally bundled decoder. */ }
      }
      if(!decoded){
        const canvas=document.createElement('canvas');
        canvas.width=picture.naturalWidth;canvas.height=picture.naturalHeight;
        if(canvas.width*canvas.height > 12_000_000){setQrState('This image is too large to scan safely. Try a smaller photo.');return;}
        const context=canvas.getContext('2d',{willReadFrequently:true});
        if(context){
          context.drawImage(picture,0,0);
          const pixels=context.getImageData(0,0,canvas.width,canvas.height);
          decoded=jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'})?.data ?? null;
        }
      }
      if(!decoded){setQrState('No readable QR code was found. Try a sharper picture.');return;}
      setQrValue(decoded.slice(0,2048));
      setQrState('QR decoded on this device. Review its contents before taking action.');
    }catch{setQrState('Unable to read this QR code. No link was opened and nothing was uploaded.');}
  }

  async function uploadToKs001(){
    if(!gateway || isDemo || !pendingFile.current || uploadState==='uploading')return;
    setUploadState('uploading');setUploadMessage('SecurePay is receiving the photo…');
    try{
      const targetConversationId=conversationId ?? await onEnsureConversation?.();
      if(!targetConversationId)throw new Error('No KS001 conversation');
      let source=await gateway.uploadSource(targetConversationId,'PHOTO',pendingFile.current,
        [caption.trim(),selectedTask?('Requested task: '+PHOTO_TASKS.find(t=>t.id===selectedTask)?.label):''].filter(Boolean).join(' · ')||undefined);
      if(!source.sourceArtifactId || source.conversationId!==targetConversationId)
        throw new Error('Unrecognised source receipt');
      setServerSource(source);
      // Authoritative results only. The backend may still be processing when the upload responds.
      if(['RECEIVED','PROCESSING'].includes(source.extractionStatus)){
        setUploadMessage('SecurePay received the photo and is reading it…');
        for(let attempt=0;attempt<3;attempt++){
          await new Promise<void>(resolve=>setTimeout(resolve,1500*(attempt+1)));
          try{
            const latest=await gateway.getSource(targetConversationId,source.sourceArtifactId);
            if(latest.sourceArtifactId!==source.sourceArtifactId || latest.conversationId!==conversationId)break;
            source=latest;setServerSource(source);
            if(!['RECEIVED','PROCESSING'].includes(source.extractionStatus))break;
          }catch{break;}
        }
      }
      setUploadState('confirmed');
      if(source.extractionStatus==='READY'||source.extractionStatus==='PARTIAL')
        setUploadMessage('Photo processed by SecurePay. Check the understanding and any uncertain details below before proceeding.');
      else if(source.extractionStatus==='FAILED')
        setUploadMessage('SecurePay received the photo but could not process it. Keep the original and try a clearer image.');
      else setUploadMessage('Photo received by SecurePay; understanding has not been confirmed yet. Reopen KS001 to review its source status.');
    }catch(error){
      if(isOutcomeUnknown(error)){
        setUploadState('unknown');
        setUploadMessage('SecurePay could not confirm this upload. It may still be processing. Check this conversation’s sources before retrying to avoid duplicates.');
      }else{
        setUploadState('error');
        setUploadMessage(sourceIngestionErrorText(error));
      }
    }
  }

  function saveLocalPreview(){
    if(!pending)return;
    setItems(current=>[...current,{id:nextId(),kind:tool==='Photos'?'Photos':'Documents',
      filename:pending.filename,label:[caption.trim(),selectedTask?('Requested task: '+PHOTO_TASKS.find(t=>t.id===selectedTask)?.label):''].filter(Boolean).join(' · '),mime:pending.mime,size:pending.size,thumbnail:pending.thumbnail}]);
    setConfirmation((tool==='Photos'?'Photo':'Document')+' added to this preview. Not uploaded or saved to SecurePay.');
    setPending(null);setCaption('');setSelectedTask('');setQrValue(null);setQrState(null);setLocationChoice('unset');setError(null);
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
        accept={tool==='Photos'?'image/jpeg,image/png':'application/pdf,text/plain,text/csv,.docx,.xlsx'}
        onChange={event=>{receive(event.target.files?.[0]);event.target.value='';}}/>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" onClick={()=>upload.current?.click()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cream-200 bg-white p-3 text-sm">
          {tool==='Photos'?<Camera size={18}/>:<FileText size={18}/>} Choose from device
        </button>
        {tool==='Photos'&&<>
          <input ref={camera} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={event=>{receive(event.target.files?.[0]);event.target.value='';}}/>
          <button type="button" onClick={()=>camera.current?.click()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cream-200 bg-white p-3 text-sm"><Camera size={18}/> Take a photo</button>
        </>}
      </div>
      <p className="text-xs text-sand-600">JPEG or PNG, up to 2 MB for a local preview. Saving to SecurePay is not connected here yet.</p>
      {pending&&<div aria-label="Photo or document ready to add" className="rounded-xl border border-cream-200 bg-white p-3">
        {pending.thumbnail&&<img src={pending.thumbnail} alt={'Preview of '+pending.filename} className="mb-3 max-h-64 w-full rounded-lg object-contain"/>}
        <p className="break-all text-sm font-semibold">{pending.filename}</p>
        <p className="mt-1 text-xs text-sand-600">Ready for your review · Not uploaded</p>
        <button type="button" onClick={()=>{setPending(null);pendingFile.current=null;setQrValue(null);setQrState(null);setSelectedTask('');setUploadState('idle');}} className="mt-2 min-h-11 rounded-lg border border-cream-200 px-3 text-xs">Choose another picture</button>
      </div>}
    </>}
    <label className="block text-xs">Caption or purpose (optional)
      <textarea rows={2} maxLength={500} className="mt-1 block w-full rounded-xl border border-cream-200 bg-white p-3"
        placeholder="Why is this relevant to your work?" value={caption} onChange={event=>setCaption(event.target.value)}/></label>
    {tool==='Photos'&&pending&&<div className="space-y-2 rounded-xl border border-cream-200 bg-cream-100 p-3">
      <p className="text-sm font-semibold">Is this photo for evidence?</p>
      <p className="text-xs text-sand-700">For deliveries, inspections or disputes, we recommend turning on camera location before taking your picture. It can help establish where a photo was taken. You can continue without it.</p>
      <p className="text-xs text-sand-700">Already took the photo? Its GPS information may be present, but this preview does not read or verify it. Your current browser location cannot prove where an earlier photo was taken.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={()=>setLocationChoice('enabled')} className="min-h-11 rounded-lg border border-cream-200 bg-white px-3 text-xs font-semibold">I'll enable camera location</button>
        <button type="button" onClick={()=>setLocationChoice('skipped')} className="min-h-11 rounded-lg border border-cream-200 bg-white px-3 text-xs">Continue without location</button>
      </div>
      {locationChoice!=='unset'&&<p role="status" className="text-xs font-semibold">{locationChoice==='enabled'?'Reminder noted. Enable location in your device camera settings before taking a new photo; SecurePay has not accessed your location.':'Location skipped. You can still use this photo; its evidence strength may be limited.'}</p>}
    </div>}
    {tool==='Photos'&&pending&&<fieldset className="space-y-2 rounded-xl border border-cream-200 p-3">
      <legend className="px-1 text-sm font-semibold">What do you want to do with this picture?</legend>
      <p className="text-xs text-sand-600">Choose a quick task. This records your intention only; no image analysis has run.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{PHOTO_TASKS.map(task=><label key={task.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${selectedTask===task.id?'border-forest-800 bg-forest-50':'border-cream-200'}`}>
        <input type="radio" name="photo-quick-task" value={task.id} checked={selectedTask===task.id} onChange={()=>setSelectedTask(task.id)} className="mt-1"/>
        <span><span className="block font-semibold">{task.label}</span><span className="block text-xs text-sand-600">{task.hint}</span></span>
      </label>)}</div>
    </fieldset>}
    {tool==='Photos'&&pending&&selectedTask==='qr'&&<div className="space-y-2 rounded-xl bg-cream-100 p-3">
      <button type="button" onClick={()=>void inspectQr()} className="min-h-11 rounded-lg bg-white px-4 text-sm font-semibold">Read QR on this device</button>
      {qrState&&<p role="status" className="text-xs">{qrState}</p>}
      {qrValue&&<div className="break-all rounded-lg bg-white p-3 text-sm"><strong>Code contains:</strong><p className="mt-2 whitespace-pre-wrap">{qrValue}</p><p className="mt-2 text-xs text-sand-600">Unverified content. Links and payments are never opened automatically.</p></div>}
    </div>}

    {tool!=='Places'&&(isDemo||!gateway)&&<button type="button" disabled={!pending} onClick={saveLocalPreview} className="min-h-11 w-full rounded-xl bg-forest-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Add {tool==='Photos'?'photo':'document'} to preview</button>}
    {tool==='Photos'&&pending&&!isDemo&&<div className="space-y-2">
      {gateway&&(conversationId||onEnsureConversation)?<button type="button" disabled={uploadState==='uploading'||uploadState==='confirmed'} onClick={()=>void uploadToKs001()} className="min-h-11 w-full rounded-xl border border-forest-800 bg-white px-4 py-3 text-sm font-semibold text-forest-800 disabled:opacity-40">Send photo to KS001</button>
        :<p className="rounded-lg bg-cream-100 p-3 text-xs">KS001 is unavailable for this workspace. You can still prepare a local preview.</p>}
      {uploadMessage&&<p role="status" className="rounded-xl bg-cream-100 p-3 text-xs">{uploadMessage}</p>}
      {serverSource&&<section aria-label="SecurePay source result" className="space-y-2 rounded-xl border border-cream-200 p-3">
        <p className="text-sm font-semibold">SecurePay source · {serverSource.extractionStatus}</p>
        <p className="text-xs text-sand-600">Reference: {serverSource.sourceArtifactId}</p>
        {serverSource.summary&&<p className="whitespace-pre-wrap text-sm">{serverSource.summary}</p>}
        {serverSource.uncertainties?.length>0&&<div className="text-xs"><strong>Needs checking</strong><ul className="mt-1 list-disc pl-4">{serverSource.uncertainties.map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
        {serverSource.acknowledgement&&<p className="text-xs text-sand-700">{serverSource.acknowledgement}</p>}
        {serverSource.extractionStatus==='FAILED'&&gateway&&<button type="button" disabled={uploadState==='uploading'} onClick={async()=>{
          setUploadState('uploading');setUploadMessage('SecurePay is retrying the existing photo source…');
          try{
            const retry=await gateway.retrySource(serverSource.conversationId,serverSource.sourceArtifactId);
            if(retry.sourceArtifactId!==serverSource.sourceArtifactId)throw new Error('Unexpected source');
            setServerSource(retry);setUploadState('confirmed');
            setUploadMessage(retry.extractionStatus==='FAILED'?'The photo is still unreadable. Try a clearer picture.':'SecurePay retried the same source. Review its updated processing status.');
          }catch{
            setUploadState('error');setUploadMessage('The retry could not be confirmed. The original photo source has not been removed.');
          }
        }} className="min-h-11 rounded-lg border border-cream-200 px-4 text-sm">Retry reading this photo</button>}
        <p className="text-xs text-sand-600">A source is not an accepted Agreement, verified receipt or authority to move money.</p>
        {onContinueTask&&selectedTask&&['READY','PARTIAL'].includes(serverSource.extractionStatus)&&<label className="flex min-h-11 items-center gap-2 rounded-lg bg-cream-100 p-3 text-sm"><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/> I have reviewed what SecurePay could read and what still needs checking. This is not Agreement acceptance.</label>}
        {onContinueTask&&selectedTask&&['READY','PARTIAL'].includes(serverSource.extractionStatus)&&<button type="button" disabled={taskBusy||!reviewed} onClick={async()=>{
          setTaskBusy(true);
          try{await onContinueTask(serverSource,selectedTask);}
          catch{setUploadMessage('Could not continue this quick task just now. Your uploaded source remains in SecurePay.');}
          finally{setTaskBusy(false);}
        }} className="min-h-11 w-full rounded-xl bg-forest-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">
          {taskBusy?'Opening KS001…':'Continue '+(PHOTO_TASKS.find(t=>t.id===selectedTask)?.label??'with KS001')}
        </button>}
      </section>}
    </div>}
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
