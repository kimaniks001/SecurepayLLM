import { useSyncExternalStore } from 'react';
import { ArrowLeft, Check, X, KeyRound, Webhook as WebhookIcon, QrCode } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { Surface, SurfaceBody } from '../../components/dna/Surface';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { PageHeader } from '../../components/dna/PageHeader';
import type { AppView } from '../../types';
import type { DeveloperController } from './controller';

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[0.82rem]">
      {ok ? <Check className="w-3.5 h-3.5 text-forest-600" /> : <X className="w-3.5 h-3.5 text-sand-400" />}
      <span className={ok ? 'text-forest-800' : 'text-sand-500'}>{label}</span>
    </div>
  );
}

/**
 * Phase 5 -- Developer/Connect: the real part of the Developer Platform reachable from a signed-in
 * KS person's own session (application, credential, webhook, and SecureCode management).
 *
 * Final correction: `DeveloperPlatformAuthorization.requireOwnerOrInternalActor` requires the
 * authenticated actor's OWN `actorKsNumber()` to exactly equal `ownerBusinessKsNumber` (confirmed by
 * reading it directly on current `SecurePayAPI main`) -- Organization RBAC admin/membership is never
 * consulted. A person who administers a Business through Organization membership does NOT thereby
 * gain Developer application ownership for it; only signing in as that Business KS identity itself
 * (or a trusted internal actor) does. This screen states that requirement explicitly rather than
 * implying "Business admin" is sufficient.
 *
 * Sandbox simulation and hosted Money-session creation happen from the developer's own backend using
 * the credential issued here -- they authenticate as an application, not a signed-in person, so no
 * working "simulate" button is offered inside this web app; see the notice below.
 */
export function DeveloperExperience({ controller, onNavigate }: {
  controller: DeveloperController;
  onNavigate: (view: AppView) => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const application = state.application.data;

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view="signed-in" onNavigate={onNavigate} />
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4 w-full">
        <button onClick={() => onNavigate('account')} className="flex items-center gap-1.5 text-sand-500 hover:text-forest-600 text-[0.8rem]">
          <ArrowLeft className="w-3.5 h-3.5" /> Account
        </button>
        <PageHeader title="Developer / Connect" description="Bring SecurePay into your own product: register an application, issue credentials, and receive webhooks. Only real, backend-verified capability is shown here." />

        {!application && (
          <Surface>
            <SurfaceBody>
              <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Register an application</div>
              <p className="text-[0.72rem] text-sand-500 mb-2">The signed-in actor must currently be that Business KS identity itself (or a trusted internal actor) — an Organization admin acting from a personal KS session cannot register or manage a Business's applications yet. If that's not who you're signed in as, SecurePay will fail this closed rather than let it through.</p>
              <input value={state.registerForm.name} onChange={e => controller.setRegisterForm({ name: e.target.value })} placeholder="Application name" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mb-2" />
              <input value={state.registerForm.ownerBusinessKsNumber} onChange={e => controller.setRegisterForm({ ownerBusinessKsNumber: e.target.value })} placeholder="Owning Business KS Number (must match the identity you're signed in as)" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mb-2" />
              <div className="flex gap-2 mb-2">
                {(['SANDBOX', 'PRODUCTION'] as const).map(env => (
                  <button key={env} onClick={() => controller.setRegisterForm({ environment: env })} className={`flex-1 rounded-lg border px-3 py-2 text-[0.8rem] capitalize ${state.registerForm.environment === env ? 'border-forest-500 text-forest-700 bg-forest-50' : 'border-cream-200 text-sand-600'}`}>{env.toLowerCase()}</button>
                ))}
              </div>
              {state.lifecycleError && <StatusNotice tone="warning" icon={false} className="mb-2">{state.lifecycleError}</StatusNotice>}
              <Button onClick={() => void controller.registerApplication()} disabled={!state.registerForm.name.trim() || !state.registerForm.ownerBusinessKsNumber.trim() || state.lifecycleBusy} className="w-full py-2.5">
                {state.lifecycleBusy ? 'Registering…' : 'Register application'}
              </Button>
              <p className="text-[0.72rem] text-sand-500 mt-2">Sandbox applications can never reach production Money or Agreement authority. Production applications go through SecurePay's own review before they can move real value.</p>
            </SurfaceBody>
          </Surface>
        )}

        {application && (
          <>
            <Surface className="animate-quiet-in">
              <SurfaceBody>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[0.9rem] text-forest-800 font-medium">{application.name}</div>
                    <div className="text-[0.72rem] text-sand-500 mt-0.5">{application.ownerBusinessKsNumber} · {application.environment}</div>
                  </div>
                  <span className={`text-[0.68rem] uppercase tracking-wide shrink-0 ${application.status === 'ACTIVE' ? 'text-forest-600' : 'text-ember-600'}`}>{application.status}</span>
                </div>
                <div className="text-[0.72rem] text-sand-500 mt-2">Production access: {application.productionAccessState.replace(/_/g, ' ').toLowerCase()}</div>
                {state.lifecycleError && <StatusNotice tone="warning" icon={false} className="mt-2">{state.lifecycleError}</StatusNotice>}
                <div className="flex gap-2 mt-3">
                  {application.status === 'ACTIVE'
                    ? <Button variant="secondary" onClick={() => void controller.setApplicationLifecycle('suspend')} disabled={state.lifecycleBusy} className="flex-1">Suspend</Button>
                    : <Button variant="secondary" onClick={() => void controller.setApplicationLifecycle('reactivate')} disabled={state.lifecycleBusy} className="flex-1">Reactivate</Button>}
                  <Button variant="ghost" onClick={() => void controller.setApplicationLifecycle('revoke')} disabled={state.lifecycleBusy}>Revoke</Button>
                </div>
              </SurfaceBody>
            </Surface>

            <Surface>
              <SurfaceBody>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Integration readiness</div>
                  <button onClick={() => void controller.runIntegrationCheck()} className="text-[0.75rem] text-forest-700 underline">Check now</button>
                </div>
                {state.integrationCheck.status === 'loading' && <p role="status" className="text-sm text-sand-500">Checking…</p>}
                {state.integrationCheck.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.integrationCheck.error}</StatusNotice>}
                {state.integrationCheck.status === 'ready' && state.integrationCheck.data && (
                  <div className="space-y-1.5">
                    <CheckRow label="Application connected" ok={state.integrationCheck.data.applicationConnected} />
                    <CheckRow label="Identity connected" ok={state.integrationCheck.data.identityConnected} />
                    <CheckRow label="Credentials working" ok={state.integrationCheck.data.credentialsWorking} />
                    <CheckRow label="Status updates connected" ok={state.integrationCheck.data.statusUpdatesConnected} />
                    <CheckRow label="Callbacks connected" ok={state.integrationCheck.data.callbacksConnected} />
                    <div className="pt-1.5 mt-1.5 border-t border-cream-100"><CheckRow label="Ready to test a trade" ok={state.integrationCheck.data.readyToTestTrade} /></div>
                  </div>
                )}
              </SurfaceBody>
            </Surface>

            <Surface>
              <SurfaceBody>
                <div className="flex items-center gap-2 text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2"><KeyRound className="w-3.5 h-3.5" /> API credentials</div>
                <input value={state.credentialScopesInput} onChange={e => controller.setCredentialScopesInput(e.target.value)} placeholder="Scopes, comma-separated (e.g. AGREEMENTS_READ, WEBHOOKS_MANAGE)" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mb-2" />
                <Button onClick={() => void controller.issueCredential()} disabled={!state.credentialScopesInput.trim() || state.credentialBusy} className="w-full py-2.5 mb-2">
                  {state.credentialBusy ? 'Issuing…' : 'Issue new credential'}
                </Button>
                <div className="flex gap-2 mb-2">
                  <input value={state.rotateRevokeCredentialIdInput} onChange={e => controller.setRotateRevokeCredentialIdInput(e.target.value)} placeholder="Existing credential id" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
                  <Button variant="secondary" onClick={() => void controller.rotateCredential()} disabled={!state.rotateRevokeCredentialIdInput.trim() || state.credentialBusy} className="px-3">Rotate</Button>
                  <Button variant="ghost" onClick={() => void controller.revokeCredential()} disabled={!state.rotateRevokeCredentialIdInput.trim() || state.credentialBusy}>Revoke</Button>
                </div>
                {state.credentialError && <StatusNotice tone="warning" icon={false} className="mb-2">{state.credentialError}</StatusNotice>}
                {state.issuedCredential && (
                  <StatusNotice tone="warning">
                    <div className="text-[0.8rem] font-medium">Copy this secret now — SecurePay cannot show it again.</div>
                    <div className="mt-1 font-mono text-[0.78rem] break-all">{state.issuedCredential.clientId} / {state.issuedCredential.secret}</div>
                    <div className="text-[0.72rem] mt-1">Scopes: {state.issuedCredential.scopes.join(', ')}</div>
                  </StatusNotice>
                )}
              </SurfaceBody>
            </Surface>

            <Surface>
              <SurfaceBody>
                <div className="flex items-center gap-2 text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2"><WebhookIcon className="w-3.5 h-3.5" /> Webhooks</div>
                <input value={state.webhookUrlInput} onChange={e => controller.setWebhookUrlInput(e.target.value)} placeholder="https://your-app.example.com/webhooks" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mb-2" />
                <input value={state.webhookEventsInput} onChange={e => controller.setWebhookEventsInput(e.target.value)} placeholder="Event types, comma-separated" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mb-2" />
                {state.webhookError && <StatusNotice tone="warning" icon={false} className="mb-2">{state.webhookError}</StatusNotice>}
                <Button onClick={() => void controller.registerWebhook()} disabled={!state.webhookUrlInput.trim() || !state.webhookEventsInput.trim() || state.webhookBusy} className="w-full py-2.5">
                  {state.webhookBusy ? 'Registering…' : 'Register webhook endpoint'}
                </Button>
                {state.issuedWebhook && (
                  <StatusNotice tone="warning" className="mt-2">
                    <div className="text-[0.8rem] font-medium">Copy this signing secret now — it cannot be shown again.</div>
                    <div className="mt-1 font-mono text-[0.78rem] break-all">{state.issuedWebhook.signingSecret}</div>
                  </StatusNotice>
                )}

                <div className="mt-3 pt-3 border-t border-cream-100">
                  <div className="flex gap-2 mb-2">
                    <input value={state.deliveriesEndpointIdInput} onChange={e => controller.setDeliveriesEndpointIdInput(e.target.value)} placeholder="Webhook endpoint id" className="flex-1 rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem]" />
                    <Button variant="secondary" onClick={() => void controller.loadDeliveries()} disabled={!state.deliveriesEndpointIdInput.trim()} className="px-4">Deliveries</Button>
                  </div>
                  {state.deliveries.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading…</p>}
                  {state.deliveries.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.deliveries.error}</StatusNotice>}
                  {state.deliveries.status === 'ready' && state.deliveries.data?.length === 0 && <p className="text-[0.78rem] text-sand-500">No deliveries yet.</p>}
                  <ul className="space-y-1.5">
                    {state.deliveries.data?.map(d => (
                      <li key={d.id} className="flex items-center justify-between gap-2 text-[0.78rem]">
                        <span className="text-forest-800">{d.eventType} <span className="text-sand-500">— {d.status} ({d.attemptCount})</span></span>
                        <button onClick={() => void controller.replayDelivery(d.id)} className="text-forest-700 underline shrink-0">Replay</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </SurfaceBody>
            </Surface>

            <Surface>
              <SurfaceBody>
                <div className="flex items-center gap-2 text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2"><QrCode className="w-3.5 h-3.5" /> SecureCode handoff</div>
                <p className="text-[0.78rem] text-sand-600 mb-2">Issue a short-lived code an AI coding tool can redeem to safely learn how to integrate this application — never your secret, never payment authority.</p>
                <input value={state.secureCodeAiToolInput} onChange={e => controller.setSecureCodeAiToolInput(e.target.value)} placeholder="AI tool name (optional)" className="w-full rounded-lg border border-cream-200 px-3 py-2 text-[0.85rem] mb-2" />
                {state.secureCodeError && <StatusNotice tone="warning" icon={false} className="mb-2">{state.secureCodeError}</StatusNotice>}
                <Button onClick={() => void controller.issueSecureCode()} disabled={state.secureCodeBusy} className="w-full py-2.5">{state.secureCodeBusy ? 'Issuing…' : 'Issue SecureCode'}</Button>
                {state.issuedSecureCode && (
                  <div className="mt-2 rounded-xl bg-cream-50 border border-cream-200 px-3 py-2.5">
                    <div className="font-mono text-[0.82rem]">{state.issuedSecureCode.secureCode}</div>
                    <div className="text-[0.7rem] text-sand-500 mt-0.5">Expires {new Date(state.issuedSecureCode.expiresAt).toLocaleString()}</div>
                    <button onClick={() => void controller.revokeSecureCode(state.issuedSecureCode!.id)} className="text-[0.75rem] text-sand-500 underline mt-1.5">Revoke</button>
                  </div>
                )}
              </SurfaceBody>
            </Surface>

            <StatusNotice tone="info">
              Sandbox simulation and hosted Money sessions happen from your own backend, authenticated with the credential above — not from inside this page. This web app signs you in as a person, not as an application, and cannot perform that kind of call on your behalf.
            </StatusNotice>
          </>
        )}
      </div>
    </div>
  );
}
