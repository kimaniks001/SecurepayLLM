import type { AppView } from '../../types';

const VIEW_KEY = 'securepay:entry-view';
const KS001_KEY = 'securepay:ks001-entry-message';
const AGREEMENT_KEY = 'securepay:entry-agreement';

export function storeEntryView(view: AppView) {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.setItem(VIEW_KEY, view); } catch { /* navigation hint only */ }
}

export function consumeEntryView(): AppView | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(VIEW_KEY);
    window.sessionStorage.removeItem(VIEW_KEY);
    return value as AppView | null;
  } catch {
    return null;
  }
}

export function storeKs001EntryMessage(message: string) {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.setItem(KS001_KEY, message); } catch { /* navigation hint only */ }
}

export function consumeKs001EntryMessage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(KS001_KEY);
    window.sessionStorage.removeItem(KS001_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}


export function storeAgreementEntry(agreementId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(VIEW_KEY, 'agreement-detail');
    window.sessionStorage.setItem(AGREEMENT_KEY, agreementId);
  } catch { /* navigation hint only */ }
}

export function consumeAgreementEntry(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(AGREEMENT_KEY);
    window.sessionStorage.removeItem(AGREEMENT_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}
