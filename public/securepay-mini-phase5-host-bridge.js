/* SecurePay Mini Phase 5 Gate 2 — same reusable owner-preview launcher.
 * Requests a preview-server-signed, source/version/origin-bound READ-ONLY ticket.
 * NO direct fixture launch, client-authored price or financial authority.
 * NOT a production cross-origin SDK, merchant authentication or payment rail.
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
  let mounted=false,received=false,ticket=null,expiresAt=0,opening=false;
  let unresolved=false;
  const validTicket=value=>typeof value==='string'&&
    value.length>=160&&value.length<=1100&&
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);

  const setOpen=open=>{
    popup.hidden=!open;overlay.hidden=!open;
    pay.setAttribute('aria-expanded',String(open));
    if(open)closeBtn.focus();else pay.focus();
  };
  const open=async()=>{
    if(opening)return;
    if(ticket&&expiresAt>Date.now()&&mounted){
      fallback.hidden=true;frame.hidden=false;setOpen(true);
      return; // reopen the SAME verified fictional source, not issue a new ticket
    }
    if(unresolved){
      status.textContent='Original test status unknown — NOT PAID. No automatic new ticket.';
      return;
    }
    opening=true;
    pay.disabled=true;
    const label=pay.textContent;
    pay.textContent='Preparing SecurePay…';
    status.textContent='Checking registered host — NOT PAID';
    try{
      // No amount, return URL, merchant or fixture from browser is trusted.
      const response=await fetch('/api/mini-phase5-host-ticket',{
        method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({action:'ISSUE',hostId:site})
      });
      if(!response.ok)throw Error('HOST_TICKET_UNAVAILABLE');
      const issued=await response.json();
      if(!issued||issued.simulationOnly!==true||
         issued.checkoutAuthorized!==false||issued.realPaymentEnabled!==false||
         issued.agreementAccepted!==false||issued.orderCreated!==false||
         issued.bookingConfirmed!==false||
         issued.hostId!==site||issued.sourceVersion!==
           (site==='STORE'?'fixture-store-v1':'fixture-stay-v1')||
         issued.returnAlias!==(site==='STORE'?'STORE_RETURN':'STAY_RETURN')||
         !validTicket(issued.ticket)||!Number.isSafeInteger(issued.expiresAt)||
         issued.expiresAt<=Date.now()||issued.expiresAt>Date.now()+300000)
         throw Error('INVALID_ISSUER_RESPONSE');
      ticket=issued.ticket;expiresAt=issued.expiresAt;
      mounted=true;received=false;unresolved=false;
      fallback.hidden=true;frame.hidden=false;
      frame.src='/mini.html?embedded=1&phase5Ticket='+encodeURIComponent(ticket);
      setOpen(true);
      status.textContent='Signed sample source opened — NOT PAID';
    }catch{
      // Fail closed. NEVER fall back to ?demoCheckout= or unverified payment.
      ticket=null;expiresAt=0;mounted=false;
      status.textContent='Registered-host check unavailable — NOT PAID. No checkout issued.';
      fallback.hidden=false;
      frame.hidden=true;
    }finally{
      opening=false;pay.disabled=false;pay.textContent=label;
    }
  };
  const close=()=>{
    setOpen(false);
    if(!received&&!opening)status.textContent='Checkout closed — NOT PAID';
    // Keep the signed preview ticket, iframe and unknown warning for owner review.
  };
  const receive=event=>{
    if(event.origin!==window.location.origin||
       event.source!==frame.contentWindow||
       !event.data||typeof event.data!=='object')return;
    const msg=event.data;
    if(!ticket||expiresAt<=Date.now())return;
    if(msg.type!=='SECUREPAY_MINI_OWNER_DEMO_RETURN_V1'||
       msg.version!==1||msg.fixtureId!==entry.fixtureId||
       msg.simulated!==true||
       !Object.prototype.hasOwnProperty.call(captions,msg.result))return;
    received=true;
    unresolved=msg.result==='SIMULATED_UNKNOWN';
    status.textContent=captions[msg.result];
    // A browser return is never authoritative. No host booking/order mutation.
    setOpen(false);
  };
  pay.addEventListener('click',()=>{void open();});
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
