(function (global) {
  'use strict';
  // SecurePay Embed SDK, Phase 1: presentation only. No auth, data, AI or financial calls.
  var VERSION = '0.1.0';
  var VALID_TOOLS = ['ask', 'contract', 'securelink', 'work', 'vision'];
  var instances = new WeakMap();
  function element(tag, className, label) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  }
  function mount(options) {
    options = options || {};
    var host = options.container || document.body;
    if (!host || typeof host.appendChild !== 'function') throw new Error('SecurePay Embed requires a DOM host');
    if (instances.has(host)) return instances.get(host);
    var siteId = String(options.siteId || '');
    if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(siteId)) throw new Error('Invalid SecurePay siteId');
    var title = String(options.title || 'Your Store').slice(0, 80);
    var requested = Array.isArray(options.tools) ? options.tools : ['ask', 'contract', 'securelink'];
    var enabled = VALID_TOOLS.filter(function (key) { return requested.includes(key); });
    if (!enabled.length) enabled = ['ask'];
    var labels = {ask:'Ask KS001',contract:'Simple Contract',securelink:'SecureLink',work:'My Work',vision:'Vision'};
    var root = element('div');
    root.setAttribute('data-securepay-embed', VERSION);
    root.setAttribute('data-site-id', siteId);
    var shadow = root.attachShadow({mode:'open'});
    var style = element('style');
    style.textContent = [
      ':host{all:initial;color-scheme:light;font-family:Arial,Helvetica,sans-serif}',
      '*,*:before,*:after{box-sizing:border-box}',
      '.launcher{position:fixed;right:18px;bottom:18px;z-index:2147483000;border:0;border-radius:999px;padding:13px 18px;background:#164a32;color:#fff;box-shadow:0 8px 24px #0b2f2066;font:700 13px Arial;cursor:pointer}',
      '.panel{position:fixed;right:18px;bottom:82px;width:min(372px,calc(100vw - 24px));max-height:min(660px,calc(100dvh - 98px));overflow:auto;background:white;color:#183f2d;border:1px solid #d7e6da;border-radius:19px;box-shadow:0 18px 55px #092d2140;z-index:2147483000;font:14px/1.5 Arial;padding:16px}',
      '.panel[hidden]{display:none!important}.head{display:flex;gap:8px;align-items:center;justify-content:space-between}',
      '.brand{font-weight:800}.minor{font-size:11px;color:#68796d}.row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}',
      '.action,.tab{background:#f0f6ef;border:1px solid #dce8dc;border-radius:9px;padding:8px 10px;color:#184b30;font:600 12px Arial;cursor:pointer}',
      '.action:hover,.tab:hover{background:#e0eee0}.tab[aria-pressed=true]{background:#174b31;color:white}',
      '.body{min-height:110px;padding:13px 0}.note{border-radius:10px;background:#f1f5f0;padding:12px;color:#405a47;font-size:12px}',
      '.caption{margin-top:9px;font-size:11px;color:#697b6e;text-align:center}',
      '.x{border:0;background:transparent;color:#173d2c;font:700 20px Arial;cursor:pointer}',
      'a{color:#195d3b;text-decoration:underline;font-weight:700}.setting{display:flex;gap:9px;align-items:center;margin:8px 0}',
      'input{accent-color:#1a7d48}.notice{font-size:12px;margin-top:10px;color:#855d22}'
    ].join('');
    shadow.appendChild(style);
    var launch = element('button', 'launcher', '✦  KS001 · Ask for help');
    launch.type = 'button';
    launch.setAttribute('aria-expanded', 'false');
    launch.setAttribute('aria-label', 'Open SecurePay tools for ' + title);
    var panel = element('section', 'panel');
    panel.hidden = true;
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','SecurePay tools for ' + title);
    var header = element('div', 'head');
    var heading = element('div');
    heading.appendChild(element('div','brand','KS001 · '+title));
    heading.appendChild(element('div','minor','SecurePay embedded tools · Foundation preview'));
    var close = element('button','x','×');
    close.type='button';close.setAttribute('aria-label','Close SecurePay tools');
    header.appendChild(heading);header.appendChild(close);panel.appendChild(header);
    var nav = element('div','row');nav.style.marginTop='13px';panel.appendChild(nav);
    var body = element('div','body');panel.appendChild(body);
    var notice = element('div','notice');notice.setAttribute('role','status');panel.appendChild(notice);
    panel.appendChild(element('div','caption','Powered by SecurePay'));
    shadow.appendChild(panel);shadow.appendChild(launch);
    host.appendChild(root);
    var current = enabled[0];
    var visible = enabled.slice();
    function openPanel(on) { panel.hidden=!on;launch.setAttribute('aria-expanded',String(on)); }
    function button(label, click, className) {
      var b=element('button',className||'action',label);b.type='button';b.addEventListener('click',click);return b;
    }
    function msg(text) { notice.textContent=text; }
    function render() {
      nav.replaceChildren();body.replaceChildren();msg('');
      visible.forEach(function(key) {
        var tab=button(labels[key],function(){current=key;render();},'tab');
        tab.setAttribute('aria-pressed',String(current===key));nav.appendChild(tab);
      });
      if (current==='settings') {
        body.appendChild(element('div','brand','Widget settings (this browser only)'));
        enabled.forEach(function(key){
          var line=element('label','setting');var input=element('input');input.type='checkbox';
          input.checked=visible.includes(key);
          input.addEventListener('change',function(){
            if (!input.checked && visible.length===1) {input.checked=true;msg('At least one tool must remain visible.');return;}
            visible=input.checked?visible.concat(key):visible.filter(function(x){return x!==key;});
            if(!visible.includes(current))current=visible[0];
            render();
          });
          line.appendChild(input);line.appendChild(element('span','',labels[key]));body.appendChild(line);
        });
        body.appendChild(element('div','note','These are presentation settings only. Store budgets, owner permissions and saved preferences require the secure backend in later phases.'));
      } else if (current==='invite') {
        body.appendChild(element('div','brand','Invite someone to SecurePay'));
        body.appendChild(element('p','minor','Invite a trader to add their Store, or a community to explore SecurePay.'));
        ['Add your Store','Add your Community','Get SecurePay tools'].forEach(function(name){
          body.appendChild(button('Copy invitation: '+name, function() {
            var text='Explore '+name+' on SecurePay: https://securepay.ke';
            if (!global.navigator || !global.navigator.clipboard || !global.navigator.clipboard.writeText) {
              msg('Clipboard unavailable. Share https://securepay.ke');return;
            }
            global.navigator.clipboard.writeText(text).then(function(){msg('Invitation copied.');},function(){msg('Copy unavailable. Share https://securepay.ke');});
          }));
        });
      } else {
        body.appendChild(element('div','brand',labels[current]));
        body.appendChild(element('p','minor','This is the reusable SecurePay tool shell installed on '+title+'.'));
        body.appendChild(element('div','note',
          current==='ask'?'Real KS001 conversations are not connected in Phase 1. No simulated AI replies will be shown.':
          current==='contract'?'Agreement drafting will use SecurePay’s authoritative backend after integration.':
          current==='securelink'?'SecureLink issuance will require authenticated, authorised agreement context.':
          'Your private workspace will require secure sign-in and an authorised handoff.'
        ));
        var link=element('a','','Open SecurePay.ke');
        link.href='https://securepay.ke/';link.target='_blank';link.rel='noopener noreferrer';
        body.appendChild(link);
      }
      var footer=element('div','row');
      footer.style.marginTop='10px';
      footer.appendChild(button('⚙ Settings',function(){current='settings';render();}));
      footer.appendChild(button('↗ Invite',function(){current='invite';render();}));
      panel.insertBefore(footer,notice);
      // A single footer is retained on each render.
      Array.from(panel.querySelectorAll('.row')).filter(function(node){return node!==nav && node!==footer;}).forEach(function(node){node.remove();});
    }
    launch.addEventListener('click',function(){openPanel(panel.hidden);});
    close.addEventListener('click',function(){openPanel(false);});
    render();
    var api={version:VERSION,open:function(){openPanel(true);},close:function(){openPanel(false);},
      destroy:function(){root.remove();instances.delete(host);}};
    instances.set(host,api);
    return api;
  }
  global.SecurePayEmbed=Object.freeze({version:VERSION,mount:mount});
})(window);
