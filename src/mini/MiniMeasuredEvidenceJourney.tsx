import { useRef, useState } from 'react';
import { ArrowRight, Camera, CheckCircle2, RefreshCcw, ShieldCheck } from 'lucide-react';
import type { AgreementGateway, EvidenceDto, ObligationDto } from '../api/securepay/agreements';
import { ApiError } from '../api/securepay/http';
import type {
  MeasuredDirectory, MeasuredReport, MeasuredEvidenceGateway,
  EvidenceWork, EvidenceAssessment, ConfirmedQuantity, Correction,
} from '../api/securepay/measured-evidence';

/**
 * G8 E7: one compact, explicitly opened tool inside the EXISTING My Agreement
 * detail view. There are no local/demo reports. Every authority, source
 * version, identity, upload, counterparty decision and payable flag remains
 * server-owned. This UI never issues Money instructions.
 */
type Agreements = Pick<AgreementGateway,
  'version'|'obligations'|'startObligation'|'obligationEvidence'|
  'uploadVerifiedMedia'|'submitVerifiedMediaEvidence'|'reviewEvidence'|
  'obligationCompletionStatus'|'completeObligation'>;
type Party = {id:string;name:string;role:string;status:string};
const established=(p:Party)=>['CREATOR','JOINED_UNCONFIRMED','CONFIRMED'].includes(p.status);
const unavailable=(error:unknown)=>error instanceof ApiError && error.status===404;
const hundredths=(source:string):number|null=>{
  if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(source))return null;
  const [integer,decimal='']=source.split('.');
  const n=Number(integer)*100+Number(decimal.padEnd(2,'0'));
  return Number.isSafeInteger(n)&&n>0?n:null;
};
const isHex=(x:unknown)=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const units=(x:number)=>Number.isSafeInteger(x)?(x/100).toFixed(2):'Needs checking';
const newKey=()=>crypto.randomUUID().replace(/-/g,'');
const fileOk=(file:File|null):boolean=>!!file &&
  ['image/jpeg','image/png','application/pdf'].includes(file.type) &&
  file.size>0 && file.size<=12*1024*1024 &&
  file.name.length<=180 && !/[\\/]/.test(file.name);
const nonpayable=(value:unknown):boolean=>!!value&&typeof value==='object'&&
  'paymentEnabled' in value && value.paymentEnabled===false;

export function MiniMeasuredEvidenceJourney({
  agreementId,versionId,people,agreements,measured,prepare,
}:{
  agreementId:string;versionId:string;people:Party[];
  agreements:Agreements;measured:MeasuredEvidenceGateway;
  prepare:()=>Promise<unknown>;
}) {
  const [opened,setOpened]=useState(false);
  const [busy,setBusy]=useState(false);
  const [blocked,setBlocked]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [directory,setDirectory]=useState<MeasuredDirectory|null>(null);
  const [selectedId,setSelectedId]=useState('');
  const [work,setWork]=useState<EvidenceWork|null>(null);
  const [obligation,setObligation]=useState<ObligationDto|null>(null);
  const [evidence,setEvidence]=useState<EvidenceDto[]>([]);
  const [assessment,setAssessment]=useState<EvidenceAssessment|null>(null);
  const [corrections,setCorrections]=useState<Correction[]>([]);
  const [confirmed,setConfirmed]=useState<ConfirmedQuantity|null>(null);
  const [beneficiary,setBeneficiary]=useState('');
  const [quantity,setQuantity]=useState('');
  const [note,setNote]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [caption,setCaption]=useState('');
  const [reviewReason,setReviewReason]=useState('');
  const [decisionReason,setDecisionReason]=useState('');
  const [started,setStarted]=useState(false);
  const currentRequest=useRef(0);
  const serviceInstance=useRef('');
  const keys=useRef(new Map<string,string>());
  const pendingReceipt=useRef<{
    fileName:string;size:number;obligationId:string;
    stateVersion:number;receiptId:string;idempotencyKey:string;
  }|null>(null);

  const key=(label:string)=>{
    let k=keys.current.get(label);
    if(!k){k=newKey();keys.current.set(label,k);}
    return k;
  };
  const chosen=directory?.reports.find(r=>r.reportId===selectedId)??null;
  const unit=directory?.rateBasis==='PER_HOUR'?'hours':'km';

  const refresh=async(nextSelected=selectedId)=>{
    const ticket=++currentRequest.current;
    setBusy(true);setError('');
    try{
      await prepare();
      const [listed,version]=await Promise.all([
        measured.list(agreementId),agreements.version(agreementId,versionId),
      ]);
      if(!nonpayable(listed) ||
          listed.agreementId!==agreementId ||
          listed.currentVersionId!==versionId ||
          !isHex(listed.versionHash) ||
          version.id!==versionId ||
          version.contentHash!==listed.versionHash ||
          !Array.isArray(listed.reports) ||
          !version.snapshot ||
          !('measured_financial_terms' in version.snapshot))
        throw Error('Measured work no longer matches the canonical Agreement');
      if(ticket!==currentRequest.current)return;
      setDirectory(listed);
      const selected=listed.reports.find(p=>p.reportId===nextSelected)??null;
      setSelectedId(selected?.reportId??'');
      setWork(null);setObligation(null);setEvidence([]);
      setAssessment(null);setCorrections([]);setConfirmed(null);
      if(selected){
        if(!selected.versionCurrent || selected.versionId!==versionId ||
            selected.versionHash!==listed.versionHash || !isHex(selected.reportDigest) ||
            selected.evidenceMethod!==listed.evidenceMethod ||
            selected.state!=='REPORTED_UNVERIFIED' || selected.payable!==false)
          throw Error('Work report proof no longer matches');
        let realWork:EvidenceWork|null=null;
        try{realWork=await measured.evidenceWork(agreementId,selected.reportId);}
        catch(e){if(!unavailable(e))throw e;}
        if(ticket!==currentRequest.current)return;
        if(realWork){
          if(!nonpayable(realWork) || realWork.monetary!==false ||
              realWork.reportId!==selected.reportId ||
              realWork.reportDigest!==selected.reportDigest ||
              realWork.versionId!==versionId ||
              realWork.versionHash!==listed.versionHash ||
              realWork.serviceInstanceId!==selected.serviceInstanceId)
            throw Error('Evidence-only work proof mismatch');
          setWork(realWork);
          const [obligations,proofs,review,changes]=await Promise.all([
            agreements.obligations(agreementId),
            agreements.obligationEvidence(agreementId,realWork.obligationId),
            measured.assessment(agreementId,selected.reportId),
            measured.corrections(agreementId,selected.reportId),
          ]);
          const obligation=obligations.find(o=>o.id===realWork.obligationId);
          if(!obligation||obligation.agreementVersionId!==versionId ||
              obligation.obligationType!=='NON_MONETARY' ||
              obligation.amountMinor!==null || obligation.currency!==null ||
              !Array.isArray(proofs) || !Array.isArray(changes) ||
              !nonpayable(review) || review.reportDigest!==selected.reportDigest)
            throw Error('Canonical work/evidence did not reconcile');
          if(ticket!==currentRequest.current)return;
          setObligation(obligation);setEvidence(proofs);setAssessment(review);
          setCorrections(changes);
          try{
            const sealed=await measured.confirmed(agreementId,selected.reportId);
            if(ticket!==currentRequest.current)return;
            if(!nonpayable(sealed) || sealed.reportDigest!==selected.reportDigest ||
                sealed.reportId!==selected.reportId || sealed.invoiceIssued!==false ||
                sealed.payable!==false)throw Error('Confirmed quantity proof mismatch');
            setConfirmed(sealed);
          }catch(e){if(!unavailable(e))throw e;}
        }
      }
      if(ticket===currentRequest.current){
        setBlocked(false);setStarted(true);setNotice('Current SecurePay work checked.');
      }
    }catch{
      if(ticket===currentRequest.current){
        setBlocked(true);setDirectory(null);setWork(null);
        setObligation(null);setAssessment(null);setEvidence([]);
        setConfirmed(null);setCorrections([]);
        setError('SecurePay could not verify current work or access. No decision or payment was made. Recheck before continuing.');
      }
    }finally{if(ticket===currentRequest.current)setBusy(false);}
  };

  /** A write's result can be unknown on a timeout. Never auto-retry it. */
  const act=async(label:string,workAction:()=>Promise<void>,selected=selectedId)=>{
    if(busy||blocked)return;
    setBusy(true);setError('');setNotice('');
    try{
      await prepare();await workAction();
      setNotice(label+' recorded. Rechecking its server status…');
      await refresh(selected);
    }catch{
      setBlocked(true);
      setError('SecurePay could not confirm the final outcome. Recheck the server record before trying again. Nothing is payable.');
    }finally{setBusy(false);}
  };

  const declare=async()=>{
    const amount=hundredths(quantity),description=note.trim();
    if(!directory||amount===null||!description||description.length>1200){
      setError('Enter a positive number (up to two decimal places) and a short work description.');
      return;
    }
    if(!serviceInstance.current)serviceInstance.current=crypto.randomUUID();
    const instance=serviceInstance.current;
    const actionKey=key('new-report:'+instance);
    await act('Usage declaration',async()=>{
      const saved=await measured.declare(agreementId,{
        expectedVersionId:versionId,expectedVersionHash:directory.versionHash,
        serviceInstanceId:instance,reportedHundredths:amount,
        evidenceMethod:directory.evidenceMethod,evidenceNote:description,
        evidenceReference:null,idempotencyKey:actionKey,
      });
      if(!nonpayable(saved)||saved.usageVerified!==false ||
          saved.agreementId!==agreementId || saved.versionId!==versionId ||
          saved.serviceInstanceId!==instance || saved.reportedHundredths!==amount)
        throw Error('Usage declaration mismatch');
      serviceInstance.current='';setQuantity('');setNote('');
      // A saved declaration becomes selectable only after a fresh read.
      await refresh(saved.id);
    });
  };

  const openWork=async()=>{
    if(!chosen || !directory || !beneficiary){setError('Choose the person who will review this work.');return;}
    await act('Evidence work',async()=>{
      const saved=await measured.openEvidenceWork(agreementId,chosen.reportId,{
        expectedVersionId:versionId,expectedVersionHash:directory.versionHash,
        expectedReportDigest:chosen.reportDigest,
        beneficiaryParticipantId:beneficiary,
        idempotencyKey:key('open:'+chosen.reportId+':'+beneficiary),
      });
      if(!nonpayable(saved)||saved.monetary!==false||
          saved.reportId!==chosen.reportId ||
          saved.reportDigest!==chosen.reportDigest ||
          !saved.obligationId)
        throw Error('Non-monetary evidence work mismatch');
    });
  };

  const startWork=async()=>{
    if(!work||!obligation)return;
    await act('Evidence work started',async()=>{
      const started=await agreements.startObligation(agreementId,work.obligationId,{
        idempotencyKey:key('start:'+work.obligationId),
        expectedAgreementVersionId:versionId,
        expectedObligationVersion:obligation.stateVersion,
      });
      if(started.id!==work.obligationId||
          started.agreementVersionId!==versionId||
          started.obligationType!=='NON_MONETARY')throw Error('Unexpected work state');
    });
  };

  const submitProof=async()=>{
    if(!chosen||!work||!obligation||!fileOk(file)||
        !caption.trim()||caption.trim().length>2048){
      setError('Choose a JPG, PNG or PDF, and explain what it shows.');
      return;
    }
    const selectedFile=file;
    if(!selectedFile)return;
    await act('Private evidence',async()=>{
      const label=work.obligationId+':'+selectedFile.name+':'+selectedFile.size;
      let pending=pendingReceipt.current;
      if(!pending) {
        const uploadKey=key('media-upload:'+label);
        const res=await agreements.uploadVerifiedMedia(
          agreementId,work.obligationId,selectedFile,
          versionId,obligation.stateVersion,uploadKey);
        if(res.status!=='VERIFIED_UPLOAD_ONLY'||res.agreementEvidenceSubmitted!==false||
            !res.verifiedUpload?.receiptId ||
            !isHex(res.verifiedUpload.serverSha256)||
            res.verifiedUpload.sizeBytes!==selectedFile.size)
          throw Error('Verified upload receipt missing');
        pending={fileName:selectedFile.name,size:selectedFile.size,
          obligationId:work.obligationId,stateVersion:obligation.stateVersion,
          receiptId:res.verifiedUpload.receiptId,
          idempotencyKey:key('media-submit:'+label)};
        pendingReceipt.current=pending;
      }else if(pending.fileName!==selectedFile.name ||
          pending.size!==selectedFile.size||
          pending.obligationId!==work.obligationId ||
          pending.stateVersion!==obligation.stateVersion){
        throw Error('A previous private upload belongs to different work or state');
      }
      const evidence=await agreements.submitVerifiedMediaEvidence(
        agreementId,work.obligationId,{
          receiptId:pending.receiptId,idempotencyKey:pending.idempotencyKey,
          expectedAgreementVersionId:versionId,
          expectedObligationVersion:pending.stateVersion,
          caption:caption.trim(),
        });
      if(!evidence.id || evidence.obligationId!==work.obligationId)
        throw Error('Canonical evidence was not confirmed');
      const bound=await measured.bindEvidence(agreementId,chosen.reportId,{
        expectedVersionId:versionId,expectedVersionHash:chosen.versionHash,
        expectedReportDigest:chosen.reportDigest,evidenceId:evidence.id,
        idempotencyKey:key('link:'+chosen.reportId+':'+evidence.id),
      });
      if(!nonpayable(bound)||bound.reportId!==chosen.reportId||
          bound.evidenceId!==evidence.id||bound.reportDigest!==chosen.reportDigest)
        throw Error('Evidence provenance link could not be confirmed');
      pendingReceipt.current=null;setFile(null);setCaption('');
    });
  };

  const linkExisting=async(proof:EvidenceDto)=>{
    if(!chosen)return;
    await act('Evidence provenance link',async()=>{
      const linked=await measured.bindEvidence(agreementId,chosen.reportId,{
        expectedVersionId:versionId,expectedVersionHash:chosen.versionHash,
        expectedReportDigest:chosen.reportDigest,evidenceId:proof.id,
        idempotencyKey:key('link:'+chosen.reportId+':'+proof.id),
      });
      if(!nonpayable(linked)||linked.evidenceId!==proof.id||
          linked.reportDigest!==chosen.reportDigest)
        throw Error('Evidence link mismatch');
      pendingReceipt.current=null;
    });
  };

  const reviewProof=async(proof:EvidenceDto,choice:'APPROVED'|'REJECTED')=>{
    if(!work||!obligation)return;
    const reason=choice==='REJECTED'?reviewReason.trim():'';
    if(choice==='REJECTED'&&!reason){setError('Explain what is wrong with the evidence.');return;}
    await act('Evidence review',async()=>{
      const res=await agreements.reviewEvidence(agreementId,proof.id,{
        idempotencyKey:key('proof-review:'+proof.id+':'+choice),
        expectedAgreementVersionId:versionId,
        expectedObligationVersion:obligation.stateVersion,
        decision:choice,
        ...(reason?{reason}:{}),
      });
      if(res.evidenceId!==proof.id||res.decision!==choice)
        throw Error('Evidence review did not match');
      setReviewReason('');
    });
  };

  const decideQuantity=async(choice:'ACCEPT'|'REJECT')=>{
    if(!chosen)return;
    const reason=choice==='REJECT'?decisionReason.trim():null;
    if(choice==='REJECT'&&!reason){setError('Explain why the reported hours or kilometres are disputed.');return;}
    await act('Measured quantity review',async()=>{
      const result=await measured.decideUsage(agreementId,chosen.reportId,{
        expectedVersionId:versionId,expectedVersionHash:chosen.versionHash,
        expectedReportDigest:chosen.reportDigest,choice,reviewNote:reason,
        idempotencyKey:key('usage-review:'+chosen.reportId+':'+choice),
      });
      if(!nonpayable(result)||result.reportDigest!==chosen.reportDigest||
          result.choice!==choice||result.state!=='REVIEW_ONLY')
        throw Error('Usage review mismatch');
      setDecisionReason('');
    });
  };

  const completeWork=async()=>{
    if(!work||!obligation)return;
    await act('Non-monetary work completion',async()=>{
      const readiness=await agreements.obligationCompletionStatus(
        agreementId,work.obligationId);
      if(!readiness.eligible)throw Error('Evidence has not met completion checks');
      const done=await agreements.completeObligation(agreementId,work.obligationId,{
        expectedAgreementVersionId:versionId,
        expectedObligationVersion:obligation.stateVersion,
        idempotencyKey:key('complete:'+work.obligationId),
      });
      if(done.id!==work.obligationId||done.status!=='COMPLETED'||
          done.obligationType!=='NON_MONETARY'||done.amountMinor!==null)
        throw Error('Nonmonetary completion mismatch');
    });
  };

  const confirmQuantity=async()=>{
    if(!chosen||!work||corrections.length>0||confirmed)return;
    await act('Human-confirmed effective quantity',async()=>{
      const confirmed=await measured.confirm(agreementId,chosen.reportId,{
        expectedVersionId:versionId,expectedVersionHash:chosen.versionHash,
        expectedReportDigest:chosen.reportDigest,
        expectedCorrectionId:null,
        expectedEffectiveHundredths:chosen.reportedHundredths,
        idempotencyKey:key('effective:'+chosen.reportId),
      });
      if(!nonpayable(confirmed)||confirmed.invoiceIssued!==false||
          confirmed.payable!==false||
          confirmed.reportId!==chosen.reportId ||
          confirmed.effectiveHundredths!==chosen.reportedHundredths)
        throw Error('Human-confirmed measurement mismatch');
    });
  };

  return <details className="spm-mini-slot" data-g8-evidence="canonical"
      onToggle={e=>{
        if(e.currentTarget.open&&!opened){
          setOpened(true);void refresh('');
        }
      }}>
    <summary>Work evidence <small>Hours, trips and proof · no payment</small>
      <ArrowRight size={15}/></summary>
    <div className="spm-mini-slot-items">
      <p>Report the work, show your proof and let the other person review it.
        Nothing becomes payable here.</p>
      <button type="button" className="spm-secondary"
        onClick={()=>void refresh()} disabled={busy}>
        <RefreshCcw size={14}/>{busy?'Checking…':'Recheck SecurePay'}
      </button>
      {error&&<p role="alert" className="spm-error">{error}</p>}
      {notice&&!error&&<small role="status">{notice}</small>}
      {started&&!directory&&<small>Work cannot be verified at this moment.</small>}
      {directory&&<>
        <small>Current Agreement version verified · {directory.rateBasis==='PER_HOUR'?'Hourly work':'Distance work'}.
          Uploaded files and decisions stay in SecurePay—not in this browser.</small>
        <div className="spm-mini-agreement-fact">
          <strong>Record a work session</strong>
          <label className="spm-label" htmlFor="g8-work-qty">Actual {unit} reported</label>
          <input className="spm-field" id="g8-work-qty" inputMode="decimal"
            value={quantity} placeholder={unit==='hours'?'4.00':'50.00'}
            onChange={e=>setQuantity(e.target.value)} disabled={busy||blocked}/>
          <label className="spm-label" htmlFor="g8-work-note">What happened?</label>
          <textarea className="spm-field" id="g8-work-note" rows={2} value={note}
            maxLength={1200} placeholder="e.g. Worked from 9 AM to 1 PM at the farm"
            onChange={e=>setNote(e.target.value)} disabled={busy||blocked}/>
          <button type="button" className="spm-secondary"
            onClick={()=>void declare()} disabled={busy||blocked||!quantity.trim()||!note.trim()}>
            Record reported {unit}</button>
          <small>One report per ride or work session. The customer has not verified this quantity.</small>
        </div>
        {directory.reports.length>0&&<>
          <label className="spm-label" htmlFor="g8-report-select">Select recorded work</label>
          <select className="spm-field" id="g8-report-select" value={selectedId}
            disabled={busy} onChange={e=>void refresh(e.target.value)}>
            <option value="">Choose a recorded session</option>
            {directory.reports.map((r,index)=><option value={r.reportId} key={r.reportId}>
              Session {directory.reports.length-index} · {units(r.reportedHundredths)} {unit}
            </option>)}
          </select>
        </>}
        {chosen&&<div className="spm-mini-agreement-fact">
          <strong>{units(chosen.reportedHundredths)} {unit} reported</strong>
          <small>{chosen.evidenceNote}</small>
          <small>Reported only · {chosen.state.toLowerCase().replaceAll('_',' ')}</small>
          {!work&&<>
            <label className="spm-label" htmlFor="g8-beneficiary">
              Who will review the work?</label>
            <select className="spm-field" id="g8-beneficiary" value={beneficiary}
              onChange={e=>setBeneficiary(e.target.value)} disabled={busy||blocked}>
              <option value="">Choose the other Agreement party</option>
              {people.filter(established).map(p=><option key={p.id} value={p.id}>
                {p.name} · {p.role}</option>)}
            </select>
            <button type="button" className="spm-secondary"
              disabled={busy||blocked||!beneficiary}
              onClick={()=>void openWork()}>Prepare secure proof</button>
          </>}
          {work&&<>
            <div className="spm-mini-agreement-fact">
              <strong><ShieldCheck size={14}/> Secure evidence work</strong>
              <small>{work.nextAction.replaceAll('_',' ').toLowerCase()}</small>
              {obligation?.status==='AVAILABLE'&&<button type="button"
                className="spm-secondary" disabled={busy||blocked}
                onClick={()=>void startWork()}>Start recording proof</button>}
              {obligation&&['IN_PROGRESS','EVIDENCE_SUBMITTED','OVERDUE'].includes(obligation.status)&&<>
                <label htmlFor="g8-private-file" className="spm-label">Photo or document</label>
                <input id="g8-private-file" className="spm-field" type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  disabled={busy||blocked} onChange={e=>setFile(e.target.files?.[0]??null)}/>
                <label htmlFor="g8-proof-caption" className="spm-label">What does it show?</label>
                <textarea id="g8-proof-caption" className="spm-field" rows={2}
                  maxLength={2048} value={caption}
                  disabled={busy||blocked}
                  onChange={e=>setCaption(e.target.value)}/>
                <button type="button" className="spm-secondary"
                  disabled={busy||blocked||!fileOk(file)||!caption.trim()}
                  onClick={()=>void submitProof()}>
                  <Camera size={14}/>Securely upload and attach proof</button>
                <small>JPG/PNG up to 8 MB, or PDF up to 12 MB. SecurePay checks the file in private storage; neither photo nor receipt proves the hours or km.</small>
              </>}
            </div>
            {evidence.length>0&&<div className="spm-mini-agreement-fact">
              <strong>Evidence and the other party's review</strong>
              {evidence.map(proof=><div className="spm-mini-slot-item" key={proof.id}>
                <small>{proof.description||proof.evidenceType} · {proof.reviewState||'Awaiting review'}</small>
                {proof.reviewState==='AWAITING_REVIEW'&&<>
                  <button type="button" className="spm-secondary"
                    disabled={busy||blocked}
                    onClick={()=>void reviewProof(proof,'APPROVED')}>
                    <CheckCircle2 size={14}/>Accept this evidence</button>
                  <label className="spm-label" htmlFor={'g8-reject-'+proof.id}>
                    Reason if evidence is insufficient</label>
                  <textarea className="spm-field" id={'g8-reject-'+proof.id}
                    value={reviewReason} rows={2}
                    onChange={e=>setReviewReason(e.target.value)}
                    disabled={busy||blocked}/>
                  <button type="button" className="spm-quiet-button"
                    disabled={busy||blocked||!reviewReason.trim()}
                    onClick={()=>void reviewProof(proof,'REJECTED')}>
                    Dispute this evidence</button>
                </>}
                {assessment&&!assessment.evidence.some(p=>p.evidenceId===proof.id)&&
                  <button type="button" className="spm-quiet-button"
                    disabled={busy||blocked}
                    onClick={()=>void linkExisting(proof)}>
                    Link this existing proof to the session</button>}
              </div>)}
            </div>}
            {assessment&&<small>Evidence: {assessment.state.replaceAll('_',' ').toLowerCase()}.
              Source approval is not proof the physical measurement is accurate.</small>}
            <div className="spm-mini-agreement-fact">
              <strong>Review the reported {unit}</strong>
              <small>{units(chosen.reportedHundredths)} {unit} · separate from reviewing the photo.</small>
              <button type="button" className="spm-secondary"
                disabled={busy||blocked} onClick={()=>void decideQuantity('ACCEPT')}>
                Accept reported {unit}</button>
              <label className="spm-label" htmlFor="g8-usage-reason">Reason if disputed</label>
              <textarea id="g8-usage-reason" className="spm-field"
                value={decisionReason} rows={2}
                onChange={e=>setDecisionReason(e.target.value)}
                disabled={busy||blocked}/>
              <button type="button" className="spm-quiet-button"
                disabled={busy||blocked||!decisionReason.trim()}
                onClick={()=>void decideQuantity('REJECT')}>Dispute reported {unit}</button>
            </div>
            {obligation&&obligation.status!=='COMPLETED'&&<>
              <button type="button" className="spm-secondary"
                disabled={busy||blocked}
                onClick={()=>void completeWork()}>
                Mark reviewed evidence work complete</button>
              <small>SecurePay checks independent evidence approval before completing.</small>
            </>}
            {corrections.length>0&&<p className="spm-error">
              A corrected quantity is under review. The original cannot be sealed or billed from here.
            </p>}
            {obligation?.status==='COMPLETED'&&corrections.length===0&&!confirmed&&<>
              <button type="button" className="spm-secondary"
                disabled={busy||blocked}
                onClick={()=>void confirmQuantity()}>
                Confirm effective {unit}</button>
              <small>For the beneficiary only. The server requires every party's current Agreement confirmation, the exact usage reviews and approved evidence.</small>
            </>}
            {confirmed&&<div className="spm-mini-agreement-fact" role="status">
              <strong>{units(confirmed.effectiveHundredths)} {unit} confirmed</strong>
              <small>Evidence-linked human agreement recorded. Not an invoice or payment approval.</small>
            </div>}
          </>}
        </div>}
      </>}
      <small>Money remains separate. No payment, deposit, escrow, automatic settlement or provider instruction is sent by this tool.</small>
    </div>
  </details>;
}
