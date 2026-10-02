import { useState } from 'react';
import type { CommunityGateway } from '../../api/securepay/community';
import type {
  ApprenticeshipStage,
  ApprenticeshipStageResult,
  MasterCapabilityClaimDto,
  MasterReviewOutcome,
  PlugCapability,
  PlugCapabilityQualificationDto,
  PlugCapabilityStatus,
  PlugQualificationDto,
} from '../../api/securepay/community/programmes';

const plugCapabilities: PlugCapability[] = ['FULFILMENT','VERIFICATION','DISCOVERY','POOLING','ASSEMBLY'];
const plugStatuses: PlugCapabilityStatus[] = ['LEARNING','ASSESSMENT_PENDING','QUALIFIED'];
const stages: ApprenticeshipStage[] = [
  'OBSERVE','ASSIST','PRACTISE','SUPERVISED_PERFORMANCE','REVIEWED_PERFORMANCE','DEMONSTRATE_COMPETENCE',
];
const stageResults: ApprenticeshipStageResult[] = ['PENDING','PASS','MORE_PRACTICE'];

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function TrustProjectCapabilityPanel({ gateway }: { gateway: CommunityGateway }) {
  const [plug,setPlug]=useState<PlugQualificationDto|null>(null);
  const [plugCapability,setPlugCapability]=useState<PlugCapability>('FULFILMENT');
  const [plugStatus,setPlugStatus]=useState<PlugCapabilityStatus>('LEARNING');
  const [plugEvidence,setPlugEvidence]=useState('');
  const [plugCapabilityState,setPlugCapabilityState]=useState<PlugCapabilityQualificationDto|null>(null);
  const [plugBusy,setPlugBusy]=useState(false);

  const [masterCapabilityKey,setMasterCapabilityKey]=useState('');
  const [masterCapabilityLabel,setMasterCapabilityLabel]=useState('');
  const [masterEvidence,setMasterEvidence]=useState('');
  const [masterClaim,setMasterClaim]=useState<MasterCapabilityClaimDto|null>(null);
  const [reviewerKs,setReviewerKs]=useState('');
  const [reviewAgreementId,setReviewAgreementId]=useState('');
  const [reviewFeeReference,setReviewFeeReference]=useState('');
  const [reviewId,setReviewId]=useState('');
  const [reviewOutcome,setReviewOutcome]=useState<MasterReviewOutcome>('VERIFIED');
  const [reviewNote,setReviewNote]=useState('');
  const [masterBusy,setMasterBusy]=useState(false);

  const [apprenticeshipId,setApprenticeshipId]=useState('');
  const [stageOrdinal,setStageOrdinal]=useState(0);
  const [stage,setStage]=useState<ApprenticeshipStage>('OBSERVE');
  const [stageResult,setStageResult]=useState<ApprenticeshipStageResult>('PENDING');
  const [stageEvidence,setStageEvidence]=useState('');
  const [competence,setCompetence]=useState<boolean|null>(null);
  const [apprenticeBusy,setApprenticeBusy]=useState(false);

  const [notice,setNotice]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);

  const runPlug=async(action:()=>Promise<PlugQualificationDto>)=>{
    setPlugBusy(true); setError(null);
    try { setPlug(await action()); }
    catch(e){ setError(message(e,'Plug programme action could not be completed.')); }
    finally { setPlugBusy(false); }
  };

  const savePlugCapability=async()=>{
    setPlugBusy(true); setError(null);
    try {
      const result=await gateway.programmes.plug.setCapability(
        plugCapability,plugStatus,plugEvidence.trim()||null,
      );
      setPlugCapabilityState(result);
      setNotice('Capability state recorded by SecurePay. Qualification does not assign work or create payment entitlement.');
    } catch(e){ setError(message(e,'Plug capability could not be updated.')); }
    finally { setPlugBusy(false); }
  };

  const submitMasterClaim=async()=>{
    if(!masterCapabilityKey.trim()||!masterCapabilityLabel.trim()||!masterEvidence.trim()) return;
    setMasterBusy(true); setError(null);
    try {
      const claim=await gateway.programmes.master.submitClaim(
        masterCapabilityKey.trim(),masterCapabilityLabel.trim(),masterEvidence.trim(),
      );
      setMasterClaim(claim);
      setNotice('Master capability claim submitted for this exact capability only.');
    } catch(e){ setError(message(e,'Master capability claim could not be submitted.')); }
    finally { setMasterBusy(false); }
  };

  const requestReview=async()=>{
    if(!masterCapabilityKey.trim()||!reviewerKs.trim()) return;
    setMasterBusy(true); setError(null);
    try {
      const result=await gateway.programmes.master.requestReview(
        masterCapabilityKey.trim(),reviewerKs.trim(),
        reviewAgreementId.trim()||null,reviewFeeReference.trim()||null,
      );
      setReviewId(result.reviewId);
      setNotice('Independent review requested. A fee may compensate review work; it cannot determine the outcome.');
    } catch(e){ setError(message(e,'Independent review could not be requested.')); }
    finally { setMasterBusy(false); }
  };

  const recordReview=async()=>{
    if(!reviewId.trim()) return;
    setMasterBusy(true); setError(null);
    try {
      await gateway.programmes.master.recordReviewOutcome(
        reviewId.trim(),reviewOutcome,reviewNote.trim()||null,null,
      );
      setNotice('Review outcome recorded. Verification applies only to the reviewed capability scope.');
    } catch(e){ setError(message(e,'Review outcome could not be recorded.')); }
    finally { setMasterBusy(false); }
  };

  const recordStage=async()=>{
    if(!apprenticeshipId.trim()) return;
    setApprenticeBusy(true); setError(null);
    try {
      await gateway.programmes.apprenticeships.recordProgression(
        apprenticeshipId.trim(),stageOrdinal,stage,stageEvidence.trim()||null,stageResult,
      );
      setNotice('Apprenticeship progression recorded. Attendance alone is not competence.');
    } catch(e){ setError(message(e,'Apprenticeship progression could not be recorded.')); }
    finally { setApprenticeBusy(false); }
  };

  const checkCompetence=async()=>{
    if(!apprenticeshipId.trim()) return;
    setApprenticeBusy(true); setError(null);
    try {
      const result=await gateway.programmes.apprenticeships.competence(apprenticeshipId.trim());
      setCompetence(result.demonstrated);
    } catch(e){ setError(message(e,'Competence status could not be checked.')); }
    finally { setApprenticeBusy(false); }
  };

  return <section className="rounded-2xl border border-cream-200 bg-white px-4 py-4 space-y-5">
    <div>
      <p className="text-[0.68rem] uppercase tracking-wide text-sand-500">Pathways & capability</p>
      <h2 className="font-display text-base text-forest-800 mt-1">Build capability without turning it into status.</h2>
      <p className="text-[0.74rem] text-sand-600 mt-1">Plug and Master are bounded capacities. Evidence and review matter; popularity does not.</p>
    </div>

    {error && <p role="alert" className="text-[0.76rem] text-red-600">{error}</p>}
    {notice && <p role="status" className="text-[0.76rem] text-forest-600">{notice}</p>}

    <div className="border-t border-cream-100 pt-4 space-y-3">
      <div><h3 className="text-[0.86rem] font-medium text-forest-800">Plug Foundation</h3>
        <p className="text-[0.7rem] text-sand-500">Foundation + assessment can unlock BASIC qualification. Work is still matched separately.</p></div>
      <div className="flex flex-wrap gap-2">
        <button disabled={plugBusy} onClick={()=>void runPlug(()=>gateway.programmes.plug.startFoundation())} className="rounded-xl border border-cream-200 px-3 py-2 text-[0.74rem] text-forest-700 disabled:opacity-50">Start Foundation</button>
        <button disabled={plugBusy} onClick={()=>void runPlug(()=>gateway.programmes.plug.completeFoundation())} className="rounded-xl border border-cream-200 px-3 py-2 text-[0.74rem] text-forest-700 disabled:opacity-50">Complete Foundation</button>
        <button disabled={plugBusy} onClick={()=>void runPlug(()=>gateway.programmes.plug.recordAssessment(true))} className="rounded-xl border border-forest-200 px-3 py-2 text-[0.74rem] text-forest-700 disabled:opacity-50">Record assessment passed</button>
      </div>
      {plug && <p className="text-[0.72rem] text-sand-600">Foundation: {plug.foundationStatus.replace(/_/g, ' ')} · Assessment: {plug.assessmentStatus.replace(/_/g, ' ')} · BASIC qualified: {plug.basicQualified?'Yes':'No'}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select value={plugCapability} onChange={e=>setPlugCapability(e.target.value as PlugCapability)} className="rounded-xl border border-cream-200 px-3 py-2 text-[0.76rem]">{plugCapabilities.map(x=><option key={x}>{x}</option>)}</select>
        <select value={plugStatus} onChange={e=>setPlugStatus(e.target.value as PlugCapabilityStatus)} className="rounded-xl border border-cream-200 px-3 py-2 text-[0.76rem]">{plugStatuses.map(x=><option key={x}>{x}</option>)}</select>
      </div>
      <input value={plugEvidence} onChange={e=>setPlugEvidence(e.target.value)} placeholder="Evidence reference required when QUALIFIED" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.76rem]" />
      <button disabled={plugBusy||(plugStatus==='QUALIFIED'&&!plugEvidence.trim())} onClick={()=>void savePlugCapability()} className="rounded-xl bg-forest-600 text-cream-50 px-4 py-2 text-[0.74rem] font-medium disabled:opacity-50">Save Plug capability</button>
      {plugCapabilityState && <p className="text-[0.7rem] text-sand-500">{plugCapabilityState.capability}: {plugCapabilityState.status.replace(/_/g, ' ')}</p>}
    </div>

    <div className="border-t border-cream-100 pt-4 space-y-3">
      <div><h3 className="text-[0.86rem] font-medium text-forest-800">Master capability</h3>
        <p className="text-[0.7rem] text-sand-500">Master capability is specific and independently reviewable. Being verified in one field says nothing about another.</p></div>
      <div className="flex flex-wrap gap-2">
        <button disabled={masterBusy} onClick={()=>void gateway.programmes.master.startFoundation().then(()=>setNotice('Master Foundation started.')).catch(e=>setError(message(e,'Master Foundation could not start.')))} className="rounded-xl border border-cream-200 px-3 py-2 text-[0.74rem] text-forest-700 disabled:opacity-50">Start Foundation</button>
        <button disabled={masterBusy} onClick={()=>void gateway.programmes.master.completeFoundation().then(()=>setNotice('Master Foundation completed; capability still requires evidence and review.')).catch(e=>setError(message(e,'Master Foundation could not complete.')))} className="rounded-xl border border-cream-200 px-3 py-2 text-[0.74rem] text-forest-700 disabled:opacity-50">Complete Foundation</button>
      </div>
      <input value={masterCapabilityKey} onChange={e=>setMasterCapabilityKey(e.target.value)} placeholder="Capability key, e.g. electrical-installation" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.76rem]" />
      <input value={masterCapabilityLabel} onChange={e=>setMasterCapabilityLabel(e.target.value)} placeholder="Capability label" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.76rem]" />
      <input value={masterEvidence} onChange={e=>setMasterEvidence(e.target.value)} placeholder="Evidence reference" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.76rem]" />
      <button disabled={masterBusy||!masterCapabilityKey.trim()||!masterCapabilityLabel.trim()||!masterEvidence.trim()} onClick={()=>void submitMasterClaim()} className="rounded-xl bg-forest-600 text-cream-50 px-4 py-2 text-[0.74rem] font-medium disabled:opacity-50">Submit capability claim</button>
      {masterClaim && <p className="text-[0.72rem] text-sand-600">{masterClaim.capabilityLabel}: {masterClaim.claimStatus.replace(/_/g, ' ')}</p>}

      <div className="rounded-xl bg-cream-50 px-3 py-3 space-y-2">
        <p className="text-[0.72rem] font-medium text-forest-700">Independent review</p>
        <input value={reviewerKs} onChange={e=>setReviewerKs(e.target.value)} placeholder="Reviewer KS Number" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.74rem]" />
        <input value={reviewAgreementId} onChange={e=>setReviewAgreementId(e.target.value)} placeholder="Review Agreement id (optional)" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.74rem]" />
        <input value={reviewFeeReference} onChange={e=>setReviewFeeReference(e.target.value)} placeholder="Review fee reference (optional)" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.74rem]" />
        <button disabled={masterBusy||!masterCapabilityKey.trim()||!reviewerKs.trim()} onClick={()=>void requestReview()} className="rounded-xl border border-forest-200 px-3 py-2 text-[0.74rem] text-forest-700 disabled:opacity-50">Request independent review</button>
        {reviewId && <p className="text-[0.68rem] text-sand-500">Review reference: {reviewId}</p>}
        <input value={reviewId} onChange={e=>setReviewId(e.target.value)} placeholder="Review reference to assess" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.74rem]" />
        <select value={reviewOutcome} onChange={e=>setReviewOutcome(e.target.value as MasterReviewOutcome)} className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.74rem]">
          <option value="VERIFIED">Verified</option><option value="MORE_INFORMATION_REQUIRED">More information required</option><option value="NOT_VERIFIED">Not verified</option>
        </select>
        <input value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Review note (optional)" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.74rem]" />
        <button disabled={masterBusy||!reviewId.trim()} onClick={()=>void recordReview()} className="rounded-xl border border-forest-200 px-3 py-2 text-[0.74rem] text-forest-700 disabled:opacity-50">Record review outcome</button>
        <p className="text-[0.66rem] text-sand-500">Payment may compensate the reviewer’s work. It cannot buy a positive verification result.</p>
      </div>
    </div>

    <div className="border-t border-cream-100 pt-4 space-y-3">
      <div><h3 className="text-[0.86rem] font-medium text-forest-800">Apprenticeship progression</h3>
        <p className="text-[0.7rem] text-sand-500">Observe → assist → practise → supervised → reviewed → demonstrate competence.</p></div>
      <input value={apprenticeshipId} onChange={e=>setApprenticeshipId(e.target.value)} placeholder="Apprenticeship Project id" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.76rem]" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input type="number" min={0} value={stageOrdinal} onChange={e=>setStageOrdinal(Number(e.target.value)||0)} className="rounded-xl border border-cream-200 px-3 py-2 text-[0.74rem]" />
        <select value={stage} onChange={e=>setStage(e.target.value as ApprenticeshipStage)} className="rounded-xl border border-cream-200 px-3 py-2 text-[0.72rem]">{stages.map(x=><option key={x}>{x}</option>)}</select>
        <select value={stageResult} onChange={e=>setStageResult(e.target.value as ApprenticeshipStageResult)} className="rounded-xl border border-cream-200 px-3 py-2 text-[0.72rem]">{stageResults.map(x=><option key={x}>{x}</option>)}</select>
      </div>
      <input value={stageEvidence} onChange={e=>setStageEvidence(e.target.value)} placeholder="Evidence reference required for PASS" className="w-full rounded-xl border border-cream-200 px-3 py-2 text-[0.76rem]" />
      <div className="flex flex-wrap gap-2">
        <button disabled={apprenticeBusy||!apprenticeshipId.trim()||(stageResult==='PASS'&&!stageEvidence.trim())} onClick={()=>void recordStage()} className="rounded-xl bg-forest-600 text-cream-50 px-4 py-2 text-[0.74rem] font-medium disabled:opacity-50">Record progression</button>
        <button disabled={apprenticeBusy||!apprenticeshipId.trim()} onClick={()=>void checkCompetence()} className="rounded-xl border border-cream-200 px-4 py-2 text-[0.74rem] text-forest-700 disabled:opacity-50">Check demonstrated competence</button>
      </div>
      {competence!==null && <p className="text-[0.72rem] text-sand-600">Demonstrated competence: {competence?'Yes':'Not yet'}</p>}
    </div>
  </section>;
}
