import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { SignupForm } from './JoinExperience';

/**
 * Public Experience Convergence Phase 4 -- `#/sign-up`, reached from Sign in ("Don't have a KS Number? Get
 * one"). IDENTITY ONLY: the same signup controller and endpoints every other flow uses, with the generic
 * wording. It never joins The Trust Project or any Agreement, never selects a plan, activates Money or funds
 * anything. Once the session exists, `AgentExperience` returns the person to where they were.
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
      <div className="mx-auto grid w-full max-w-[1550px] gap-3 lg:grid-cols-[200px_minmax(0,1fr)_300px]" data-gate-c-three-column-onboarding>
        <aside aria-label="SecurePay signup steps" className="hidden rounded-2xl border border-cream-200 bg-white p-5 lg:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">SecurePay · Identity</p>
          <h2 className="mt-3 font-display text-xl text-forest-900">Your first steps</h2>
          <ol className="mt-5 space-y-4 text-sm text-sand-700">
            <li><strong className="block text-forest-800">1. Your details</strong>Tell us how to reach you.</li>
            <li><strong className="block text-forest-800">2. Verification</strong>Prove access to your contact.</li>
            <li><strong className="block text-forest-800">3. KS Number</strong>SecurePay issues your identity.</li>
          </ol>
          <p className="mt-5 text-xs leading-5 text-sand-600">Once you're signed in, the same Workspace, KS001 and tools are available. Signup itself grants no Money or community authority.</p>
        </aside>
        <section aria-label="Get your KS Number" className="min-w-0 rounded-2xl border border-cream-200 bg-white p-4 shadow-soft sm:p-7">
          <div className="mx-auto max-w-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-forest-600">Welcome to SecurePay</p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-forest-800 md:text-4xl">Get your KS Number</h1>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-sand-700">
              This creates your SecurePay identity. It does not join The Trust Project or any Agreement.
            </p>
            <div className="mt-6">
              <SignupForm auth={auth} session={session} context="GENERIC" onUseExisting={onSignIn} onBack={onCancel} onIssued={onIssued} />
            </div>
          </div>
        </section>
        <aside aria-label="Your SecurePay identity and permissions" className="rounded-2xl border border-cream-200 bg-white p-5 lg:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">Your SecurePay Check</p>
          <h2 className="mt-3 font-display text-xl text-forest-900">What happens next?</h2>
          <p className="mt-3 text-sm leading-6 text-sand-700">Only after contact verification can SecurePay issue your KS Number and authenticate this session.</p>
          <div className="mt-4 space-y-3 border-t border-cream-200 pt-4 text-xs text-sand-700">
            <p><strong className="block text-forest-800">KS Number</strong>Issued only by SecurePay after verification.</p>
            <p><strong className="block text-forest-800">Trust Project</strong>Not joined — your separate choice.</p>
            <p><strong className="block text-forest-800">Business identity</strong>Not created — needs your own authorised representation.</p>
            <p><strong className="block text-forest-800">Financial activation</strong>Not enabled by signup — requires its own Agreement and funding checks.</p>
          </div>
          <p className="mt-4 text-xs leading-5 text-sand-600">No activation costs, institutions or money-moving rails are implied at signup.</p>
        </aside>
      </div>
    </main>
  );
}
