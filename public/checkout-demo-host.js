/* Phase 1 owner-only checkout launcher, NOT a payment SDK.
 * Sample hosts are SAME ORIGIN and use immutable fictional references.
 * This script neither authenticates a buyer nor accepts a financial callback.
 * Do NOT copy this sandbox+same-origin frame into an external partner site.
 */
(() => {
  'use strict';
  const source = document.querySelector('[data-demo-host]');
  if (!source) return;
  const map = Object.freeze({
    STORE: { path: '/checkout-demo-store.html', id: 'STORE-DEMO-01' },
    SHORTSTAYS: { path: '/checkout-demo-shortstays.html', id: 'STAY-DEMO-01' },
  });
  const config = map[source.dataset.demoHost];
  if (!config || window.location.pathname !== config.path ||
      source.dataset.checkoutFixture !== config.id) return;

  const button = document.getElementById('demo-pay');
  const popup = document.getElementById('demo-popup');
  const closeButton = document.getElementById('demo-close');
  const overlay = document.getElementById('demo-overlay');
  const frame = document.getElementById('demo-frame');
  const fallback = document.getElementById('demo-fallback');
  const status = document.getElementById('demo-status');
  const safeStates = Object.freeze({
    NOT_STARTED: 'Payment not started (test only)',
    SELECT_METHOD: 'Method selected — NOT PAID',
    AWAITING_FAKE_PROVIDER: 'Test pending — NOT PAID',
    SIMULATED_UNKNOWN: 'Test result unknown — NOT PAID',
    SIMULATED_CONFIRMED: 'Simulated provider confirmation — NOT PAID',
    SIMULATED_FAILED: 'Test failed — NOT PAID',
  });
  if (!button || !popup || !closeButton || !overlay || !frame || !fallback || !status) return;

  let initialized = false;
  const setVisible = value => {
    popup.hidden = !value;
    overlay.hidden = !value;
    button.setAttribute('aria-expanded', String(value));
    if (value) closeButton.focus();
    else button.focus();
  };
  const open = () => {
    if (!initialized) {
      // Only this hard-coded synthetic reference, never amount/merchant or a
      // customer session token in the URL. Source-controlled DEMO, not bank data.
      frame.src = '/mini.html?embedded=1&demoCheckout=' + encodeURIComponent(config.id);
      initialized = true;
    }
    setVisible(true);
  };
  const close = () => {
    setVisible(false);
    // Closing never means confirmed. Real host waits for signed server evidence.
    if (status.dataset.demoReturned !== 'yes')
      status.textContent = 'Checkout window closed — NOT PAID';
  };
  const onResult = event => {
    if (event.origin !== window.location.origin ||
        event.source !== frame.contentWindow ||
        !event.data || typeof event.data !== 'object') return;
    const payload = event.data;
    if (payload.type !== 'SECUREPAY_MINI_OWNER_DEMO_RETURN_V1' ||
        payload.version !== 1 || payload.fixtureId !== config.id ||
        payload.simulated !== true ||
        !Object.prototype.hasOwnProperty.call(safeStates, payload.result)) return;
    status.textContent = safeStates[payload.result];
    status.dataset.demoReturned = 'yes';
    close();
  };

  button.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', close);
  window.addEventListener('message', onResult);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !popup.hidden) close();
  });
  frame.addEventListener('error', () => {
    fallback.hidden = false;
    frame.hidden = true;
  });
  frame.addEventListener('load', () => {
    if (!initialized) return;
    // The iframe loaded but React may still fail; a visible manual fallback
    // must remain reachable if the exact same-origin test frame is blank.
    setTimeout(() => {
      try {
        const mounted = Boolean(frame.contentDocument?.querySelector('.spm-root'));
        fallback.hidden = mounted;
        frame.hidden = !mounted;
      } catch {
        fallback.hidden = false;
        frame.hidden = true;
      }
    }, 850);
  });
})();
