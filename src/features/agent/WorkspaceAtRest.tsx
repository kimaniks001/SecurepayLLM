import type { ReactNode } from 'react';
import securepayMark from '../../assets/brand/securepay/securepay-mark-green.png';

/**
 * The EMPTY state of the actual KS001 conversation, not a second Home page.
 * ConversationSurface owns the single composer just below this content.
 * This illustration is intentionally not a fictional Agreement, user record or payment.
 */
export function WorkspaceAtRest({ signedIn, continueSlot, attentionSlot, additionalWork }: {
  signedIn: boolean;
  continueSlot?: ReactNode;
  attentionSlot?: ReactNode;
  additionalWork?: ReactNode;
}) {
  return <section aria-label="SecurePay workspace" data-workspace-at-rest data-workspace-identity={signedIn ? 'member' : 'visitor'}
    className="mx-auto grid w-full max-w-6xl gap-5 pt-4 sm:pt-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] lg:items-stretch lg:gap-6">
    <div className="min-w-0 rounded-[1.6rem] border border-forest-200/50 bg-white/75 px-5 py-7 shadow-soft sm:px-8 sm:py-9 md:px-9">
      <div className="flex items-center gap-3">
        <img src={securepayMark} alt="" className="h-10 w-10 shrink-0" />
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-forest-700">KS001 · Here with you</p>
          <p className="mt-1 text-[0.8rem] text-sand-600">{signedIn ? 'Good to have you back' : 'Welcome. You can begin right here'}</p>
        </div>
      </div>
      <h1 className="mt-9 max-w-xl font-display text-[2.15rem] leading-[1.12] tracking-tight text-forest-900 sm:text-[2.75rem]">
        {signedIn ? 'Where shall we pick up?' : 'What would you like to make happen?'}
      </h1>
      <p className="mt-4 max-w-md text-[0.94rem] leading-7 text-sand-700">
        {signedIn
          ? 'Continue something important, or tell KS001 what you want to work on next.'
          : 'A thought, a photograph, a question or a plan. Tell KS001 below; we can work out the details together.'}
      </p>
      {continueSlot && <div className="mt-7" data-return-to-work>{continueSlot}</div>}
      {attentionSlot && <div className="mt-6" data-workspace-attention>{attentionSlot}</div>}
      {additionalWork && <div className="mt-5" data-workspace-continuity>{additionalWork}</div>}
      <p className="mt-7 border-t border-forest-100 pt-4 text-[0.78rem] leading-5 text-sand-600">
        {signedIn ? 'Your decisions remain yours. KS001 helps you move forward.' : 'Start without a KS Number. Nothing becomes an Agreement until you review and confirm it.'}
      </p>
    </div>

    <aside aria-label="Work taking shape" data-workspace-sheet
      className="flex min-h-[270px] flex-col rounded-[1.6rem] border border-forest-200/70 bg-[#fffefa]/95 px-5 py-6 shadow-soft sm:px-8 sm:py-8 lg:min-h-[440px]">
      <div className="flex items-center justify-between gap-3 border-b border-forest-100 pb-4">
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.17em] text-forest-700">Your work</span>
        <span className="text-[0.75rem] text-sand-500">Ready when you are</span>
      </div>
      <div className="my-auto py-9">
        <div aria-hidden="true" className="mb-6 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#8bb89b]" />
          <span className="h-px w-16 bg-forest-200" />
          <span className="h-3 w-3 rounded-full border-2 border-forest-300" />
          <span className="h-px w-16 bg-forest-200" />
          <span className="h-3 w-3 rounded-full border-2 border-forest-200" />
        </div>
        <h2 className="font-display text-[1.7rem] leading-snug text-forest-900">The work begins with you.</h2>
        <p className="mt-3 max-w-sm text-[0.88rem] leading-6 text-sand-700">
          The details you share with KS001 become something you can examine, improve and decide on.
        </p>
      </div>
      <p className="border-t border-forest-100 pt-4 text-[0.77rem] text-sand-600">
        Nothing has been agreed, booked or paid for.
      </p>
    </aside>
  </section>;
}
