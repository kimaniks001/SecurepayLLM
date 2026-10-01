import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Camera, FileSpreadsheet, FileText, Image, Link2, MapPin, Mic, PenLine, Plus } from 'lucide-react';

export const DOCUMENT_ACCEPT = '.pdf,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv';
/** Public Experience Convergence Phase 3 (Slice 3B) -- XLSX in the UI; SecurePay reads cell values only. */
export const SPREADSHEET_ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
// KS001 Upgrade Phase 3 final merge-readiness correction (item 4) -- WebP deliberately not offered: the
// backend has no safe, bounded WebP dimension parser (see SourceContentSignatureValidator's own javadoc).
export const PHOTO_ACCEPT = 'image/jpeg,image/png';

/**
 * Slice 3C consent line, shown with Voice note whenever it is ever offered. Speech becomes text only;
 * nobody is identified by their voice.
 */
export const VOICE_NOTE_CONSENT = 'Only share a recording everyone in it agreed to. Up to 10 minutes. SecurePay turns speech into text and never identifies who is speaking.';

export interface SourceMenuActions {
  onBringPlan?: () => void;
  /** Documents and spreadsheets (both DOCUMENT sources). */
  onPickDocument?: (file: File) => void;
  /** Photos and camera captures (both PHOTO sources). */
  onPickPhoto?: (file: File) => void;
  onAddLink?: () => void;
  onAddPlace?: () => void;
  /**
   * Slice 3C -- Voice note appears ONLY when a caller passes this, which requires a real, human-approved
   * transcription provider. None exists today (UR-211), so nothing passes it and the item never renders.
   */
  onPickVoiceNote?: (file: File) => void;
}

type Item = { key: string; label: string; hint?: string; icon: typeof Plus; run: () => void };

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300';

/**
 * Public Experience Convergence Phase 3 (Slice 3B) -- the ONE quiet "+" source menu, shared by the Home
 * hero and the conversation composer, so every intake kind exists once. It only chooses WHAT to bring;
 * everything is sent as a source, read into suggestions for the person to check, and never becomes an
 * agreement by itself. Items render only when their action is wired -- never a dead control.
 */
export function SourceMenu({ disabled, placement = 'above', variant = 'composer', ...actions }: SourceMenuActions & {
  disabled?: boolean;
  /** Composer menus open upward; the Home hero's opens downward. */
  placement?: 'above' | 'below';
  variant?: 'composer' | 'public' | 'app';
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const documentInput = useRef<HTMLInputElement>(null);
  const spreadsheetInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const voiceInput = useRef<HTMLInputElement>(null);

  const close = (returnFocus: boolean) => { setOpen(false); if (returnFocus) triggerRef.current?.focus(); };
  const choose = (run: () => void) => () => { setOpen(false); run(); };

  const items: Item[] = [];
  if (actions.onBringPlan) items.push({ key: 'plan', label: 'Paste a plan', icon: PenLine, run: actions.onBringPlan });
  if (actions.onPickDocument) {
    items.push({ key: 'document', label: 'Document', hint: 'PDF, Word, text or CSV', icon: FileText, run: () => documentInput.current?.click() });
    items.push({ key: 'spreadsheet', label: 'Spreadsheet', hint: 'Excel — values only', icon: FileSpreadsheet, run: () => spreadsheetInput.current?.click() });
  }
  if (actions.onPickPhoto) {
    items.push({ key: 'photo', label: 'Photo', icon: Image, run: () => photoInput.current?.click() });
    items.push({ key: 'camera', label: 'Camera', hint: 'Take a photo now', icon: Camera, run: () => cameraInput.current?.click() });
  }
  if (actions.onAddLink) items.push({ key: 'link', label: 'Link', hint: 'Kept as text — never opened', icon: Link2, run: actions.onAddLink });
  if (actions.onAddPlace) items.push({ key: 'place', label: 'Place', hint: 'In your own words', icon: MapPin, run: actions.onAddPlace });
  if (actions.onPickVoiceNote) items.push({ key: 'voice', label: 'Voice note', hint: VOICE_NOTE_CONSENT, icon: Mic, run: () => voiceInput.current?.click() });

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const entries = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = entries.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape') { event.preventDefault(); close(true); }
    else if (event.key === 'Tab') close(false);
    else if (event.key === 'ArrowDown') { event.preventDefault(); entries[(index + 1) % entries.length]?.focus(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); entries[(index - 1 + entries.length) % entries.length]?.focus(); }
    else if (event.key === 'Home') { event.preventDefault(); entries[0]?.focus(); }
    else if (event.key === 'End') { event.preventDefault(); entries[entries.length - 1]?.focus(); }
  };

  if (items.length === 0) return null;

  const triggerClass = variant === 'composer'
    ? `w-11 h-11 rounded-xl flex items-center justify-center text-sand-600 hover:text-forest-700 hover:bg-cream-100 disabled:opacity-40 shrink-0 ${focusRing}`
    : variant === 'public'
      ? `inline-flex min-h-11 items-center gap-2 rounded-full border border-cream-300 bg-white/80 px-4 text-[0.85rem] font-medium text-forest-800 shadow-soft transition-colors hover:border-forest-300 hover:bg-white disabled:opacity-40 ${focusRing}`
      : `inline-flex min-h-11 items-center gap-1.5 text-[0.8rem] text-forest-600 hover:text-forest-800 underline disabled:opacity-40 ${focusRing}`;
  const onFile = (input: 'document' | 'photo' | 'voice') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (input === 'document') actions.onPickDocument?.(file);
      else if (input === 'photo') actions.onPickPhoto?.(file);
      else actions.onPickVoiceNote?.(file);
    }
    event.target.value = '';
  };

  return (
    <div className="relative inline-flex" data-source-menu>
      <button
        ref={triggerRef} type="button" disabled={disabled} onClick={() => setOpen(o => !o)}
        aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
        aria-label="Add what you have"
        className={triggerClass}
      >
        <Plus className={variant === 'composer' ? 'w-5 h-5' : 'h-4 w-4 text-forest-600'} aria-hidden="true" />
        {variant !== 'composer' && 'Add what you have'}
      </button>
      {open && (
        <div
          ref={menuRef} id={menuId} role="menu" aria-label="Add a source" onKeyDown={onMenuKeyDown}
          className={`absolute ${placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-cream-200 bg-white shadow-lifted overflow-hidden animate-fade-in-up z-30 text-left`}
        >
          {items.map((item, i) => (
            <button
              key={item.key} type="button" role="menuitem" tabIndex={-1} onClick={choose(item.run)} data-source-menu-item={item.key}
              className={`w-full min-h-11 flex items-center gap-3 px-3.5 py-2 text-left hover:bg-cream-50 focus:bg-cream-50 focus:outline-none ${i > 0 ? 'border-t border-cream-100' : ''}`}
            >
              <item.icon className="w-4 h-4 text-forest-600 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[0.87rem] text-forest-800">{item.label}</span>
                {item.hint && <span className="block text-[0.74rem] text-sand-600">{item.hint}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
      {actions.onPickDocument && <>
        <input ref={documentInput} type="file" accept={DOCUMENT_ACCEPT} className="hidden" tabIndex={-1} aria-hidden="true" onChange={onFile('document')} />
        <input ref={spreadsheetInput} type="file" accept={SPREADSHEET_ACCEPT} className="hidden" tabIndex={-1} aria-hidden="true" onChange={onFile('document')} />
      </>}
      {actions.onPickPhoto && <>
        <input ref={photoInput} type="file" accept={PHOTO_ACCEPT} className="hidden" tabIndex={-1} aria-hidden="true" onChange={onFile('photo')} />
        <input ref={cameraInput} type="file" accept={PHOTO_ACCEPT} capture="environment" className="hidden" tabIndex={-1} aria-hidden="true" onChange={onFile('photo')} />
      </>}
      {actions.onPickVoiceNote && (
        <input ref={voiceInput} type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/webm" className="hidden" tabIndex={-1} aria-hidden="true" onChange={onFile('voice')} />
      )}
    </div>
  );
}
