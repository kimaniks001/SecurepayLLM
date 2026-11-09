/* Phase 2 owner preview — same launcher for Store and ShortStays.
 *
 * The host only submits a SOURCE TYPE. The Vercel PREVIEW server owns all
 * fictional item, merchant, amount and version details. The returned reference
 * is encrypted, origin-bound and expires after five minutes. It has NO banking
 * or Agreement privileges. Real hosts require authenticated backend handoff.
 */
(() => {
  'use strict';
  const container = document.querySelector('[data-demo-host]');
  const entries = Object.freeze({
    STORE: { id: 'STORE-DEMO-01', host: '/checkout-demo-store.html' },
    SHORTSTAYS: { id: 'STAY-DEMO-01', host: '/checkout-demo-shortstays.html' },
  });
  const hostSource = container?.dataset.demoHost;
  const item = Object.prototype.hasOwnProperty.call(entries, hostSource) ? entries[hostSource] : null;
  if (!item || window.location.pathname !== item.host ||
      container.dataset.checkoutFixture !== item.id) return;

  const button = document.getElementById('demo-pay');
  const popup = document.getElementById('demo-popup');
  const closeButton = document.getElementById('demo-close');
  const overlay = document.getElementById('demo-overlay');
  const frame = document.getElementById('demo-frame');
  const fallback = document.getElementById('demo-fallback');
  const status = document.getElementById('demo-status');
  if ([button, popup, closeButton, overlay, frame, fallback, status].some(x => !x)) return;

  const statuses = Object.freeze({
    NOT_STARTED: 'Payment not started (test only)',
    SELECT_METHOD: 'Method selected — NOT PAID',
    AWAITING_FAKE_PROVIDER: 'Test pending — NOT PAID',
    SIMULATED_UNKNOWN: 'Test result unknown — NOT PAID',
    SIMULATED_CONFIRMED: 'Simulated provider confirmation — NOT PAID',
    SIMULATED_FAILED: 'Test failed — NOT PAID',
  });
  const originalLabel = button.textContent;
  let activeUntil = 0;
  let loading = false;

  const setVisible = open => {
    popup.hidden = !open;
    overlay.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open) closeButton.focus();
    else button.focus();
  };
  const close = () => {
    setVisible(false);
    // A popup close has no payment/booking authority.
    if (status.dataset.demoReturned !== 'yes')
      status.textContent = 'Checkout closed — NOT PAID';
  };
  const open = async () => {
    if (loading) return;
    if (activeUntil > Date.now() && frame.src && !frame.src.endsWith('about:blank')) {
      setVisible(true);
      return; // resumable without issuing another reference
    }
    loading = true;
    button.disabled = true;
    button.textContent = 'Opening SecurePay…';
    status.textContent = 'Preparing test checkout…';
    status.dataset.demoReturned = 'no';
    try {
      const response = await fetch('/api/mini-checkout-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ source: hostSource }),
        credentials: 'omit', cache: 'no-store', redirect: 'error',
      });
      if (!response.ok) throw new Error('checkout_preview_unavailable');
      const payload = await response.json();
      if (!payload || payload.simulationOnly !== true ||
          typeof payload.session !== 'string' ||
          payload.session.length < 60 || payload.session.length > 1024 ||
          !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(payload.session) ||
          !Number.isSafeInteger(payload.expiresAt) ||
          payload.expiresAt <= Date.now()) throw new Error('checkout_preview_bad_response');
      activeUntil = payload.expiresAt;
      frame.hidden = false;
      fallback.hidden = true;
      frame.src = '/mini.html?embedded=1&checkoutSession=' + encodeURIComponent(payload.session);
      setVisible(true);
    } catch {
      activeUntil = 0;
      status.textContent = 'Checkout unavailable. Nothing paid. Please try again.';
      // Never fall back to trusting client-side amounts or fabricated checkout success.
    } finally {
      loading = false;
      button.disabled = false;
      button.textContent = originalLabel;
    }
  };
  const receive = event => {
    if (event.origin !== window.location.origin ||
        event.source !== frame.contentWindow ||
        !event.data || typeof event.data !== 'object') return;
    const msg = event.data;
    if (msg.type !== 'SECUREPAY_MINI_OWNER_DEMO_RETURN_V1' ||
        msg.version !== 1 || msg.fixtureId !== item.id ||
        msg.simulated !== true ||
        !Object.prototype.hasOwnProperty.call(statuses, msg.result)) return;
    status.textContent = statuses[msg.result];
    status.dataset.demoReturned = 'yes';
    close();
  };
  button.addEventListener('click', () => { void open(); });
  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', close);
  window.addEventListener('message', receive);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !popup.hidden) close();
  });
  frame.addEventListener('error', () => {
    fallback.hidden = false;
    frame.hidden = true;
  });
  frame.addEventListener('load', () => {
    if (!activeUntil) return;
    window.setTimeout(() => {
      try {
        const mounted = Boolean(frame.contentDocument?.querySelector('.spm-root'));
        fallback.hidden = mounted;
        frame.hidden = !mounted;
      } catch {
        fallback.hidden = false;
        frame.hidden = true;
      }
    }, 900);
  });
})();
