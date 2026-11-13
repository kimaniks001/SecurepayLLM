(function (global) {
  'use strict';
  /*
   * P0 Storage companion adapter. Installation is EXPLICIT. No auto-mount,
   * no knowledge of demo inventory, custody, rates, identity or money.
   * The real KS001 session and guest token live in a SecurePay-origin iframe.
   *
   * This is NOT installed into the separately deployed Storage owner preview.
   * Keep all activation switches OFF until the host source and server policy
   * have been reconciled and certified.
   */
  var SITE_ID = 'storage-ke-preview';
  var PROTOCOL = 'storage.ks001.mini.v1';
  var KNOWN_OWNER_PREVIEWS = Object.freeze([
    'https://storage-ke-owner-preview-james-8078.vercel.app'
  ]);
  var TOPICS = Object.freeze([
    { id: 'space', label: 'Find storage', detail: 'Garage, store or warehouse', question: 'What would you like to store, roughly how much space, and for how long?' },
    { id: 'offer', label: 'Offer space', detail: 'Share unused capacity', question: 'What type of storage space could you offer, and what conditions apply?' },
    { id: 'custody', label: 'Collect my items', detail: 'Inventory & handover', question: 'What items would you like to collect, and what handover arrangements do you need?' },
    { id: 'extend', label: 'Extend storage', detail: 'Change the duration', question: 'Would you like to discuss extending a storage arrangement and its terms?' }
  ]);
  function safeFrameOrigin(raw) {
    try {
      if (typeof raw !== 'string') return null;
      var url = new URL(raw);
      var host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' ||
          !/^(?:staging|sandbox|qa|test)(?:[-.][a-z0-9-]+)*\.securepay\.ke$/.test(host) ||
          url.username || url.password || url.port ||
          url.pathname !== '/' || url.search || url.hash || url.origin !== raw) return null;
      return raw;
    } catch (_) { return null; }
  }
  function eligible(options) {
    if (!options || typeof options !== 'object' ||
        options.stagingApproved !== true ||
        options.ownerApproved !== true ||
        options.credentialIsolationApproved !== true ||
        options.siteId !== SITE_ID) return false;
    var current = global.location && global.location.origin;
    return typeof current === 'string' &&
      KNOWN_OWNER_PREVIEWS.includes(current) &&
      options.approvedHostOrigin === current &&
      safeFrameOrigin(options.frameOrigin) !== null;
  }
  function element(tag, className, text) {
    var el = global.document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === 'string') el.textContent = text;
    return el;
  }
  function mount(options) {
    if (!eligible(options)) return null;
    var host = options.container;
    if (!host || typeof host.appendChild !== 'function' || !host.isConnected ||
        !global.document || !global.document.body.contains(host)) return null;
    if (host.querySelector('[data-storage-ks001]')) return null;
    var frameOrigin = safeFrameOrigin(options.frameOrigin);
    var root = element('div');
    root.setAttribute('data-storage-ks001', 'p0');
    var shadow = root.attachShadow({ mode: 'open' });
    var css = element('style');
    css.textContent = [
      ':host{all:initial;font:13px/1.45 system-ui,Arial,sans-serif;color:#183b32}',
      '*,*:before,*:after{box-sizing:border-box}',
      '.launcher{position:fixed;right:16px;bottom:16px;z-index:2147482900;border:0;border-radius:999px;background:#204938;color:white;padding:11px 15px;font-weight:700;box-shadow:0 8px 24px #173a2b44;cursor:pointer}',
      '.panel{position:fixed;right:12px;bottom:70px;z-index:2147482900;width:min(360px,calc(100vw - 24px));max-height:min(650px,calc(100dvh - 88px));overflow:auto;border:1px solid #dce7dc;background:#fffdf8;color:#183b32;padding:14px;border-radius:18px;box-shadow:0 18px 55px #092d2140}',
      '.panel[hidden]{display:none!important}.head{display:flex;justify-content:space-between;gap:10px;align-items:start}',
      '.headline{font-weight:800;font-size:14px}.muted{font-size:11px;color:#52695c;margin:5px 0 10px}',
      '.tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.tile,.action{border:1px solid #d3e2d4;background:#f5f9f1;border-radius:10px;color:#183b32;padding:9px;font:600 12px system-ui;text-align:left;cursor:pointer}',
      '.tile small{display:block;color:#5f7164;font-size:10px;font-weight:400;margin-top:3px}',
      '.action{display:inline-block;margin:5px 5px 5px 0}.close{border:0;background:transparent;color:#183b32;font-size:22px;cursor:pointer}',
      'textarea{width:100%;min-height:80px;max-height:160px;resize:vertical;padding:9px;border:1px solid #cadbc9;border-radius:10px;font:13px system-ui}',
      'iframe{width:100%;height:315px;display:block;border:1px solid #dae4d9;border-radius:10px;background:white}',
      'button:disabled{opacity:.45;cursor:not-allowed}.note{font-size:11px;color:#5f6b61;line-height:1.5}.status{font-size:11px;color:#755c35}',
      '@media(max-width:450px){.panel{bottom:63px;right:8px;width:calc(100vw - 16px);max-height:calc(100dvh - 74px)}}'
    ].join('');
    shadow.appendChild(css);
    var launcher = element('button', 'launcher', '✦ Ask KS001');
    launcher.type = 'button';
    launcher.setAttribute('aria-expanded', 'false');
    var panel = element('section', 'panel');
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Ask KS001 for Storage');
    var head = element('div', 'head');
    var headline = element('strong', 'headline', 'KS001 · Storage');
    var close = element('button', 'close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close Storage KS001');
    head.appendChild(headline);
    head.appendChild(close);
    panel.appendChild(head);
    panel.appendChild(element('p', 'muted', 'Make room for what matters'));
    var body = element('div');
    panel.appendChild(body);
    panel.appendChild(element('p', 'note', 'SecurePay helps you prepare an arrangement. The Storage provider must verify space, custody and release. No reservation or payment is made here.'));
    shadow.appendChild(panel);
    shadow.appendChild(launcher);
    host.appendChild(root);

    var topic = null, draft = '', frame = null, frameReady = false;
    var status = '', disposed = false, connectionId = 0;
    var sendButton = null, statusNode = null;
    function validReply(ev) {
      return frame && ev.origin === frameOrigin &&
        ev.source === frame.contentWindow && ev.data &&
        typeof ev.data === 'object' &&
        ev.data.type === 'securepay.embed.storage.ready.v1' &&
        ev.data.siteId === SITE_ID;
    }
    function receive(ev) {
      if (disposed || !validReply(ev)) return;
      frameReady = true;
      // Never detach or recreate a loaded SecurePay iframe on READY. Doing so
      // would reset its authenticated guest session and lose the live chat.
      if (sendButton) sendButton.disabled = !draft.trim();
    }
    global.addEventListener('message', receive);
    function button(label, action, cls) {
      var b = element('button', cls || 'action', label);
      b.type = 'button'; b.addEventListener('click', action); return b;
    }
    function resetFrame() {
      connectionId++;
      frameReady = false;
      if (frame) { frame.remove(); frame = null; }
    }
    function render() {
      if (disposed) return;
      body.replaceChildren();
      sendButton = null; statusNode = null;
      if (!topic) {
        body.appendChild(element('p', 'muted', 'What would you like to arrange?'));
        var grid = element('div', 'tiles');
        TOPICS.forEach(function(t) {
          var b = button(t.label, function() {
            resetFrame();
            topic = t; draft = 'I need storage help. ' + t.question; status = '';
            render();
          }, 'tile');
          b.appendChild(element('small', '', t.detail));
          grid.appendChild(b);
        });
        body.appendChild(grid);
        return;
      }
      body.appendChild(button('← Other requests', function() {
        resetFrame(); topic = null; draft = ''; status = ''; render();
      }));
      var label = element('label', 'muted', 'Tell KS001 what you need');
      label.setAttribute('for', 'storage-ks001-draft');
      body.appendChild(label);
      var textarea = element('textarea');
      textarea.id = 'storage-ks001-draft';textarea.maxLength = 1200;textarea.value = draft;
      textarea.addEventListener('input', function() {
        draft = textarea.value;
        if (sendButton) sendButton.disabled = !frameReady || !draft.trim();
      });
      body.appendChild(textarea);
      body.appendChild(element('p','note',
        'Only your chosen text is offered to SecurePay. No stored-item records, inventory, access code, price or personal details are imported.'));
      if (!frame) {
        body.appendChild(button('Continue with KS001', function() {
          resetFrame();
          frame = element('iframe');
          frame.title = 'SecurePay-hosted KS001 · Storage';
          frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
          frame.referrerPolicy = 'strict-origin-when-cross-origin';
          frame.src = frameOrigin + '/embed/storage-mini.html?siteId=' + SITE_ID;
          var version = connectionId;
          frame.addEventListener('load',function(){
            if (disposed || version !== connectionId || !frame || !frame.contentWindow) return;
            frame.contentWindow.postMessage({ type:'storage.ks001.hello.v1',siteId:SITE_ID },frameOrigin);
          });
          render();
        }));
      } else {
        body.appendChild(frame);
        var send = button('Use this draft in protected KS001', function() {
          var value = draft.trim();
          if (!frameReady || !frame || !frame.contentWindow || !value ||
              value.length > 1200) return;
          frame.contentWindow.postMessage({
            type:'storage.ks001.prefill.v1',siteId:SITE_ID,
            product:PROTOCOL,text:value,publicSpaceReference:null,
          },frameOrigin);
          status = 'Draft offered for your review. Press Send inside SecurePay.';
          if (statusNode) statusNode.textContent = status;
        });
        send.disabled = !frameReady || !draft.trim();
        sendButton = send;
        body.appendChild(send);
      }
      statusNode = element('p','status',status);
      body.appendChild(statusNode);
    }
    launcher.addEventListener('click', function(){
      panel.hidden = !panel.hidden;
      launcher.setAttribute('aria-expanded', String(!panel.hidden));
      // Retain a mounted conversation when merely hiding/reopening the panel.
      // Re-render only before a frame exists; a re-render would detach it.
      if (!panel.hidden && !frame) render();
    });
    close.addEventListener('click', function(){
      panel.hidden = true;
      launcher.setAttribute('aria-expanded','false');
      // Closing the panel is non-destructive. Explicitly selecting another
      // request or destroy() closes this conversation frame.
    });
    render();
    return Object.freeze({
      destroy: function() {
        if (disposed) return;
        disposed = true;
        resetFrame();
        global.removeEventListener('message', receive);
        root.remove();
      }
    });
  }
  global.SecurePayStorageHost = Object.freeze({
    version: 'p0.1', siteId: SITE_ID, protocol: PROTOCOL,
    safeFrameOrigin: safeFrameOrigin, eligible: eligible, mount: mount
  });
})(window);
