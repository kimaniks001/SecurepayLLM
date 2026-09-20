import { useEffect, useRef, useSyncExternalStore } from 'react';
import { SourceReference } from '../discovery/ui/SourceReference';
import { ReviewPreview } from './ReviewPreview';
import { SecureAuthCard } from '../../components/SecureAuth';
import { CanonicalAgreementCard } from '../../components/CanonicalAgreement';
import { NoticeCard } from '../../components/NoticeCard';
import { ErrorStateCard } from '../../components/ErrorState';
import { ChoiceButtons } from '../../components/ChoiceButtons';
import type { HandoffController } from './controller';
import type { IdentityController } from '../identity/controller';
import { secureAuthView } from '../identity/view';
import { canonicalAgreementView, handoffNoticeView, handoffErrorView, expiredHandoffView, sourceReferenceView } from './view';

export function HandoffPanel(props: { handoff: HandoffController; identity: IdentityController; onDone: () => void }) {
  const state = useSyncExternalStore(props.handoff.subscribe, props.handoff.getSnapshot, props.handoff.getSnapshot);
  // Focus follows the moment: when the phase changes the region takes focus, so a keyboard or screen-reader
  // user lands on what is now true rather than on a control that has just disappeared.
  const region = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (state.phase !== 'idle' && state.phase !== 'creating') region.current?.focus({ preventScroll: false });
  }, [state.phase]);
  if (state.phase === 'idle') return null;
  return <div ref={region} tabIndex={-1} aria-label="Agreement review" className="space-y-3 focus:outline-none"><HandoffBody {...props} /></div>;
}

function HandoffBody({ handoff, identity, onDone }: { handoff: HandoffController; identity: IdentityController; onDone: () => void }) {
  const state = useSyncExternalStore(handoff.subscribe, handoff.getSnapshot, handoff.getSnapshot);
  const identityState = useSyncExternalStore(identity.subscribe, identity.getSnapshot, identity.getSnapshot);

  useEffect(() => {
    if (state.phase === 'identity-required' && identityState.phase === 'signed-in') {
      void handoff.continueAfterIdentity();
      identity.reset();
    }
  }, [state.phase, identityState.phase, handoff, identity]);

  const leave = () => { handoff.reset(); identity.reset(); onDone(); };

  if (state.phase === 'idle') return null;

  if (state.phase === 'creating') return <p role="status" className="text-sm text-sand-500 px-1">Preparing your review…</p>;

  if (state.phase === 'identity-required') {
    const authData = secureAuthView(identityState);
    return (
      <div className="space-y-3">
        {state.handoff && <ReviewPreview handoff={state.handoff} />}
        <p className="px-1 text-[0.85rem] leading-snug text-sand-700">To review the full Agreement, sign in. Signing in doesn’t create anything or commit you to anything — you’ll come straight back to this.</p>
      <SecureAuthCard
        data={authData}
        values={identityState.phase === 'otp' ? [identityState.otp] : [identityState.ksNumber, identityState.password]}
        disabled={identityState.busy}
        errorText={identityState.error}
        onFieldChange={(index, value) => {
          if (identityState.phase === 'otp') identity.setOtp(value);
          else if (index === 0) identity.setKsNumber(value);
          else identity.setPassword(value);
        }}
        onChoice={value => {
          if (value === 'submit_credentials') void identity.submitCredentials();
          else if (value === 'submit_otp') void identity.submitOtp();
          else if (value === 'reset_credentials') identity.reset();
          else if (value === 'cancel_auth') leave();
        }}
      />
      </div>
    );
  }

  if (state.phase === 'adopting') return <p role="status" className="text-sm text-sand-500 px-1">Signing you in to the same review…</p>;

  if (state.phase === 'needs-resolution' && state.handoff) {
    return (
      <div className="space-y-3">
        <NoticeCard data={handoffNoticeView(state.handoff)} />
        {state.handoff.unresolvedMatters.map((matter, i) => <p key={i} className="text-[0.8rem] text-sand-600 px-1">{matter}</p>)}
        <ChoiceButtons data={{ type: 'CHOICE_BUTTONS', choices: [{ label: 'Return to conversation', value: 'back' }] }} onChoice={leave} />
      </div>
    );
  }

  if (state.phase === 'review-loading') return <p role="status" className="text-sm text-sand-500 px-1">Preparing your review…</p>;

  if (state.phase === 'review-ready' && state.handoff && state.review) {
    return (
      <div className="space-y-3">
      {state.changedDuringSignIn && <NoticeCard data={{ type: 'NOTICE', label: 'This changed while you signed in', text: 'What SecurePay understands moved on while you were signing in, so what follows is not what you read before. Look it over again before creating anything.', tone: 'worth_checking' }} />}
      <CanonicalAgreementCard
        data={canonicalAgreementView(state.review, state.handoff)}
        onChoice={value => {
          if (value === 'create_draft') void handoff.createDraft();
          else if (value === 'refresh_review') void handoff.refresh();
          else if (value === 'back_to_conversation') leave();
        }}
      />
      </div>
    );
  }

  if (state.phase === 'review-stale' && state.handoff) {
    // A stale handoff is frozen: re-reading it cannot make it fresh and the browser never edits it. When the
    // bound source CHANGED, "Review current source" asks SecurePay for a NEW review from the live listing;
    // if it is UNAVAILABLE (or the conversation itself moved) the only real way on is back to the conversation.
    const source = state.handoff.reviewedSource;
    const canUseCurrentSource = source?.sourceStatus === 'CHANGED';
    return (
      <div className="space-y-3">
        <NoticeCard data={handoffNoticeView(state.handoff)} />
        {state.error && <p role="alert" className="px-1 text-[0.85rem] text-ember-700">{state.error}</p>}
        {source && <SourceReference source={sourceReferenceView(source)} />}
        <ChoiceButtons
          data={{ type: 'CHOICE_BUTTONS', choices: [
            ...(canUseCurrentSource ? [{ label: 'Review with the current listing', value: 'use_current_source' }] : []),
            { label: 'Back to the conversation', value: 'restart' },
          ] }}
          onChoice={value => { if (value === 'use_current_source') void handoff.useCurrentSource(); else leave(); }}
        />
      </div>
    );
  }

  if (state.phase === 'progressing') return <p role="status" className="text-sm text-sand-500 px-1">Creating the draft Agreement…</p>;

  if (state.phase === 'progress-uncertain' && state.handoff) {
    // A timeout is not proof it failed: SecurePay may already have created the draft. Ask, or retry the SAME request.
    return (
      <div className="space-y-3">
        <NoticeCard data={{ type: 'NOTICE', label: 'We’re not sure that went through', text: state.error ?? 'SecurePay did not confirm whether the draft was created.', tone: 'worth_checking' }} />
        <ChoiceButtons data={{ type: 'CHOICE_BUTTONS', choices: [{ label: 'Check what happened', value: 'check' }, { label: 'Try again', value: 'retry' }] }}
          onChoice={value => { if (value === 'check') void handoff.checkOutcome(); else void handoff.createDraft(); }} />
        <p className="px-1 text-[0.78rem] text-sand-600">Trying again sends the same request — it can’t create a second draft.</p>
      </div>
    );
  }

  if (state.phase === 'progressed' && state.handoff) {
    return (
      <div className="space-y-3">
        <NoticeCard data={handoffNoticeView(state.handoff)} />
        <ChoiceButtons data={{ type: 'CHOICE_BUTTONS', choices: [{ label: 'Back to the conversation', value: 'done' }] }} onChoice={leave} />
      </div>
    );
  }

  if (state.phase === 'expired') return <ErrorStateCard data={expiredHandoffView()} onChoice={leave} />;

  return <ErrorStateCard data={handoffErrorView(state.error ?? 'SecurePay could not complete this step.')} onChoice={leave} />;
}
