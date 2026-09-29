import { useId, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { ShareInvitation } from '../join/ShareInvitation';
import { MAX_SHARE_NOTE } from '../join/share';

/**
 * User-Ready Beta Gate 1 (EP-CERT-012, decision D3) -- "AN INVITATION SHOULD ARRIVE WITH ENOUGH CONTEXT THAT THE RECIPIENT
 * UNDERSTANDS WHY THEY RECEIVED IT." The smallest useful contextual affordance on a public page:
 *
 *   Know someone who should be part of this?  [Invite someone]  (+ an optional short note, e.g. "I think this is what we
 *   were talking about.")
 *
 * It reuses the existing Join share doorway (public `#/join` link, WhatsApp / device share / copy). The recipient gets the
 * note (from the person who sent it), the reason (what The Trust Project is) and the destination (the Join page, which says
 * "Someone thought you might find The Trust Project useful" and what joining does and does not do). Sharing is not joining,
 * not a referral, and nothing is stored -- a persisted invitation-with-note is later product work (see the Gate 1 register).
 */
export function ShareThis({ section, className = '' }: { section: 'trust-project'; className?: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const noteId = useId();
  return (
    <div className={`surface-decision max-w-2xl px-5 py-4 ${className}`} data-share-this={section}>
      <p className="font-display text-lg text-forest-800">Know someone who should be part of this?</p>
      <p className="mt-1 text-[0.88rem] leading-relaxed text-sand-700">Send them a link with a short note, so they know why you thought of them. It doesn’t sign them up.</p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-forest-200 bg-white px-4 text-[0.88rem] font-medium text-forest-700 hover:border-forest-300 hover:bg-forest-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
          <UserPlus className="h-4 w-4" aria-hidden="true" />Invite someone
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor={noteId} className="block text-[0.82rem] text-forest-800">A short note <span className="text-sand-700">(optional)</span></label>
            <textarea id={noteId} value={note} onChange={e => setNote(e.target.value.slice(0, MAX_SHARE_NOTE))} rows={2} maxLength={MAX_SHARE_NOTE}
              placeholder="I think this is what we were talking about."
              className="mt-1 block w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-[0.9rem] text-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300" />
          </div>
          <ShareInvitation interest="member" note={note} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
