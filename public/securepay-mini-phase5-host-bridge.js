/* SecurePay Mini Phase 5 Gate 1 — reusable SAME-ORIGIN OWNER PREVIEW launcher.
 *
 * One launcher for two independent host pages, ONE existing Mini experience.
 * Never use this client-side fixture bridge as a public cross-origin SDK.
 * Merchant-hosted production integration REQUIRES registered origin, signed
 * server-created source/Agreement capability and authenticated money status.
 */
(()=>{
  'use strict';
  const manifest=Object.freeze({
    STORE:Object.freeze({
      path:'/phase5-store-host.html',fixtureId:'STORE-DEMO-01',
      readyForOfflinePreview:true
    }),
    SHORTSTAYS:Object.freeze({
      path:'/phase5-shortstays-host.html',fixtureId:'STAY-DEMO-01',
      readyForOfflinePreview:true
    }),
    ESTATE:Object.freeze({path:null,fixtureId:null,readyForOfflinePreview:false}),
    MY_RIDE:Object.freeze({path:null,fixtureId:null,readyForOfflinePreview:false}),
    STORAGE:Object.freeze({path:null,fixtureId:null,readyForOfflinePreview:false})
  });
  const root=document.querySelector('[data-mini-phase5-host]');
  const site=root?.dataset.miniPhase5Host;
  const entry=Object.prototype.hasOwnProperty.call(manifest,site)?
    manifest[site]:null;
  // No arbitrary host keys/paths/fixture IDs from attributes or URL queries.
  if(!entry||!entry.readyForOfflinePreview||
     window.location.pathname!==entry.path||
     root.dataset.checkoutFixture!==entry.fixtureId)return;
  const el=id=>document.getElementById(id);
  const pay=el('demo-pay'),popup=el('demo-popup'),overlay=el('demo-overlay'),
    frame=el('demo-frame'),closeBtn=el('demo-close'),
    fallback=el('demo-fallback'),status=el('demo-status');
  if([pay,popup,overlay,frame,closeBtn,fallback,status].some(x=>!x))return;
  const captions=Object.freeze({
    NOT_STARTED:'Review closed — NOT PAID',
    SELECT_METHOD:'Method selected in simulation — NOT PAID',
    AWAITING_FAKE_PROVIDER:'Fictional provider pending — NOT PAID',
    SIMULATED_UNKNOWN:'Test result unknown — NOT PAID · do not retry blindly',
    SIMULATED_CONFIRMED:'Fictional confirmation — NOT PAID',
    SIMULATED_FAILED:'Fictional failure — NOT PAID'
  });
  let mounted=false,received=false;
  const setOpen=open=>{
    popup.hidden=!open;overlay.hidden=!open;
    pay.setAttribute('aria-expanded',String(open));
    if(open)closeBtn.focus();else pay.focus();
  };
  const open=()=>{
    if(!mounted){
      // The original canonical Mini, no per-site payment or KS001 engine.
      // Source/order details are immutable fictional fixtures only.
      frame.src='/mini.html?embedded=1&demoCheckout='+
        encodeURIComponent(entry.fixtureId)+'&journey=1';
      mounted=true;
    }
    fallback.hidden=true;frame.hidden=false;
    setOpen(true);
    status.textContent='Sample checkout open — NOT PAID';
  };
  const close=()=>{
    setOpen(false);
    if(!received)status.textContent='Checkout closed — NOT PAID';
    // Retain iframe and fictional pending/unknown state on reopen.
  };
  const receive=event=>{
    if(event.origin!==window.location.origin||
       event.source!==frame.contentWindow||
       !event.data||typeof event.data!=='object')return;
    const msg=event.data;
    if(msg.type!=='SECUREPAY_MINI_OWNER_DEMO_RETURN_V1'||
       msg.version!==1||msg.fixtureId!==entry.fixtureId||
       msg.simulated!==true||
       !Object.prototype.hasOwnProperty.call(captions,msg.result))return;
    received=true;
    status.textContent=captions[msg.result];
    // A browser return is never authoritative. No host booking/order mutation.
    setOpen(false);
  };
  pay.addEventListener('click',open);
  closeBtn.addEventListener('click',close);
  overlay.addEventListener('click',close);
  window.addEventListener('message',receive);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!popup.hidden)close();
  });
  frame.addEventListener('error',()=>{
    frame.hidden=true;fallback.hidden=false;
    status.textContent='Mini did not load — NOT PAID';
  });
  frame.addEventListener('load',()=>{
    if(!mounted)return;
    window.setTimeout(()=>{
      try{
        const live=Boolean(frame.contentDocument?.querySelector('.spm-root'));
        frame.hidden=!live;fallback.hidden=live;
        if(!live)status.textContent='Mini content unavailable — NOT PAID';
      }catch{
        frame.hidden=true;fallback.hidden=false;
        status.textContent='Cannot verify Mini view — NOT PAID';
      }
    },900);
  });
})();
