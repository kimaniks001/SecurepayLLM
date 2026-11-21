import { useEffect, useRef, useState } from 'react';
import { Check, Compass, Copy, LockKeyhole, X } from 'lucide-react';
import type { MiniLanguage } from './miniModel';

/**
 * Public educational copy: product possibilities, not asserted service availability.
 * No account access, network calls, telemetry, browser redirection or personal data.
 */
export const SECUREPAY_PERSONAL_AI_GUIDE = \`SECUREPAY — GUIDE FOR MY AI
Public product-learning guide | 21 November 2026

I would like your help understanding whether SecurePay could benefit me. Act as an independent adviser, not a salesperson. This describes an intended product experience, not a guarantee that every feature is operational. Explain benefits, trade-offs and what I should verify before using anything.

WHAT IS SECUREPAY?
SecurePay is a Kenya-rooted platform developing Agreement Commerce. It helps people make clear what they are buying, selling, paying for, collecting for or asking for help with, before important commitments and money move. Its principle is "Trade freely. Fairness built in."

A SecureLink is more than a payment link. It is intended to keep offers, terms, the people involved, questions and clarifications, permissions, accepted versions, relevant progress and evidence connected to the same evolving agreement.

WHAT SECUREPAY MINI IS INTENDED TO HELP ME DO
BUY SOMETHING: Find an item or service; clarify price, quantity, delivery, condition and timing; review terms before sharing for confirmation, saving or authorizing money where supported.
SELL SOMETHING: Prepare an understandable offer; optionally share a SecureLink or QR code or connect the offer to a Store. Preparing an offer is not receiving payment. The buyer chooses whether to accept and pay.
PAY SOMEONE OR SOMETHING: Understand the recipient, purpose, amount, terms and authorization. Preparing a payment must not itself move money.
COLLECT MONEY: Define the purpose, collection period, target, governance and what contributors are entitled to if the goal is not reached. Actual holding or original-source refunds require verified providers and accepted terms.
TALK TO SOMEONE: Seek independent human reassurance, practical help, local knowledge or specialist judgment when genuinely available, with consent and clear costs.

KS001 is an optional digital Fair Trade companion within SecurePay. It should help people understand and clarify, not make choices on their behalf. Everyday trading should remain simple without lengthy AI conversations.

EVERYDAY EXAMPLES
A buyer can clarify delivery and warranty before paying. A shopkeeper or freelancer can turn a quote into a clear offer. A parent or school can agree fees and deadlines. A fundraiser can clarify contribution rules and unused money. A tradesperson can specify stages, inspections and evidence. A user can request real human help if appropriate.

IMPORTANT LIMITATIONS
SecurePay is not automatically a bank, insurer, legal adviser or guarantee of delivery. Do not assume live escrow, payments, refunds, provider connections, human-expert availability, pricing or automated protections. Check the current Mini experience, applicable laws, provider terms, fees, identity requirements, consent, privacy, dispute processes and service availability. Do not invent features or prices.

HOW I WANT YOU TO HELP ME
Use only the genuine context you already have from our conversations about my work, responsibilities, goals or interests, without inventing facts or revealing sensitive information. If you know enough, start with a concrete situation relevant to me. If you don't, ask me one plain-language question about what I am trying to do.

Then give me 2–3 specific, realistic ways SecurePay might or might not help. Walk me through what I and the other person would need to agree to, costs and possible inconvenience, risks, what remains unverified, and how this compares with my usual way of doing things. Tell me when SecurePay would not add value. Speak in my preferred language and ask only one useful follow-up question at a time.

Do not ask me to share passwords, one-time codes, identification numbers, bank details, payment credentials or confidential agreements. Begin with one relevant example or one useful question.\`;

const copy = {
  en: {
    invite: 'Explore with your AI',
    heading: 'Discover where SecurePay fits your life',
    explanation: 'Copy this guide into the AI you already use. It can explain the possible benefits in your own life, work or business.',
    copy: 'Copy guide',
    close: 'Close',
    select: 'Select all',
    copied: 'Copied — paste it into your AI chat.',
    fallback: 'Select the guide and copy it into your AI chat.',
    privacy: 'Only guide text is copied. We do not send your details or connect to your AI.',
    label: 'SecurePay guide for your AI (read only)',
  },
  sw: {
    invite: 'Gundua na AI yako',
    heading: 'Jua jinsi SecurePay inavyoweza kukufaa',
    explanation: 'Nakili maelezo haya na uyabandike kwenye AI unayotumia. Itakusaidia kuelewa manufaa kwa maisha au kazi yako.',
    copy: 'Nakili maelezo',
    close: 'Funga',
    select: 'Chagua yote',
    copied: 'Yamenakiliwa — bandika kwenye AI yako.',
    fallback: 'Chagua maelezo haya na uyabandike kwenye AI yako.',
    privacy: 'Maelezo ya bidhaa pekee yananakiliwa. Hatupeleki taarifa zako kwa AI.',
    label: 'Maelezo ya SecurePay kwa AI (kusoma tu)',
  },
};

export function MiniExploreWithYourAi({ language }: { language: MiniLanguage }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<'copied' | 'fallback' | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const inviteRef = useRef<HTMLButtonElement>(null);
  const t = copy[language];
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); inviteRef.current?.focus(); };
  }, [open]);
  const selectGuide = () => {
    textRef.current?.focus();
    textRef.current?.select();
  };
  const copyGuide = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard not supported');
      await navigator.clipboard.writeText(SECUREPAY_PERSONAL_AI_GUIDE);
      setFeedback('copied');
    } catch {
      setFeedback('fallback');
      selectGuide();
    }
  };
  return <>
    <button ref={inviteRef} type="button" className="spm-text-btn spm-companion-ai-invite"
      onClick={() => { setFeedback(null); setOpen(true); }}
      aria-haspopup="dialog" aria-expanded={open}>
      <Compass size={16} aria-hidden="true" />{t.invite}
    </button>
    {open && <div className="spm-companion-guide-layer">
      <button type="button" className="spm-companion-guide-backdrop"
        onClick={() => setOpen(false)} tabIndex={-1} aria-label={t.close} />
      <section className="spm-companion-guide-dialog" role="dialog" aria-modal="true"
        aria-labelledby="spm-ai-guide-title" aria-describedby="spm-ai-guide-description">
        <div className="spm-companion-guide-head">
          <h2 id="spm-ai-guide-title">{t.heading}</h2>
          <button ref={closeRef} className="spm-companion-guide-close" type="button"
            onClick={() => setOpen(false)} aria-label={t.close}><X size={18}/></button>
        </div>
        <p id="spm-ai-guide-description">{t.explanation}</p>
        <label htmlFor="spm-ai-guide-text">{t.label}</label>
        <textarea id="spm-ai-guide-text" ref={textRef} readOnly spellCheck={false}
          value={SECUREPAY_PERSONAL_AI_GUIDE}/>
        <div className="spm-companion-guide-actions">
          <button type="button" className="spm-companion-guide-copy" onClick={copyGuide}>
            {feedback==='copied' ? <Check size={16} aria-hidden="true" /> :
              <Copy size={16} aria-hidden="true" />}{t.copy}</button>
          <button type="button" className="spm-companion-guide-select"
            onClick={selectGuide}>{t.select}</button>
        </div>
        <div className="spm-companion-guide-feedback" role="status" aria-live="polite">
          {feedback === 'copied' ? t.copied : feedback === 'fallback' ? t.fallback : ''}
        </div>
        <p className="spm-companion-guide-privacy"><LockKeyhole size={14} aria-hidden="true"/>{t.privacy}</p>
      </section>
    </div>}
  </>;
}
