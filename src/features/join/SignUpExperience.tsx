import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { SignupForm } from './JoinExperience';

/**
 * One human-facing signup doorway for all first-party KS001 surfaces.
 * The controller and /api/v1/auth/signup/start, resend, verify endpoints
 * are unchanged. This does not enrol anyone in an Agreement or the Trust
 * Project, create a Business identity or activate Money.
 */
export function SignUpExperience({ auth, session, onSignIn, onCancel, onIssued }: {
  auth: Pick<AuthGateway, 'signupStart' | 'signupResend' | 'signupVerify'>;
  session: Pick<SessionStore, 'setTokens'>;
  onSignIn: () => void;
  onCancel: () => void;
  onIssued?: (ksNumber: string) => void;
}) {
  return (
    <main id="main" className="flex-1 overflow-auto bg-cream-100 bg-ks001-surface px-3 py-7 sm:px-5 md:py-12" data-public-sign-up>
      {/* Keep the legacy onboarding selector for compatibility; the experience itself is one compact form. */}
      <div className="mx-auto w-full max-w-lg" data-gate-c-three-column-onboarding>
        <section aria-label="Get your KS Number" className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-forest-600">SecurePay · Your identity</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-forest-800 md:text-4xl">Get your KS Number</h1>
          <p className="mt-3 text-sm leading-6 text-sand-700">
            A KS Number is how you identify yourself when using KS001. You only need one, even when you use different services.
          </p>
          <div aria-label="Simple signup steps" className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium text-forest-800">
            <span className="rounded-full bg-cream-100 px-3 py-2">1 · Your details</span>
            <span aria-hidden="true" className="text-sand-400">→</span>
            <span className="rounded-full bg-cream-100 px-3 py-2">2 · Verify your contact</span>
            <span aria-hidden="true" className="text-sand-400">→</span>
            <span className="rounded-full bg-forest-50 px-3 py-2">3 · Your KS Number</span>
          </div>
          <div className="mt-6">
            <SignupForm auth={auth} session={session} context="GENERIC" onUseExisting={onSignIn} onBack={onCancel} onIssued={onIssued} />
          </div>
          <details className="mt-5 border-t border-cream-200 pt-4 text-xs text-sand-700">
            <summary className="cursor-pointer font-semibold text-forest-700">Your SecurePay Check · what signup means</summary>
            <div className="mt-3 space-y-2 leading-5">
              <p>SecurePay checks that you can receive a code at your phone number or email address before issuing a KS Number.</p>
              <p>Getting a KS Number does not join The Trust Project, accept an Agreement, set up a Business or turn on financial services. You can choose those separately if you need them.</p>
              <p>You can return to the service or conversation you came from after signing in. That service must still have your permission before using any private information.</p>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
