import { useRef, useState } from 'react';
import { Camera, FileText, Paperclip, PenLine } from 'lucide-react';

const DOCUMENT_ACCEPT = '.pdf,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv';
// KS001 Upgrade Phase 3 final merge-readiness correction (item 4) -- WebP deliberately not offered here:
// the backend has no safe, bounded WebP dimension parser (see SourceContentSignatureValidator's own
// javadoc), so it is never advertised as an accepted photo type end to end.
const PHOTO_ACCEPT = 'image/jpeg,image/png';

/**
 * KS001 Upgrade Phase 3 (Section 40) -- a SINGLE attachment control, never a toolbar jungle: one quiet
 * control opens Document / Photo / Paste a plan. The text composer remains primary; this never turns into
 * a Document Management System affordance (Section 66).
 */
export function AttachSourceMenu({ disabled, onPickDocument, onPickPhoto, onBringPlan }: {
  disabled?: boolean;
  onPickDocument: (file: File) => void;
  onPickPhoto: (file: File) => void;
  onBringPlan: () => void;
}) {
  const [open, setOpen] = useState(false);
  const documentInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <button
        type="button" disabled={disabled} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Attach a source"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-sand-500 hover:text-forest-700 hover:bg-cream-100 disabled:opacity-40 shrink-0"
      >
        <Paperclip className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-52 rounded-2xl border border-cream-200 bg-white shadow-lifted overflow-hidden animate-fade-in-up z-10">
          <button type="button" onClick={() => { setOpen(false); onBringPlan(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[0.85rem] text-forest-700 hover:bg-cream-50">
            <PenLine className="w-4 h-4 text-sand-500" aria-hidden="true" />Paste a plan
          </button>
          <button type="button" onClick={() => { setOpen(false); documentInput.current?.click(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[0.85rem] text-forest-700 hover:bg-cream-50 border-t border-cream-100">
            <FileText className="w-4 h-4 text-sand-500" aria-hidden="true" />Document
          </button>
          <button type="button" onClick={() => { setOpen(false); photoInput.current?.click(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[0.85rem] text-forest-700 hover:bg-cream-50 border-t border-cream-100">
            <Camera className="w-4 h-4 text-sand-500" aria-hidden="true" />Photo
          </button>
        </div>
      )}
      <input
        ref={documentInput} type="file" accept={DOCUMENT_ACCEPT} className="hidden"
        onChange={e => { const file = e.target.files?.[0]; if (file) onPickDocument(file); e.target.value = ''; }}
      />
      <input
        ref={photoInput} type="file" accept={PHOTO_ACCEPT} capture="environment" className="hidden"
        onChange={e => { const file = e.target.files?.[0]; if (file) onPickPhoto(file); e.target.value = ''; }}
      />
    </div>
  );
}
