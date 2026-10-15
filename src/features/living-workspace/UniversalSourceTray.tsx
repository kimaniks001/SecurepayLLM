import { useEffect, useRef, useState } from 'react';
import { Camera, FileText, ShieldCheck, Trash2 } from 'lucide-react';
import type { AgentGateway } from '../../api/securepay/agent';
import type { AgentSourceArtifactDto } from '../../api/securepay/agent/dto';
import jsQR from 'jsqr';
import type { VisionDreamGateway } from '../../api/securepay/visiondreams';
import type { VisionDreamDto } from '../../api/securepay/visiondreams/dto';
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
function suggestPhotoActions(source:AgentSourceArtifactDto):Array<{id:string;label:string}>{
  const summary=(source.summary+' '+source.documentType).toLowerCase();
  if(/receipt|payment slip|till/.test(summary))return [{id:'receipt',label:'Process receipt'},{id:'contract',label:'Use in Agreement'},{id:'ask',label:'Ask KS001'},{id:'correct',label:'Not this'}];
  if(/invoice|bill/.test(summary))return [{id:'invoice',label:'Review invoice'},{id:'contract',label:'Prepare Agreement'},{id:'ask',label:'Ask KS001'},{id:'correct',label:'Not this'}];
  if(/delivery|damag|package|inspection/.test(summary))return [{id:'delivery',label:'Record delivery'},{id:'contract',label:'Use as evidence'},{id:'ask',label:'Ask KS001'},{id:'correct',label:'Not this'}];
  if(/quotation|quote|estimate/.test(summary))return [{id:'contract',label:'Prepare Quick Contract'},{id:'invoice',label:'Extract prices'},{id:'ask',label:'Ask KS001'},{id:'correct',label:'Not this'}];
  if(/product|design|idea|inspiration|furniture|building|room|equipment/.test(summary))return [{id:'vision',label:'Add to Vision'},{id:'find',label:'Find similar'},{id:'ask',label:'Ask KS001'},{id:'correct',label:'Not this'}];
  return [{id:'vision',label:'Add to Vision'},{id:'contract',label:'Prepare Agreement'},{id:'ask',label:'Ask KS001'},{id:'correct',label:'Not this'}];
}
const MAX_BYTES=2_000_000;
const PHOTO_MIME_TYPES=['image/jpeg','image/png'] as const; // Match canonical KS001 source ingestion.
const nextId=(()=>{let id=1;return()=>id++;})();

/** Photo selection explicitly sends to canonical KS001 in real mode; demo stays local.
 * A processed source is not evidence accepted by an Agreement or Money authority.
 */
export function UniversalSourceTray({tool,area,isDemo,gateway,conversationId,onContinueTask,onEnsureConversation,dreamsGateway,ensureSignedIn}:{tool:string;area:string;isDemo:boolean;gateway?:AgentGateway;conversationId?:string|null;dreamsGateway?:VisionDreamGateway;ensureSignedIn?:()=>Promise<void>;onEnsureConversation?:()=>Promise<string>;onContinueTask?:(source:AgentSourceArtifactDto,task:string)=>Promise<void>}) {
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

  const upload=useRef<HTMLInputElement|null>(null);
  const camera=useRef<HTMLInputElement|null>(null);
  const pendingFile=useRef<File|null>(null);
  const [uploadState,setUploadState]=useState<'idle'|'uploading'|'confirmed'|'unknown'|'error'>('idle');
  const [uploadMessage,setUploadMessage]=useState('');
  const [serverSource,setServerSource]=useState<AgentSourceArtifactDto|null>(null);
  const [taskBusy,setTaskBusy]=useState(false);
  const [visionChooser,setVisionChooser]=useState(false);
  const [visions,setVisions]=useState<VisionDreamDto[]>([]);
  const [visionPhase,setVisionPhase]=useState<'idle'|'loading'|'saving'|'saved'|'error'>('idle');
  const [visionMessage,setVisionMessage]=useState('');
  const [newVisionTitle,setNewVisionTitle]=useState('');

  const seq=useRef(0);
  useEffect(()=>{setItems([]);setCaption('');setLabel('');setError(null);setPending(null);setConfirmation(null);setSelectedTask('');setQrValue(null);setQrState(null);pendingFile.current=null;setUploadState('idle');setUploadMessage('');setServerSource(null);setVisionChooser(false);setVisionPhase('idle');seq.current++;},[area,tool,isDemo]);

  function receive(file:File|undefined) {
    if(!file)return;
    setError(null);setConfirmation(null);setPending(null);setSelectedTask('');pendingFile.current=null;setUploadState('idle');setUploadMessage('');setQrValue(null);setQrState(null);setVisionChooser(false);setVisionPhase('idle');
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
      if(photo && gateway && !isDemo) void uploadToKs001(file);
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

  async function uploadToKs001(file:File|null=pendingFile.current){
    if(!gateway || isDemo || !file || uploadState==='uploading')return;
    setUploadState('uploading');setUploadMessage('SecurePay is receiving the photo…');
    try{
      const targetConversationId=conversationId ?? await onEnsureConversation?.();
      if(!targetConversationId)throw new Error('No KS001 conversation');
      let source=await gateway.uploadSource(targetConversationId,'PHOTO',file);
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
            if(latest.sourceArtifactId!==source.sourceArtifactId || latest.conversationId!==targetConversationId)break;
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

  async function openVisionChooser(){
    if(!dreamsGateway||!ensureSignedIn||!pendingFile.current){setVisionMessage('Sign in to save a photo to your Vision.');setVisionPhase('error');return;}
    setVisionChooser(true);setVisionPhase('loading');setVisionMessage('');
    try{
      await ensureSignedIn();
      const list=await dreamsGateway.mine();
      setVisions(list.filter(dream=>!dream.superseded));
      setVisionPhase('idle');
    }catch{
      setVisionPhase('error');setVisionMessage('Could not load your Visions. Check your sign-in and try again.');
    }
  }

  async function saveToVision(dreamId:string){
    if(!dreamsGateway||!pendingFile.current||!ensureSignedIn)return;
    setVisionPhase('saving');setVisionMessage('Adding photo to your Vision…');
    try{
      await ensureSignedIn();
      const owned=await dreamsGateway.get(dreamId);
      if(owned.dreamId!==dreamId||owned.superseded)throw new Error('Vision unavailable');
      const file=pendingFile.current;
      const bytes=new Uint8Array(await file.arrayBuffer());
      let binary='';
      for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      const result=await dreamsGateway.uploadAsset(dreamId,{fileName:file.name,mimeType:file.type,base64Content:btoa(binary),idempotencyKey:crypto.randomUUID()});
      if(result.dreamId!==dreamId||!result.assetId)throw new Error('Save not confirmed');
      setVisionPhase('saved');setVisionMessage('Photo saved to '+owned.title+'. Open your Vision to place it on your board.');
    }catch{
      setVisionPhase('error');setVisionMessage('SecurePay could not confirm the photo was saved. Check your Vision before retrying.');
    }
  }

  async function createVisionAndSave(){
    if(!gateway||!dreamsGateway||!ensureSignedIn||!newVisionTitle.trim())return;
    setVisionPhase('saving');setVisionMessage('Creating your Vision…');
    try{
      await ensureSignedIn();
      // A Dream claims its own newly created conversation; never claim or modify the photo's Agreement conversation.
      const created=await gateway.createConversation();
      if(!created.conversationId)throw new Error('Conversation unavailable');
      const dream=await dreamsGateway.create({conversationId:created.conversationId,title:newVisionTitle.trim(),initialThought:'A new Vision inspired by an uploaded photo.'});
      await saveToVision(dream.dreamId);
    }catch{
      setVisionPhase('error');setVisionMessage('Could not confirm the new Vision. Check your Visions before trying again.');
    }
  }

  function saveLocalPreview(){
    if(!pending)return;
    setItems(current=>[...current,{id:nextId(),kind:tool==='Photos'?'Photos':'Documents',
      filename:pending.filename,label:[caption.trim(),selectedTask?('Requested task: '+PHOTO_TASKS.find(t=>t.id===selectedTask)?.label):''].filter(Boolean).join(' · '),mime:pending.mime,size:pending.size,thumbnail:pending.thumbnail}]);
    setConfirmation((tool==='Photos'?'Photo':'Document')+' added to this preview. Not uploaded or saved to SecurePay.');
    setPending(null);setCaption('');setSelectedTask('');setQrValue(null);setQrState(null);setError(null);
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
    <p className="text-xs text-sand-700">{tool==='Photos'?'Add a photo. KS001 will read it and suggest what you can do next.': 'Add what you have. SecurePay will help you make sense of it.'}</p>
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
      <p className="text-xs text-sand-600">JPEG or PNG · up to 2 MB. Selecting a photo sends it to KS001 for understanding in real mode.</p>
      {pending&&<div aria-label="Photo or document ready to add" className="rounded-xl border border-cream-200 bg-white p-3">
        {pending.thumbnail&&<img src={pending.thumbnail} alt={'Preview of '+pending.filename} className="mb-3 max-h-64 w-full rounded-lg object-contain"/>}
        <p className="break-all text-sm font-semibold">{pending.filename}</p>
        <p className="mt-1 text-xs text-sand-600">{isDemo?'Local preview only':uploadState==='uploading'?'Reading photo…':serverSource?'Received by SecurePay':'Preparing photo…'}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {tool==='Photos'&&<button type="button" disabled={uploadState==='uploading'} onClick={()=>{
            if(!pending)return;
            setItems(current=>[...current,{id:nextId(),kind:'Photos',filename:pending.filename,label:serverSource?'SecurePay source: '+serverSource.sourceArtifactId:'Local photo',mime:pending.mime,size:pending.size,thumbnail:pending.thumbnail}]);
            setPending(null);pendingFile.current=null;setServerSource(null);setUploadState('idle');setUploadMessage('');setQrValue(null);setQrState(null);setVisionChooser(false);
            upload.current?.click();
          }} className="min-h-11 rounded-full bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-40">+ Add photo</button>}
          <button type="button" disabled={uploadState==='uploading'} onClick={()=>{upload.current?.click();}} className="min-h-11 rounded-full border border-cream-200 px-4 text-sm disabled:opacity-40">Choose another photo</button>
        </div>
      </div>}
    </>}
    {tool!=='Photos'&&<label className="block text-xs">Caption or purpose (optional)
      <textarea rows={2} maxLength={500} className="mt-1 block w-full rounded-xl border border-cream-200 bg-white p-3" value={caption} onChange={event=>setCaption(event.target.value)}/>
    </label>}
    {tool==='Photos'&&pending&&uploadState==='confirmed'&&<label className="block text-xs text-sand-600">
      Add a note (optional)
      <input className="mt-1 min-h-10 w-full rounded-xl border border-cream-200 px-3" placeholder="Anything KS001 should know?" value={caption} onChange={event=>setCaption(event.target.value)} maxLength={500}/>
    </label>}
    {tool!=='Places'&&(isDemo||!gateway)&&<button type="button" disabled={!pending} onClick={saveLocalPreview} className="min-h-11 w-full rounded-xl bg-forest-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Add {tool==='Photos'?'photo':'document'} to preview</button>}
    {tool==='Photos'&&pending&&!isDemo&&<div className="space-y-2">
      {uploadState==='uploading'&&<p role="status" className="text-sm font-medium">KS001 is reading your photo…</p>}
      {(uploadState==='error'||uploadState==='unknown')&&<button type="button" onClick={()=>void uploadToKs001()} className="min-h-11 rounded-xl border border-cream-200 bg-white px-3 text-sm">Try again</button>}
      {uploadMessage&&<p role="status" className="rounded-xl bg-cream-100 p-3 text-xs">{uploadMessage}</p>}
      {serverSource&&<button type="button" onClick={()=>void inspectQr()} className="min-h-10 rounded-full border border-cream-200 px-3 text-xs">Read a QR code in this photo</button>}
      {qrState&&<p role="status" className="text-xs">{qrState}</p>}
      {qrValue&&<div className="break-all rounded-lg border border-cream-200 p-3 text-xs"><strong>QR contains:</strong> {qrValue}<p>Unverified. No links or payments were opened.</p></div>}
      {serverSource&&<section aria-label="SecurePay source result" className="space-y-2 rounded-xl border border-cream-200 p-3">
        <p className="text-sm font-semibold">{['READY','PARTIAL'].includes(serverSource.extractionStatus)?'Here’s what I found':serverSource.extractionStatus==='FAILED'?'Could not read this photo':'Still reading your photo'}</p>
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
        {onContinueTask&&['READY','PARTIAL'].includes(serverSource.extractionStatus)&&<>
          <p className="text-sm font-semibold">What would you like to do?</p>
          <div className="flex flex-wrap gap-2" aria-label="Suggested answers">
            {suggestPhotoActions(serverSource).map(task=><button key={task.id} type="button" disabled={taskBusy}
              onClick={async()=>{if(task.id==='vision'){await openVisionChooser();return;}if(task.id==='qr'){await inspectQr();return;}setTaskBusy(true);try{await onContinueTask(serverSource,task.id);}catch{setUploadMessage('KS001 could not continue just now. Your source is retained.');}finally{setTaskBusy(false);}}}
              className="min-h-11 rounded-full border border-forest-300 bg-white px-4 py-2 text-sm font-medium text-forest-800 hover:bg-forest-50 disabled:opacity-50">
              {task.label}
            </button>)}
          </div>
          {/(deliver|damage|inspect|disput|evidence)/i.test(serverSource.summary||'')&&<p className="text-xs text-sand-600">Using this as evidence? Camera location can help for future photos. Sharing location is optional; GPS alone is not proof.</p>}
          {visionChooser&&<div className="space-y-2 rounded-xl border border-cream-200 bg-cream-50 p-3" aria-label="Choose a Vision">
            <p className="text-sm font-semibold">Add this photo to a Vision</p>
            {visionPhase==='loading'&&<p role="status" className="text-xs">Finding your Visions…</p>}
            {visionPhase!=='loading'&&visionPhase!=='saved'&&<div className="space-y-2">
              {visions.map(dream=><button key={dream.dreamId} type="button" disabled={visionPhase==='saving'} onClick={()=>void saveToVision(dream.dreamId)}
                className="min-h-11 w-full rounded-lg border border-cream-200 bg-white px-3 text-left text-sm disabled:opacity-50">{dream.title}</button>)}
              {visions.length===0&&<p className="text-xs text-sand-600">No existing Visions found. Start a new one below.</p>}
              <label className="block text-xs">New Vision name
                <input className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 bg-white px-3" value={newVisionTitle} maxLength={120} onChange={e=>setNewVisionTitle(e.target.value)} placeholder="e.g. My new workshop"/>
              </label>
              <button type="button" disabled={visionPhase==='saving'||!newVisionTitle.trim()} onClick={()=>void createVisionAndSave()}
                className="min-h-11 rounded-full bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-50">Create new Vision</button>
            </div>}
            {visionMessage&&<p role="status" className="text-xs">{visionMessage}</p>}
          </div>}
          <p className="text-xs text-sand-600">KS001’s reading may contain errors. You will review material terms before any Agreement, invitation or Money action.</p>
        </>}
      </section>}
    </div>}
    {confirmation&&<p role="status" className="rounded-xl border border-cream-200 bg-cream-100 p-3 text-sm font-medium text-forest-800">✓ {confirmation}</p>}
    {tool==='Places'&&<button type="button" disabled={!label.trim()} onClick={addPlace}
      className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white disabled:opacity-40">Add place to local preview</button>}
    {error&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs">{error}</p>}
    {items.length>0&&<div aria-label="Locally staged sources" className="space-y-2">
      <p className="text-xs font-semibold">Earlier photos and local previews ({items.length})</p>
      {items.map(item=><article key={item.id} className="rounded-xl border border-cream-200 bg-white p-3">
        {item.thumbnail && <img src={item.thumbnail} alt={'Local preview of '+item.filename}
          className="mb-2 max-h-36 w-full rounded-lg object-contain" />}
        <div className="flex items-center justify-between gap-2"><p className="break-all text-xs font-semibold">{item.filename}</p>
          <button type="button" aria-label={'Remove '+item.filename} onClick={()=>{setItems(current=>current.filter(s=>s.id!==item.id));setConfirmation(null);}}
            className="min-h-11 min-w-11 rounded-lg bg-cream-100 p-2"><Trash2 size={16}/></button></div>
        {item.label&&<p className="mt-1 text-xs text-sand-700">{item.label}</p>}
        <p className="mt-1 text-xs text-sand-600">{item.kind==='Photos'&&item.label.startsWith('SecurePay source:')?'Received as a separate KS001 source · Not Agreement evidence':'Selected locally · Unverified'}</p>
      </article>)}
      <button type="button" onClick={()=>{seq.current++;setItems([]);setPending(null);setConfirmation(null);}} className="min-h-11 rounded-lg bg-cream-100 px-3 text-xs">Clear local previews</button>
    </div>}
    <p className="flex gap-2 text-xs text-sand-600"><ShieldCheck size={15} className="shrink-0"/>
      {isDemo?'Demo mode never sends these sources anywhere.':'Real sign-in does not automatically authorise sharing. These staged materials are not yet transmitted to SecurePay.'}
    </p>
  </section>;
}
