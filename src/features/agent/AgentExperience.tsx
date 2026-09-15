import { useState, useSyncExternalStore } from 'react';
import { SignedOutHome } from '../../components/SignedOutHome';
import { ConversationWorkspace } from '../../components/ConversationWorkspace';
import { ContextPanel } from '../../components/ContextPanel';
import { NavBar } from '../../components/NavBar';
import { AgentIcon } from '../../components/AgentIcon';
import { MessageBubble } from '../../components/MessageBubble';
import { AgreementPreviewCard } from '../../components/AgreementPreview';
import type { AgentComponentView } from '../../api/securepay/agent/adapters';
import type { AgentGateway } from '../../api/securepay/agent';
import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { createAgentController } from './controller';
import { TradeContext } from './TradeContext';
import { createHandoffController } from '../handoff/controller';
import { HandoffPanel } from '../handoff/HandoffPanel';
import { createIdentityController } from '../identity/controller';

function RichResponse({ component, onReview }: { component: AgentComponentView; onReview: () => void }) {
  if (component.type === 'MESSAGE') return <MessageBubble text={component.text} sender="agent" />;
  if (component.type === 'AGREEMENT_PREVIEW') return <AgreementPreviewCard data={component} onChoice={choice => { if (choice === 'review_agreement') onReview(); }} />;
  return <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
    <div className="px-4 py-3 text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide">{component.title}</div>
    <dl className="px-4 pb-4 space-y-2">{component.rows.map((row, i) => <div key={i} className="break-words"><dt className="text-[0.7rem] text-sand-500">{row.label}</dt><dd className="text-[0.875rem] text-forest-800">{row.value}</dd></div>)}</dl>
    <p className="px-4 py-2 bg-cream-50 text-[0.75rem] text-sand-500">For consideration. No provider or terms have been selected by viewing this.</p>
  </div>;
}
const noop = () => {};
export function AgentExperience({ gateway, auth, session }: { gateway: AgentGateway; auth: AuthGateway; session: SessionStore }) {
  const [controller, setController] = useState(() => createAgentController(gateway));
  const [handoffController, setHandoffController] = useState(() => createHandoffController(gateway));
  const [identityController, setIdentityController] = useState(() => createIdentityController(auth, session));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const handoffState = useSyncExternalStore(handoffController.subscribe, handoffController.getSnapshot);
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [home, setHome] = useState(false);
  const reviewing = () => { setExpanded(true); void controller.review(); };
  const startNewConversation = () => {
    setController(createAgentController(gateway));
    setHandoffController(createHandoffController(gateway));
    setIdentityController(createIdentityController(auth, session));
    setExpanded(false);
    setNotice(null);
  };
  const context = <TradeContext state={state} controller={controller} expanded={expanded} onToggle={() => setExpanded(value => !value)} />;
  const lastResponse = [...state.turns].reverse().find(turn => turn.sender === 'agent');
  const panel = lastResponse?.sender === 'agent' ? lastResponse.response.panel : null;
  const showHome = home || state.turns.length === 0;
  return <div className="h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
    <NavBar view={showHome ? 'signed-out' : 'conversation'} onNavigate={view => {
      if (view === 'signed-in') setHome(true);
      else setNotice('This area is not available yet. You can keep talking with SecurePay.');
    }} />
    {notice && <div role="status" className="px-4 py-2 text-sm text-sand-600 bg-cream-50">{notice} <button onClick={() => setNotice(null)} className="underline">Dismiss</button></div>}
    {showHome ? <div className="flex-1 overflow-auto">
      {state.turns.length > 0 && <button onClick={() => setHome(false)} className="px-6 py-3 text-forest-700 underline">Return to conversation</button>}
      <SignedOutHome disabled={state.busy || !!state.pending} onStart={text => { setHome(false); if (!state.busy && !state.pending) void controller.send(text); }} />
    </div> : <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 md:flex-[1.35] flex flex-col min-w-0 bg-cream-50">
        <div className="flex items-center gap-2.5 px-4 md:px-6 py-3 border-b border-cream-200/60">
          <AgentIcon state={state.busy ? 'thinking' : 'listening'} size={28} />
          <div><div className="font-display text-sm text-forest-800">SecurePay</div><div className="text-[0.7rem] text-sand-500">{state.busy ? 'thinking' : 'listening'}</div></div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationWorkspace turns={[]} understandingContent={context} isThinking={state.busy} inputDisabled={state.busy || !!state.pending}
            onSend={text => void controller.send(text)} selectedProviderId={null} onSelectProvider={noop} onPhotoUpload={noop} onPhotoSkip={noop} onDateSelect={noop} onChoice={noop}
            conversationContent={[
              ...state.turns.map(turn => <div key={turn.id} className="space-y-3">
                {turn.sender === 'user' ? <MessageBubble text={turn.text} sender="user" /> : <>
                  <MessageBubble text={turn.response.message.text} sender="agent" />
                  {turn.response.components.filter(component => component.type !== 'MESSAGE' || component.text !== turn.response.message.text).map((component, i) => <RichResponse key={i} component={component} onReview={reviewing} />)}
                  {turn.response.panel && <div className="md:hidden space-y-3">{turn.response.panel.components.map((component, i) => <RichResponse key={i} component={component} onReview={reviewing} />)}</div>}
                </>}
              </div>),
              handoffState.phase !== 'idle' && <div key="handoff" className="space-y-3">
                <HandoffPanel handoff={handoffController} identity={identityController} onDone={noop} />
              </div>,
            ]}
            statusContent={<div className="space-y-3">
              {state.error && <div role="alert" className="rounded-xl border border-cream-200 bg-white p-3 text-sm text-sand-700">{state.pending?.kind === 'turn' && 'SecurePay could not complete your turn. '}{state.error}
                <button disabled={state.busy} onClick={() => void controller.retry()} className="block mt-2 text-forest-700 underline disabled:opacity-40">Retry {state.pending?.kind === 'adopt' ? 'Use this' : 'turn'}</button>
              </div>}
              <div className="flex flex-wrap gap-3 text-sm text-forest-700">
                <button disabled={state.busy} onClick={reviewing} className="underline disabled:opacity-40">Review what we have</button>
                <button
                  disabled={!state.conversationId || state.busy || !!state.pending || handoffState.phase !== 'idle'}
                  onClick={() => { if (state.conversationId) void handoffController.start(state.conversationId); }}
                  className="underline disabled:opacity-40"
                >
                  Continue with this
                </button>
                <button disabled={state.busy} onClick={startNewConversation} className="text-sand-500 underline disabled:opacity-40">Start new conversation</button>
              </div>
            </div>} />
        </div>
      </div>
      <div className="hidden md:flex md:flex-[1] flex-col border-l border-cream-200/60 bg-cream-100/50 min-w-0">
        <ContextPanel lastRichResponses={[]} selectedProviderId={null} onSelectProvider={noop} panelTitle={panel?.title || 'Trade taking shape'} panelMode="understanding"
          contextContent={<>{context}<div className="space-y-3">{panel?.components.map((component, i) => <RichResponse key={i} component={component} onReview={reviewing} />)}</div></>} />
      </div>
    </div>}
  </div>;
}
