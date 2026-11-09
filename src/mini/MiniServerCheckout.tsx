import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { MiniLanguage } from './miniModel';
import { fetchMiniPreviewCheckout, type MiniPreviewCheckoutPayload } from './checkoutServerClient';
import { MiniHostedCheckoutDemo } from './MiniHostedCheckoutDemo';

type LoadStatus = 'loading' | 'unavailable' | 'expired' | 'ready';

/** Server-backed owner fixture. Not a real order, booking or Agreement. */
export function MiniServerCheckout({ session, language }: {
  session: string;
  language: MiniLanguage;
}) {
  const sw = language === 'sw';
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [payload, setPayload] = useState<MiniPreviewCheckoutPayload | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    setStatus('loading');
    setPayload(null);
    void fetchMiniPreviewCheckout(session, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      if (result.status === 'ready') {
        setPayload(result.value);
        setStatus('ready');
      } else {
        setStatus(result.status);
      }
    }).finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [session, refresh]);

  if (status === 'ready' && payload) {
    return <MiniHostedCheckoutDemo record={payload.record} language={language}
      sessionExpiresAt={payload.expiresAt}/>;
  }

  return <section className="spm-content spm-server-wait" role="status" aria-live="polite">
    {status === 'loading'
      ? <LoaderCircle size={24} className="spm-spinner"/>
      : <AlertTriangle size={24}/>}
    <h1 className="spm-question">{status === 'loading'
      ? (sw ? 'Inaandaa malipo…' : 'Preparing checkout…')
      : status === 'expired'
        ? (sw ? 'Muda wa jaribio umeisha' : 'Checkout has expired')
        : (sw ? 'Checkout haipatikani sasa' : 'Checkout unavailable')}</h1>
    <p className="spm-lead">{status === 'loading'
      ? (sw ? 'Tunapakia oda ya jaribio kutoka kwenye seva.' : 'Loading the test order from the preview server.')
      : (sw ? 'Hakuna malipo yaliyotumwa. Rudi kwenye duka au ShortStays ujaribu tena.' :
        'No payment was made. Return to the Store or ShortStays to start again.')}</p>
    {status === 'unavailable' && <button type="button" className="spm-secondary"
      onClick={() => setRefresh(n => n + 1)}>
      {sw ? 'Jaribu kuunganisha tena' : 'Try loading again'}
    </button>}
    <a href="/checkout-demo-store.html" className="spm-quiet-link">
      <ArrowLeft size={16}/>{sw ? 'Rudi kwenye mifano ya malipo' : 'Back to test Store'}
    </a>
    <p className="spm-demo-footnote"><ShieldCheck size={15}/>
      {sw ? 'Jaribio tu · Hakuna pesa' : 'Simulation only · No money moved'}
    </p>
  </section>;
}
