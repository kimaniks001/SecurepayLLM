/**
 * SecurePay Mini Phase 2: user-verified local capture metadata.
 * None of these records constitutes a Store lookup, an official document,
 * a verified barcode/product, an authenticated voice, or an agreement.
 * The contents are deliberately NOT persisted as workspace data.
 */
export type MiniCaptureKind = 'photo' | 'document' | 'voice' | 'barcode' | 'store-note';
export interface MiniCaptureSource {
  id: string;
  kind: MiniCaptureKind;
  label: string;
  detail: string;
  confirmedByUser: true;
  authority: 'LOCAL_UNVERIFIED';
}

export type MiniDocumentStatus = 'readable-text' | 'attachment-only' | 'unsupported' | 'too-large';

const READABLE_EXTENSIONS = new Set(['txt', 'md', 'csv']);
const ATTACHMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'odt', 'rtf']);

export function miniDocumentStatus(filename: string, bytes: number): MiniDocumentStatus {
  if (!Number.isFinite(bytes) || bytes < 0 || bytes > 10 * 1024 * 1024) return 'too-large';
  const extension = filename.toLowerCase().split('.').pop() ?? '';
  if (READABLE_EXTENSIONS.has(extension)) return bytes <= 256 * 1024 ? 'readable-text' : 'too-large';
  if (ATTACHMENT_EXTENSIONS.has(extension)) return 'attachment-only';
  return 'unsupported';
}

export function miniCaptureText(raw: string, limit = 400): string {
  return raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function miniBarcodeValue(value: string): string | null {
  const clean = value.trim();
  if (clean.length < 4 || clean.length > 96 || /[^\x20-\x7e]/.test(clean)) return null;
  return clean;
}

export function miniMergeUserDescription(current: string, captured: string): string {
  const next = miniCaptureText(captured);
  if (!next) return current;
  return miniCaptureText(current.trim() ? current.trim() + ' — ' + next : next);
}
