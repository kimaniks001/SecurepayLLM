import { useRef, useState } from 'react';
import { Camera, FileUp, ShieldCheck } from 'lucide-react';
import type { ObligationDto, VerifiedMediaReceipt } from '../../api/securepay/agreements';
import type { StagingEvidenceGateway, PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';

type Phase='selected'|'uploading'|'uploaded'|'submitting'|'uncertain-upload'|'uncertain-submit'|'submitted';
const uuid=()=>crypto.randomUUID();
const ACCEPT=['image/jpeg','image/png','application/pdf'];
/** Gate 5. Existing canonical two-step staging media evidence route:
 * verified private upload receipt -> separate explicit evidence submission.
 * The UI NEVER labels an upload as evidence or interprets submission as acceptance,
 * completion or release. No direct media access to production is provided.
 */
export function AgreementMediaEvidenceTool({agreementId,versionId,obligation,media,gateways,session,onSubmitted}:{
 agreementId:string;versionId:string;obligation:ObligationDto;
 media:StagingEvidenceGateway;gateways:PreviewWorkspaceGateways;session:SessionStore;
 onSubmitted:()=>void;
}) {
 const camera=useRef<HTMLInputElement>(null);
 const filePicker=useRef<HTMLInputElement>(null);
 const [file,setFile]=useState<File|null>(null);
 const [caption,setCaption]=useState('');
 const [phase,setPhase]=useState<Phase>('selected');
 const [receipt,setReceipt]=useState<VerifiedMediaReceipt|null>(null);
 const [uploadKey,setUploadKey]=useState(uuid);
 const [submitKey,setSubmitKey]=useState(uuid);
 const [notice,setNotice]=useState('');
 const busy=phase==='uploading'||phase==='submitting';
 const choose=(selected:File|undefined)=>{
   if(!selected||busy)return;
   if(!ACCEPT.includes(selected.type)||selected.size<=0||selected.size>10*1024*1024){
     setNotice('Select a JPEG, PNG or PDF up to 10 MB. The server may impose a smaller limit.');return;
   }
   setFile(selected);setReceipt(null);setPhase('selected');setNotice('');
   setUploadKey(uuid());setSubmitKey(uuid());setCaption('');
 };
 const authorise=async()=>{
   await ensureFreshSession(session,gateways.auth);
   if(session.getSnapshot().status!=='signed-in')throw Error('Signed-in Agreement access required');
 };
 const upload=async()=>{
   if(!file||busy||phase==='submitted')return;
   setPhase('uploading');setNotice('Sending your attachment to SecurePay. The upload is not evidence yet.');
   try{
     await authorise();
     const result=await media.uploadVerifiedMedia(
       agreementId,obligation.id,file,versionId,obligation.stateVersion,uploadKey);
     if(result.status!=='VERIFIED_UPLOAD_ONLY'||result.agreementEvidenceSubmitted!==false
       ||!result.verifiedUpload?.receiptId)throw Error('Verified upload receipt not confirmed');
     setReceipt(result.verifiedUpload);setPhase('uploaded');
     setNotice('Upload verified. Add a caption and explicitly submit it as Agreement evidence.');
   }catch{setPhase('uncertain-upload');
     setNotice('Upload outcome could not be confirmed. Retry only this same file with the same upload key; do not choose a new copy.');}
 };
 const submit=async()=>{
   const text=caption.trim();
   if(!receipt||busy||!file||text.length<3||text.length>2000)return;
   setPhase('submitting');setNotice('Submitting the verified upload as evidence; this is not an approval.');
   try{
     await authorise();
     const evidence=await media.submitVerifiedMediaEvidence(agreementId,obligation.id,{
       receiptId:receipt.receiptId,idempotencyKey:submitKey,
       expectedAgreementVersionId:versionId,expectedObligationVersion:obligation.stateVersion,
       caption:text,
     });
     if(!evidence.id||evidence.obligationId!==obligation.id)throw Error('Mismatched evidence receipt');
     setPhase('submitted');setNotice('Evidence received by SecurePay. The beneficiary must review it. No obligation or Money has been completed.');
     onSubmitted();
   }catch{setPhase('uncertain-submit');
     setNotice('Evidence submission was not confirmed. Retry only with this exact receipt, caption and submission key.');}
 };
 return <section data-gate5-verified-media aria-label="Photo and document evidence" className="rounded-xl border border-forest-200 bg-white p-3 space-y-3">
   <p className="font-semibold text-sm text-forest-900">Add photo or PDF evidence</p>
   <p className="text-xs leading-5 text-sand-600">Isolated staging only. The file is verified and held privately first; publication or evidence submission never happens automatically.</p>
   <div className="flex flex-wrap gap-2">
     <input ref={camera} className="sr-only" tabIndex={-1} type="file" accept="image/*" capture="environment"
       onChange={e=>choose(e.target.files?.[0])}/>
     <input ref={filePicker} className="sr-only" tabIndex={-1} type="file" accept="image/jpeg,image/png,application/pdf"
       onChange={e=>choose(e.target.files?.[0])}/>
     <button type="button" disabled={busy||phase==='submitted'||phase==='uncertain-submit'}
       onClick={()=>camera.current?.click()} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-cream-200 px-3 text-xs disabled:opacity-40"><Camera size={15}/> Camera</button>
     <button type="button" disabled={busy||phase==='submitted'||phase==='uncertain-submit'}
       onClick={()=>filePicker.current?.click()} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-cream-200 px-3 text-xs disabled:opacity-40"><FileUp size={15}/> Photo / PDF</button>
   </div>
   {file&&<div className="space-y-2">
     <p className="text-xs break-all">{file.name} · {(file.size/1024).toFixed(0)} KB</p>
     <p role="status" className="text-xs text-sand-700">{notice}</p>
     {phase==='selected'||phase==='uncertain-upload'?<button type="button" onClick={()=>void upload()}
       className="min-h-11 rounded-lg bg-forest-800 px-3 text-xs font-semibold text-white">{phase==='uncertain-upload'?'Retry same upload':'Upload to SecurePay'}</button>:null}
     {phase==='uploading'&&<p role="status" className="text-xs">Uploading… awaiting a server-confirmed receipt (not a fabricated percentage).</p>}
     {receipt&&phase!=='submitted'&&<div className="space-y-2">
       <p className="text-xs text-forest-800">Verified upload receipt received · not yet submitted as evidence</p>
       <label className="block text-xs font-semibold">Evidence caption
         <textarea value={caption} onChange={e=>{if(phase!=='uncertain-submit')setCaption(e.target.value);}}
           disabled={phase==='uncertain-submit'} maxLength={2000} rows={3} placeholder="What can the beneficiary verify?"
           className="mt-1 w-full rounded-lg border border-cream-200 p-3 text-sm"/>
       </label>
       <button type="button" onClick={()=>void submit()}
         disabled={phase==='submitting'||caption.trim().length<3}
         className="min-h-11 rounded-lg bg-forest-800 px-3 text-xs font-semibold text-white disabled:opacity-40">
         {phase==='uncertain-submit'?'Retry same evidence submission':'Submit as Agreement evidence'}
       </button>
     </div>}
     {phase==='submitting'&&<p role="status" className="text-xs">Submitting verified receipt…</p>}
     {phase==='submitted'&&<p role="status" className="text-xs text-forest-800">{notice}</p>}
   </div>}
   <p className="flex items-start gap-2 text-xs text-sand-600"><ShieldCheck size={15} className="shrink-0"/>
      The beneficiary’s review and the separate obligation completion authority remain necessary. This tool cannot approve evidence or move Money.</p>
 </section>;
}
