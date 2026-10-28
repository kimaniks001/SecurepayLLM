import { useEffect, useRef, useState } from 'react';
import { Camera, FileText, ImagePlus, Paperclip, RefreshCw, Trash2 } from 'lucide-react';
import type { CommunityGateway } from '../../api/securepay/community';
import type { CommunityMediaReceipt } from '../../api/securepay/community/dto';

export interface CommunityMediaDraft {
  key: string;
  file: File;
  previewUrl: string | null;
  caption: string;
  receipt: CommunityMediaReceipt | null;
  status: 'selected' | 'uploading' | 'uploaded' | 'unknown' | 'error';
  error: string | null;
}

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = new Set(['image/jpeg','image/png','application/pdf']);
const newKey = () => crypto.randomUUID();

/** Inline entry to the same authenticated Community media authority.
 * Attachments remain private until the person explicitly publishes the post.
 * A server upload receipt never means the media is already public. */
export function InlineCommunityMedia({gateway,items,onChange,limit=4}:{
  gateway:CommunityGateway;
  items:CommunityMediaDraft[];
  onChange:(next:CommunityMediaDraft[])=>void;
  limit?:number;
}) {
  const photo=useRef<HTMLInputElement>(null);
  const camera=useRef<HTMLInputElement>(null);
  const document=useRef<HTMLInputElement>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const latest=useRef(items);
  latest.current=items;
  useEffect(()=>()=>{latest.current.forEach(item=>{
    if(item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });},[]);
  const select=(file:File|undefined)=>{
    if(!file)return;
    if(items.length>=limit){setNotice('Remove an attachment to add another.');return;}
    if(!TYPES.has(file.type)){setNotice('Choose a JPEG, PNG or PDF file.');return;}
    if(file.size===0||file.size>MAX_BYTES){setNotice('Choose a file up to 2 MB.');return;}
    setNotice(null);
    onChange([...items,{
      key:newKey(),file,previewUrl:file.type.startsWith('image/')?URL.createObjectURL(file):null,
      caption:'',receipt:null,status:'selected',error:null,
    }]);
  };
  const patch=(key:string,change:Partial<CommunityMediaDraft>)=>
    onChange(latest.current.map(item=>item.key===key?{...item,...change}:item));
  const upload=async(item:CommunityMediaDraft)=>{
    if(item.status==='uploading'||item.status==='uploaded')return;
    patch(item.key,{status:'uploading',error:null});
    try{
      const receipt=await gateway.media.upload(item.file,item.key);
      // SecurePay re-encodes photographs to strip hidden GPS/EXIF metadata;
      // a validated receipt may therefore have a different byte size.
      if(receipt.sizeBytes<=0||receipt.sizeBytes>MAX_BYTES||receipt.contentType!==item.file.type)
        throw new Error('SecurePay returned a file receipt that does not match your selection.');
      patch(item.key,{status:'uploaded',receipt,error:null});
    }catch(error){
      const text=error instanceof Error?error.message:'SecurePay could not confirm the attachment.';
      // Retain the SAME idempotency key. A timeout may have succeeded server-side.
      const unknown=/timed out|unavailable|network|cancelled/i.test(text);
      patch(item.key,{status:unknown?'unknown':'error',error:
        unknown?'Upload outcome is uncertain. Check again using the same upload request.':text});
    }
  };
  return <div className="space-y-2" aria-label="Attachments">
    <div className="flex flex-wrap items-center gap-1.5">
      <input ref={photo} type="file" accept="image/jpeg,image/png" className="sr-only"
        aria-label="Choose photo" onChange={e=>{select(e.target.files?.[0]);e.target.value='';}}/>
      <input ref={camera} type="file" accept="image/jpeg,image/png" capture="environment"
        className="sr-only" aria-label="Take photo" onChange={e=>{select(e.target.files?.[0]);e.target.value='';}}/>
      <input ref={document} type="file" accept="application/pdf,.pdf" className="sr-only"
        aria-label="Attach PDF" onChange={e=>{select(e.target.files?.[0]);e.target.value='';}}/>
      <button type="button" disabled={items.length>=limit} onClick={()=>camera.current?.click()}
        className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-cream-200 px-3 text-xs disabled:opacity-50">
        <Camera size={15}/> Camera
      </button>
      <button type="button" disabled={items.length>=limit} onClick={()=>photo.current?.click()}
        className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-cream-200 px-3 text-xs disabled:opacity-50">
        <ImagePlus size={15}/> Photo
      </button>
      <button type="button" disabled={items.length>=limit} onClick={()=>document.current?.click()}
        className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-cream-200 px-3 text-xs disabled:opacity-50">
        <Paperclip size={15}/> PDF
      </button>
    </div>
    {notice&&<p role="alert" className="text-xs text-red-700">{notice}</p>}
    {items.map(item=><div key={item.key} className="rounded-xl border border-cream-200 bg-white p-3 space-y-2">
      <div className="flex items-start gap-3">
        {item.previewUrl
          ?<img src={item.previewUrl} alt={'Selected: '+item.file.name} className="h-16 w-20 rounded-lg object-cover"/>
          :<FileText size={24} className="shrink-0 text-sand-500"/>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{item.file.name}</p>
          <p className="mt-1 text-xs text-sand-600" aria-live="polite">
            {item.status==='selected'?'Selected on this device · not uploaded':
             item.status==='uploading'?'Uploading to SecurePay…':
             item.status==='uploaded'?'Upload received · not yet published':
             item.status==='unknown'?'Upload unconfirmed':'Upload failed'}
          </p>
          {item.status==='uploading'&&<div role="progressbar" aria-label="Uploading attachment"
            aria-valuetext="Uploading; percent unavailable" className="mt-2 h-1.5 animate-pulse rounded-full bg-forest-200"/>}
        </div>
        <button type="button" aria-label={'Remove '+item.file.name} onClick={()=>{
          if(item.status==='uploading')return;
          if(item.previewUrl)URL.revokeObjectURL(item.previewUrl);
          onChange(items.filter(x=>x.key!==item.key));
        }} disabled={item.status==='uploading'} className="p-2 disabled:opacity-40"><Trash2 size={16}/></button>
      </div>
      <input type="text" maxLength={500} value={item.caption} placeholder="Caption (optional)"
        aria-label={'Caption for '+item.file.name} onChange={e=>patch(item.key,{caption:e.target.value})}
        className="min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm"/>
      {item.error&&<p role="alert" className="text-xs text-red-700">{item.error}</p>}
      {item.status!=='uploaded'&&<button type="button" disabled={item.status==='uploading'}
        onClick={()=>void upload(item)} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-forest-800 px-3 text-xs text-white disabled:opacity-50">
        {item.status==='unknown'?<RefreshCw size={15}/>:<Paperclip size={15}/>}
        {item.status==='unknown'?'Check upload again':item.status==='error'?'Retry upload':'Upload attachment'}
      </button>}
    </div>)}
    {items.length>0&&<p className="text-xs text-sand-600">
      Files stay private until you publish. Review each image or document for other people's private information.
    </p>}
  </div>;
}

export function attachedCommunityMedia(items:CommunityMediaDraft[]):Array<{
  storageReference:string;caption:string|null;mediaType:'IMAGE'|'DOCUMENT';ordinal:number
}> {
  if(items.some(x=>x.status!=='uploaded'||!x.receipt))
    throw new Error('Upload or confirm each selected attachment before publishing.');
  return items.map((x,i)=>({
    storageReference:'community-media:'+x.receipt!.id,
    caption:x.caption.trim()||null,
    mediaType:x.receipt!.mediaType,ordinal:i,
  }));
}

export function CommunityAttachmentView({gateway,id,filename,caption,mediaType}:{
  gateway:CommunityGateway;id:string;filename:string;caption:string|null;mediaType:'IMAGE'|'DOCUMENT';
}) {
  const [url,setUrl]=useState<string|null>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let alive=true;let objectUrl:string|null=null;
    void gateway.media.content(id).then(blob=>{
      if(!alive)return;
      objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
    }).catch(()=>{if(alive)setFailed(true);});
    return ()=>{alive=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[gateway,id]);
  return <div className="mt-2 rounded-lg border border-cream-200 p-2">
    {failed?<p className="text-xs text-sand-600">Attachment is not available to view.</p>:
    !url?<p role="status" className="text-xs text-sand-600">Loading attachment…</p>:
    mediaType==='IMAGE'?<a href={url} download={filename}><img src={url} alt={caption||filename}
      className="max-h-64 w-auto max-w-full rounded object-contain"/></a>:
    <a href={url} download={filename} className="text-xs text-forest-700 underline">Download PDF: {filename}</a>}
    {caption&&<p className="mt-1 text-xs text-sand-600">{caption}</p>}
  </div>;
}
