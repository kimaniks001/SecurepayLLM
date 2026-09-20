import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ShieldCheck, Award, Check, ArrowRight, FileText } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { SecureAuthCard } from '../../components/SecureAuth';
import { ErrorStateCard } from '../../components/ErrorState';
import { Surface, SurfaceBody } from '../../components/dna/Surface';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { MoneyValue } from '../../components/dna/MoneyValue';
import { decimalMoney } from '../../decimalMoney';
import type { MasterGateway } from '../../api/securepay/master';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import type { AppView, ErrorStateResponse } from '../../types';
import { createMasterController, errorText } from './controller';
import type { MasterRequestSourceContext } from '../../api/securepay/master/dto';
import { createIdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';

function errorView(message: string): ErrorStateResponse {
  return { type: 'ERROR_STATE', title: 'SecurePay could not load this', text: message, primaryLabel: 'Try again', primaryValue: 'retry' };
}

const SOURCE_CONTEXTS: { value: MasterRequestSourceContext; label: string }[] = [
  { value: 'GENERAL_ADVICE', label: 'General advice' },
  { value: 'PRE_TRADE_INSPECTION', label: 'Pre-trade inspection' },
  { value: 'AGREEMENT_MILESTONE_REVIEW', label: 'Agreement milestone review' },
  { value: 'AGREEMENT_OBLIGATION_REVIEW', label: 'Agreement obligation review' },
];

type View = 'lookup' | 'profile' | 'request-create' | 'request-detail' | 'opinion-form';

export function MasterExperience({ gateway, auth, session, initialIdentityId, onNavigate }: {
  gateway: MasterGateway; auth: AuthGateway; session: SessionStore;
  initialIdentityId?: string | null;
  onNavigate: (view: AppView) => void;
}) {
  const [controller] = useState(() => createMasterController(gateway));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const identityState = useSyncExternalStore(identityController.subscribe, identityController.getSnapshot);
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [lookupInput, setLookupInput] = useState(initialIdentityId ?? '');
  const [requestLookupInput, setRequestLookupInput] = useState('');
  const [view, setView] = useState<View>(initialIdentityId ? 'profile' : 'lookup');
  const [costCurrency, setCostCurrency] = useState('KES');
  const [costAmount, setCostAmount] = useState('');
  const [signInGate, setSignInGate] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (initialIdentityId) void controller.lookupProfile(initialIdentityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionState.status !== 'signed-in') {
      controller.resetSession();
      setView(current => (current === 'request-create' || current === 'request-detail' || current === 'opinion-form' ? 'profile' : current));
    }
  }, [sessionState.status, controller]);

  const navBarView: AppView = 'community';
  const requireAuth = (after: () => void) => {
    if (sessionState.status === 'signed-in') { after(); return; }
    setPendingAction(() => after);
    setSignInGate(true);
  };

  useEffect(() => {
    if (signInGate && sessionState.status === 'signed-in') {
      const action = pendingAction;
      setSignInGate(false);
      setPendingAction(null);
      setIdentityController(createIdentityController(auth, session));
      if (action) action();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signInGate, sessionState.status]);

  if (signInGate) {
    const authData = secureAuthView(identityState);
    return (
      <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
        <NavBar view={navBarView} onNavigate={onNavigate} />
        <div className="flex-1 flex items-center justify-center p-6">
          <SecureAuthCard
            data={authData}
            values={identityState.phase === 'otp' ? [identityState.otp] : [identityState.ksNumber, identityState.password]}
            disabled={identityState.busy}
            errorText={identityState.error}
            onFieldChange={(index, value) => {
              if (identityState.phase === 'otp') identityController.setOtp(value);
              else if (index === 0) identityController.setKsNumber(value);
              else identityController.setPassword(value);
            }}
            onChoice={value => {
              if (value === 'submit_credentials') void identityController.submitCredentials();
              else if (value === 'submit_otp') void identityController.submitOtp();
              else if (value === 'reset_credentials') identityController.reset();
              else if (value === 'cancel_auth') { setSignInGate(false); setPendingAction(null); setIdentityController(createIdentityController(auth, session)); }
            }}
          />
        </div>
      </div>
    );
  }

  const openRequestByReference = () => {
    const requestId = requestLookupInput.trim();
    if (!requestId) return;
    requireAuth(() => {
      void controller.loadRequest(requestId).then(ok => { if (ok) setView('request-detail'); });
    });
  };

  let body: React.ReactNode;

  if (view === 'lookup') {
    body = (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <Surface>
          <SurfaceBody>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Find a Master</div>
            <p className="text-[0.825rem] text-sand-600 mb-3">
              SecurePay does not yet have a searchable Master directory. If you already have a specific Master's reference, enter it below.
            </p>
            <input value={lookupInput} onChange={e => setLookupInput(e.target.value)} placeholder="Master reference (identity id)" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mb-3" />
            <Button onClick={() => { void controller.lookupProfile(lookupInput); setView('profile'); }} disabled={!lookupInput.trim()} className="w-full flex items-center justify-center gap-2 py-3">
              Look up Master <ArrowRight className="w-4 h-4" />
            </Button>
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceBody>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Open a Master request</div>
            <p className="text-[0.825rem] text-sand-600 mb-3">
              If a request was assigned to you, open it using its request reference. SecurePay will enforce whether you are allowed to act on it.
            </p>
            <input value={requestLookupInput} onChange={e => setRequestLookupInput(e.target.value)} placeholder="Master request reference" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mb-3" />
            {state.request.status === 'error' && <StatusNotice tone="warning" icon={false} className="mb-3">{errorText(state.request.error, false) === 'not-found' ? 'That Master request was not found.' : errorText(state.request.error, false)}</StatusNotice>}
            <Button variant="secondary" onClick={openRequestByReference} disabled={!requestLookupInput.trim() || state.request.status === 'loading'} className="w-full flex items-center justify-center gap-2 py-3">
              {state.request.status === 'loading' ? 'Opening request…' : 'Open assigned request'} <ArrowRight className="w-4 h-4" />
            </Button>
          </SurfaceBody>
        </Surface>
      </div>
    );
  } else if (view === 'profile') {
    if (state.profile.status === 'error') {
      const message = errorText(state.profile.error, false);
      body = <div className="p-6">{message === 'not-found'
        ? <ErrorStateCard data={errorView('No designated Master was found for that reference.')} onChoice={() => { controller.resetProfile(); setView('lookup'); }} />
        : <ErrorStateCard data={errorView(message)} onChoice={() => void controller.lookupProfile(lookupInput)} />}
      </div>;
    } else if (state.profile.status !== 'ready') {
      body = <p role="status" className="text-sm text-sand-500 text-center py-10">Loading Master profile…</p>;
    } else {
      const master = state.profile.data;
      body = (
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
          <Surface className="animate-quiet-in">
            <SurfaceBody>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5 text-sand-500" /></div>
                <div className="flex-1">
                  <div className="text-[0.875rem] font-medium text-forest-800">Master reference: {master.identityId}</div>
                  <div className="text-[0.72rem] text-sand-500 mt-0.5">SecurePay Master designation — {master.designationStatus.toLowerCase()}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-[0.72rem] text-sand-500 mb-1">Expertise</div>
                <div className="flex flex-wrap gap-1.5">{master.expertiseDomains.map((exp, i) => <span key={i} className="text-[0.72rem] text-forest-700 bg-forest-50 border border-forest-100 rounded-full px-2 py-0.5">{exp}</span>)}</div>
              </div>
              <div className="mt-3 space-y-1.5">
                {master.serviceArea && <div className="text-[0.78rem] text-sand-600">Service area: {master.serviceArea}</div>}
                <div className="text-[0.78rem] text-sand-600">Availability: {master.availabilityStatus}</div>
                {master.pricingBasis && <div className="text-[0.78rem] text-sand-600">Pricing basis: {master.pricingBasis}</div>}
                {master.inspectionCapable && <div className="flex items-center gap-1.5 text-[0.78rem] text-forest-600"><Check className="w-3.5 h-3.5" />Site inspection capability</div>}
              </div>
              {master.qualificationRefs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-cream-100">
                  <div className="flex items-center gap-1.5 text-[0.72rem] font-medium text-sand-500 mb-1"><Award className="w-3.5 h-3.5" />Qualification references</div>
                  <ul className="space-y-0.5">{master.qualificationRefs.map((q, i) => <li key={i} className="text-[0.78rem] text-forest-800">· {q}</li>)}</ul>
                </div>
              )}
              {master.accreditationRefs.length > 0 && (
                <div className="mt-2"><div className="text-[0.72rem] font-medium text-sand-500 mb-1">Accreditation references</div><ul className="space-y-0.5">{master.accreditationRefs.map((a, i) => <li key={i} className="text-[0.78rem] text-forest-800">· {a}</li>)}</ul></div>
              )}
            </SurfaceBody>
          </Surface>
          <Surface className="bg-cream-50/50">
            <SurfaceBody>
              <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Master status vs statutory licence</div>
              <p className="text-[0.78rem] text-sand-600">A qualification/accreditation reference is shown exactly as SecurePay recorded it. Master designation is not itself a statutory licence, certification, or SecurePay endorsement.</p>
            </SurfaceBody>
          </Surface>
          <Button onClick={() => requireAuth(() => { controller.setDraft({ masterIdentityId: master.identityId }); setView('request-create'); })} className="w-full flex items-center justify-center gap-2 py-3">
            Request Master assessment <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      );
    }
  } else if (view === 'request-create') {
    body = (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <Surface className="animate-quiet-in">
          <SurfaceBody>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">New Master request</div>
            <p className="text-[0.72rem] text-sand-500">This is what will be sent. Review it before submitting — nothing is requested until you submit.</p>
            <div><label className="text-[0.72rem] text-sand-500">What kind of engagement is this?</label><select value={state.draft.sourceContext} onChange={e => controller.setDraft({ sourceContext: e.target.value as MasterRequestSourceContext })} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mt-1">{SOURCE_CONTEXTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            <div><label className="text-[0.72rem] text-sand-500">Related Agreement (optional)</label><input value={state.draft.agreementId} onChange={e => controller.setDraft({ agreementId: e.target.value })} placeholder="Agreement id, if this relates to one" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mt-1" /></div>
            <div><label className="text-[0.72rem] text-sand-500">Question</label><textarea value={state.draft.question} onChange={e => controller.setDraft({ question: e.target.value })} rows={2} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mt-1" /></div>
            <div><label className="text-[0.72rem] text-sand-500">Scope</label><textarea value={state.draft.scope} onChange={e => controller.setDraft({ scope: e.target.value })} rows={2} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mt-1" /></div>
            <div><label className="text-[0.72rem] text-sand-500">Evidence references (one per line, optional)</label><textarea value={state.draft.evidenceRefs} onChange={e => controller.setDraft({ evidenceRefs: e.target.value })} rows={2} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mt-1" /></div>
            <label className="flex items-center gap-2 text-[0.8rem] text-sand-600"><input type="checkbox" checked={state.draft.siteVisitRequired} onChange={e => controller.setDraft({ siteVisitRequired: e.target.checked })} />Site visit required</label>
            {state.request.status === 'error' && <StatusNotice tone="warning" icon={false}>{errorText(state.request.error, true)}</StatusNotice>}
            <Button
              onClick={() => void controller.submitRequest().then(ok => {
                if (!ok) return;
                const current = controller.getSnapshot().request;
                if (current.status === 'ready') setRequestLookupInput(current.data.id);
                setView('request-detail');
              })}
              disabled={!state.draft.question.trim() || !state.draft.scope.trim() || state.request.status === 'loading'}
              className="w-full flex items-center justify-center gap-2 py-3"
            >
              {state.request.status === 'loading' ? 'Submitting request…' : 'Submit Master request'} <ArrowRight className="w-4 h-4" />
            </Button>
          </SurfaceBody>
        </Surface>
      </div>
    );
  } else if (view === 'request-detail') {
    if (state.request.status === 'error') {
      const message = errorText(state.request.error, false);
      body = <div className="p-6"><ErrorStateCard data={errorView(message === 'not-found' ? 'That Master request was not found.' : message)} onChoice={() => {
        if (requestLookupInput.trim()) void controller.loadRequest(requestLookupInput.trim());
        else setView('lookup');
      }} /></div>;
    } else if (state.request.status !== 'ready') {
      body = <p role="status" className="text-sm text-sand-500 text-center py-10">Loading Master request…</p>;
    } else {
      const req = state.request.data;
      body = (
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
          <Surface className="animate-quiet-in">
            <SurfaceBody>
              <div className="flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-forest-500" /><span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Question</span></div>
              <p className="text-[0.875rem] text-forest-800 leading-relaxed">{req.question}</p>
            </SurfaceBody>
          </Surface>
          <Surface>
            <SurfaceBody>
              <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Scope</div>
              <p className="text-[0.825rem] text-forest-800 leading-relaxed">{req.scope}</p>
            </SurfaceBody>
          </Surface>
          <Surface>
            <SurfaceBody>
              <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Status</div>
              <p className="text-[0.9rem] text-forest-800 font-medium">{req.status.replace(/_/g, ' ')}</p>
              {req.currency && req.quotedCostMinor && <div className="text-[0.82rem] text-sand-600 mt-1">Quoted cost: <MoneyValue amount={decimalMoney(req.quotedCostMinor, req.currency)} size="sm" /></div>}
            </SurfaceBody>
          </Surface>
          {state.requestActionError && <StatusNotice tone="warning" icon={false}>{state.requestActionError}</StatusNotice>}

          {req.status === 'REQUESTED' && (
            <Surface>
              <SurfaceBody className="space-y-2">
                <div className="text-[0.72rem] text-sand-500">Propose cost (Master only — SecurePay enforces this)</div>
                <div className="flex gap-2"><input value={costCurrency} onChange={e => setCostCurrency(e.target.value)} className="w-20 rounded-lg border border-cream-200 px-2 py-2 text-[0.85rem]" /><input value={costAmount} onChange={e => setCostAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Amount (minor units)" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" /></div>
                <Button onClick={() => requireAuth(() => void controller.proposeCost(req.id, costCurrency.trim(), Number(costAmount || 0)))} disabled={!costCurrency.trim() || !costAmount || state.requestActionBusy} className="w-full py-2.5">Propose cost</Button>
                <Button variant="secondary" onClick={() => requireAuth(() => void controller.declineRequest(req.id))} disabled={state.requestActionBusy} className="w-full py-2.5">Decline (Master only)</Button>
              </SurfaceBody>
            </Surface>
          )}
          {req.status === 'COST_PROPOSED' && (
            <Surface>
              <SurfaceBody className="space-y-2">
                <StatusNotice tone="warning">Accepting this cost does not create or move Money. Payment for Master services is a separate path, not automatic from Agreement funds.</StatusNotice>
                <Button onClick={() => requireAuth(() => void controller.acceptCost(req.id))} disabled={state.requestActionBusy} className="w-full py-2.5">Accept cost (Requester only)</Button>
                <Button variant="secondary" onClick={() => requireAuth(() => void controller.declineRequest(req.id))} disabled={state.requestActionBusy} className="w-full py-2.5">Decline (Master only)</Button>
              </SurfaceBody>
            </Surface>
          )}
          {req.status === 'ACCEPTED' && <Button onClick={() => requireAuth(() => setView('opinion-form'))} className="w-full py-2.5">Submit opinion (Master only)</Button>}
          {(req.status === 'DECLINED' || req.status === 'CANCELLED') && <p className="text-[0.78rem] text-sand-500 px-1">This request is closed and cannot progress further.</p>}
          {req.status === 'OPINION_SUBMITTED' && <p className="text-[0.78rem] text-forest-600 px-1">An opinion has been submitted for this request.</p>}
          <p className="text-[0.68rem] text-sand-400 italic px-2">Master opinion does not automatically change Agreement, resolve dispute, or release Money.</p>
        </div>
      );
    }
  } else {
    const req = state.request.status === 'ready' ? state.request.data : null;
    body = (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <Surface>
          <SurfaceBody className="space-y-3">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Submit Master opinion</div>
            <textarea value={state.opinionDraft.observations} onChange={e => controller.setOpinionDraft({ observations: e.target.value })} placeholder="Observations" rows={2} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
            <textarea value={state.opinionDraft.opinionText} onChange={e => controller.setOpinionDraft({ opinionText: e.target.value })} placeholder="Opinion" rows={2} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
            <textarea value={state.opinionDraft.limitations} onChange={e => controller.setOpinionDraft({ limitations: e.target.value })} placeholder="Limitations" rows={2} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
            <textarea value={state.opinionDraft.siteVisitDetails} onChange={e => controller.setOpinionDraft({ siteVisitDetails: e.target.value })} placeholder="Site visit details (if applicable)" rows={2} className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
            {state.requestActionError && <StatusNotice tone="warning" icon={false}>{state.requestActionError}</StatusNotice>}
            <Button
              onClick={() => { if (req) void controller.submitOpinion(req.id).then(ok => { if (ok) setView('request-detail'); }); }}
              disabled={!state.opinionDraft.opinionText.trim() || state.requestActionBusy || !req || state.opinion.status === 'ready'}
              className="w-full flex items-center justify-center gap-2 py-3"
            >
              {state.requestActionBusy ? 'Submitting opinion…' : state.opinion.status === 'ready' ? 'Opinion submitted' : 'Submit opinion'} <ArrowRight className="w-4 h-4" />
            </Button>
          </SurfaceBody>
        </Surface>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view={navBarView} onNavigate={onNavigate} />
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={() => (view === 'lookup' ? onNavigate('ecosystem') : setView(view === 'profile' ? 'lookup' : 'profile'))} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors"><ArrowLeft className="w-3.5 h-3.5" />Back</button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">{body}</div>
    </div>
  );
}
