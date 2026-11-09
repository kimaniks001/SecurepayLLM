/*
 * Gate 4: Store and ShortStays independently READ their own sandbox status
 * from the server. postMessage is only a hint to re-check, never payment proof.
 * Owner-preview only: NO real order, bank, booking, funds or settlement.
 */
(()=>{
  'use strict';
  const root=document.querySelector('[data-gate4-host]');
  const hosts=Object.freeze({
    STORE:{id:'STORE-DEMO-01',path:'/checkout-gate4-store.html'},
    SHORTSTAYS:{id:'STAY-DEMO-01',path:'/checkout-gate4-shortstays.html'}
  });
  const source=root?.dataset.gate4Host;
  const current=Object.prototype.hasOwnProperty.call(hosts,source)?hosts[source]:null;
  if(!current||window.location.pathname!==current.path||
     root.dataset.checkoutFixture!==current.id)return;
  const $=id=>document.getElementById(id);
  const pay=$('demo-pay'),popup=$('demo-popup'),overlay=$('demo-overlay'),
    frame=$('demo-frame'),closeButton=$('demo-close'),
    fallback=$('demo-fallback'),status=$('demo-status'),
    checkButton=$('demo-check-status');
  if([pay,popup,overlay,frame,closeButton,fallback,status,checkButton].some(x=>!x))return;
  const key='spm-gate4-owner-host-'+source;
  const tokenPattern=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  const goodToken=(value,min,max)=>typeof value==='string'&&value.length>=min&&
    value.length<=max&&tokenPattern.test(value);
  const safeStatuses=Object.freeze({
    NO_SIMULATED_ATTEMPT:'No test attempt started — NOT PAID',
    SIMULATED_PENDING:'Test attempt pending on sandbox server — NOT PAID',
    SIMULATED_UNKNOWN:'Test result unresolved — NOT PAID · do not retry',
    SIMULATED_CONFIRMED:'Test confirmation reconciled — NOT PAID',
    SIMULATED_FAILED:'Test failure reconciled — NOT PAID'
  });
  let checkout=null,attempt=null,activeUntil=0,opening=false,checking=false;
  const label=pay.textContent;
  function persist(){
    try{
      if(checkout)sessionStorage.setItem(key,JSON.stringify({
        checkout,attempt,expiresAt:activeUntil,fixtureId:current.id}));
      else sessionStorage.removeItem(key);
    }catch{/* optional browser tab-only state */}
  }
  function show(open){
    popup.hidden=!open;
    overlay.hidden=!open;
    pay.setAttribute('aria-expanded',String(open));
    if(open)closeButton.focus();
    else pay.focus();
  }
  function close(){
    show(false);
    // A close only ends the UI interaction; it does not decide payment status.
  }
  function clearExpired(){
    checkout=null;attempt=null;activeUntil=0;
    persist();
  }
  async function reconcile(){
    if(!checkout){
      status.textContent='No test checkout started — NOT PAID';
      checkButton.hidden=true;
      return;
    }
    if(checking)return;
    checking=true;
    checkButton.disabled=true;
    status.textContent='Checking original test attempt with server — NOT PAID';
    try{
      const url='/api/mini-gate4-return?checkout='+encodeURIComponent(checkout)+
        (attempt?'&attempt='+encodeURIComponent(attempt):'');
      const response=await fetch(url,{
        method:'GET',credentials:'same-origin',redirect:'error',cache:'no-store',
        headers:{Accept:'application/json'}
      });
      if(!response.ok)throw Error('NOT_VERIFIED');
      const data=await response.json();
      if(!data||data.source!=='SERVER_MATCHED_SANDBOX_ORDER_AND_ATTEMPT'||
        data.simulationOnly!==true||data.fixtureId!==current.id||
        data.hostReturnPath!==current.path||
        data.realPaymentVerified!==false||data.providerVerified!==false||
        data.acceptedAgreement!==false||data.orderCreated!==false||
        data.bookingConfirmed!==false||data.inventoryReserved!==false||
        data.accommodationHeld!==false||data.moneyMoved!==false||
        data.mayFulfil!==false||data.paymentReceipt!==null||
        data.matchedAgainstOriginalOrder!==Boolean(attempt)||
        !Object.prototype.hasOwnProperty.call(safeStatuses,data.status)||
        !Number.isSafeInteger(data.amountMinor)||data.amountMinor<=0||
        (attempt&&(!/^SIM-PAY-[A-F0-9]{24}$/.test(data.attemptId)||
          data.status==='NO_SIMULATED_ATTEMPT')))
        throw Error('UNTRUSTED_STATE');
      status.textContent=safeStatuses[data.status];
      checkButton.hidden=false;
    }catch{
      status.textContent='Cannot independently verify this test attempt — NOT PAID';
      checkButton.hidden=false;
    }finally{
      checking=false;
      checkButton.disabled=false;
    }
  }
  function restore(){
    try{
      const raw=JSON.parse(sessionStorage.getItem(key)||'null');
      if(!raw||raw.fixtureId!==current.id||!goodToken(raw.checkout,100,1200)||
        !Number.isSafeInteger(raw.expiresAt)||raw.expiresAt<=Date.now())return;
      checkout=raw.checkout;
      activeUntil=raw.expiresAt;
      attempt=goodToken(raw.attempt,95,1500)?raw.attempt:null;
      void reconcile();
    }catch{/* storage optional */}
  }
  async function open(){
    if(opening)return;
    if(checkout&&activeUntil>Date.now()){
      frame.src='/mini.html?embedded=1&sandboxReconcile='+encodeURIComponent(checkout);
      show(true);
      return;
    }
    opening=true;
    pay.disabled=true;pay.textContent='Opening SecurePay…';
    status.textContent='Preparing test agreement — NOT PAID';
    try{
      const response=await fetch('/api/mini-gate2-sandbox',{
        method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({action:'BEGIN',source})
      });
      if(!response.ok)throw Error('UNAVAILABLE');
      const data=await response.json();
      if(!data||data.simulationOnly!==true||data.orderCreated!==false||
        data.acceptedAgreement!==false||data.paymentEnabled!==false||
        !goodToken(data.session,100,1200)||
        !Number.isSafeInteger(data.expiresAt)||data.expiresAt<=Date.now())
        throw Error('UNSAFE_SESSION');
      checkout=data.session;attempt=null;activeUntil=data.expiresAt;
      persist();
      frame.hidden=false;fallback.hidden=true;
      frame.src='/mini.html?embedded=1&sandboxReconcile='+encodeURIComponent(checkout);
      show(true);
      void reconcile();
    }catch{
      clearExpired();
      status.textContent='Test checkout unavailable — nothing ordered or paid';
    }finally{
      opening=false;pay.disabled=false;pay.textContent=label;
    }
  }
  function receive(event){
    if(event.origin!==window.location.origin||
      event.source!==frame.contentWindow||
      !event.data||typeof event.data!=='object')return;
    const msg=event.data;
    if(msg.sandboxGate!==4||msg.simulated!==true||
      msg.orderCreated!==false||msg.agreementAccepted!==false)return;
    if(msg.type==='SECUREPAY_MINI_GATE4_ATTEMPT_REF_V1'){
      if(msg.fixtureId!==current.id||!goodToken(msg.attempt,95,1500)||
        !checkout||activeUntil<=Date.now())return;
      // Reference is only a lookup key. Always re-check against the original
      // checkout via server before treating ANY status as meaningful.
      attempt=msg.attempt;
      persist();
      void reconcile();
      return;
    }
    if(msg.type==='SECUREPAY_MINI_GATE4_RETURN_V1'){
      if(msg.fixtureId!==current.id && msg.fixtureId!==null)return;
      close();
      void reconcile();
    }
  }
  pay.addEventListener('click',()=>{void open();});
  closeButton.addEventListener('click',()=>{close();void reconcile();});
  overlay.addEventListener('click',()=>{close();void reconcile();});
  checkButton.addEventListener('click',()=>{void reconcile();});
  window.addEventListener('message',receive);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!popup.hidden){
    close();void reconcile();
  }});
  frame.addEventListener('error',()=>{
    frame.hidden=true;fallback.hidden=false;
  });
  frame.addEventListener('load',()=>{
    if(!checkout)return;
    window.setTimeout(()=>{
      try{
        const mounted=Boolean(frame.contentDocument?.querySelector('.spm-root'));
        frame.hidden=!mounted;fallback.hidden=mounted;
      }catch{frame.hidden=true;fallback.hidden=false;}
    },900);
  });
  // While the popup is open, keep checking the test server. A delayed unknown
  // resolution is discovered by independent GET, not a browser timer status.
  window.setInterval(()=>{
    if(!popup.hidden&&attempt&&!checking)void reconcile();
  },2500);
  restore();
})();
