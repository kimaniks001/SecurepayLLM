import type { AuthGateway } from '../../api/securepay/auth';
import type { SessionStore } from '../../api/securepay/session';
import { SignupForm } from './JoinExperience';

/**
 * Public Experience Convergence Phase 4 -- `#/sign-up`, reached from Sign in ("Don't have a KS Number? Get
 * one"). IDENTITY ONLY: the same signup controller and endpoints every other flow uses, with the generic
 * wording. It never joins The Trust Project or any Agreement, never selects a plan, activates Money or funds
 * anything. Once the session exists, `AgentExperience` returns the person to where they were.
 */
export function SignUpExperience({ auth, session, onSignIn, onCancel }: {
  auth: Pick<AuthGateway, 'signupStart' | 'signupResend' | 'signupVerify'>;
  session: Pick<SessionStore, 'setTokens'>;
  onSignIn: () => void;
  onCancel: () => void;
}) {
  return (
    <main id="main" className="flex-1 overflow-auto bg-cream-100 bg-ks001-surface px-4 py-12 md:py-20" data-public-sign-up>
      <div className="mx-auto max-w-md">
        <h1 className="text-center font-display text-3xl md:text-4xl font-medium tracking-tight text-forest-800">Get your KS Number</h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-[0.95rem] leading-relaxed text-sand-700">
          This creates your SecurePay identity. It does not join The Trust Project or any Agreement.
        </p>
        <div className="mt-8">
          <SignupForm auth={auth} session={session} context="GENERIC" onUseExisting={onSignIn} onBack={onCancel} />
        </div>
      </div>
    </main>
  );
}
