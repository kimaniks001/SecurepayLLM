/* Phase 3 Gate 3 preview-only host launcher. Never a financial status channel. */
(()=>{
  'use strict';
  const container=document.querySelector('[data-gate3-host]');
  const options=Object.freeze({
    STORE:{id:'STORE-DEMO-01',path:'/checkout-gate3-store.html'},
    SHORTSTAYS:{id:'STAY-DEMO-01',path:'/checkout-gate3-shortstays.html'},
  });
  const source=container?.dataset.gate3Host;
  const item=Object.prototype.hasOwnProperty.call(options,source)?options[source]:null;
  if(!item||window.location.pathname!==item.path||
      container.dataset.checkoutFixture!==item.id)return;
  const button=document.getElementById('demo-pay');
  const popup=document.getElementById('demo-popup');
  const overlay=document.getElementById('demo-overlay');
  const frame=document.getElementById('demo-frame');
  const closeButton=document.getElementById('demo-close');
  const fallback=document.getElementById('demo-fallback');
  const status=document.getElementById('demo-status');
  if([button,popup,overlay,frame,closeButton,fallback,status].some(x=>!x))return;
  const statuses=Object.freeze({
    NOT_STARTED:'Sample agreement review closed — NOT PAID',
    SELECT_METHOD:'Simulated rail selected — NOT PAID',
    AWAITING_FAKE_PROVIDER:'Test result pending — NOT PAID',
    SIMULATED_UNKNOWN:'Unknown test result — NOT PAID',
    SIMULATED_FAILED:'Test failed — NOT PAID',
    SIMULATED_CONFIRMED:source==='STORE'?'Simulated confirmation — NOT PAID':
      'Simulated confirmation — NOT PAID · NOT BOOKED',
  });
  const original=button.textContent;
  let activeUntil=0;
  let loading=false;
  function show(open){
    popup.hidden=!open;
    overlay.hidden=!open;
    button.setAttribute('aria-expanded',String(open));
    if(open)closeButton.focus();
    else button.focus();
  }
  function close(){
    show(false);
    if(status.dataset.demoReturned!=='yes')
      status.textContent='Sample checkout closed — NOT PAID';
  }
  async function open(){
    if(loading)return;
    if(activeUntil>Date.now()&&frame.src&&!frame.src.endsWith('about:blank')){
      show(true);return;
    }
    loading=true;
    button.disabled=true;
    button.textContent='Opening SecurePay…';
    status.textContent='Preparing sample order and agreement…';
    status.dataset.demoReturned='no';
    try {
      const response=await fetch('/api/mini-gate2-sandbox',{
        method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({action:'BEGIN',source})
      });
      if(!response.ok)throw Error('SANDBOX_NOT_AVAILABLE');
      const data=await response.json();
      if(!data||data.simulationOnly!==true||data.orderCreated!==false||
        data.acceptedAgreement!==false||data.paymentEnabled!==false||
        typeof data.session!=='string'||data.session.length<100||
        data.session.length>1200||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data.session)||
        !Number.isSafeInteger(data.expiresAt)||data.expiresAt<=Date.now())
        throw Error('BAD_SANDBOX_RESPONSE');
      activeUntil=data.expiresAt;
      fallback.hidden=true;
      frame.hidden=false;
      frame.src='/mini.html?embedded=1&sandboxPayment='+encodeURIComponent(data.session);
      status.textContent='Reviewing sample terms in Mini — NOT PAID';
      show(true);
    }catch{
      activeUntil=0;
      status.textContent='Sample checkout unavailable. Nothing ordered, signed or paid.';
    }finally{
      loading=false;
      button.disabled=false;
      button.textContent=original;
    }
  }
  function onReturn(event){
    if(event.origin!==window.location.origin||
      event.source!==frame.contentWindow||
      !event.data||typeof event.data!=='object')return;
    const data=event.data;
    if(data.type==='SECUREPAY_MINI_GATE2_CANCEL'&&data.sandboxGate===3&&
        data.simulated===true) {
      status.dataset.demoReturned='yes';
      status.textContent='Sample checkout closed — NOT PAID';
      close();
      return;
    }
    // Informative host display only. Never use postMessage as a payment receipt.
    if(data.type==='SECUREPAY_MINI_SANDBOX_PROGRESS_V1'&&
       data.sandboxGate===3&&data.simulated===true&&
       data.fixtureId===item.id&&
       data.orderCreated===false&&data.agreementAccepted===false&&
       Object.prototype.hasOwnProperty.call(statuses,data.result)){
      status.textContent=statuses[data.result];
      status.dataset.demoReturned='no';
      return;
    }
    if(data.type!=='SECUREPAY_MINI_OWNER_DEMO_RETURN_V1'||
      data.version!==1||data.fixtureId!==item.id||
      data.simulated!==true||data.sandboxGate!==3||
      data.agreementAccepted!==false||data.orderCreated!==false||
      !Object.prototype.hasOwnProperty.call(statuses,data.result))return;
    status.textContent=statuses[data.result];
    status.dataset.demoReturned='yes';
    close();
  }
  button.addEventListener('click',()=>{void open();});
  closeButton.addEventListener('click',close);
  overlay.addEventListener('click',close);
  window.addEventListener('message',onReturn);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!popup.hidden)close();
  });
  frame.addEventListener('error',()=>{
    frame.hidden=true;fallback.hidden=false;
  });
  frame.addEventListener('load',()=>{
    if(!activeUntil)return;
    window.setTimeout(()=>{
      try{
        const ready=Boolean(frame.contentDocument?.querySelector('.spm-root'));
        frame.hidden=!ready;fallback.hidden=ready;
      }catch{frame.hidden=true;fallback.hidden=false;}
    },900);
  });
})();
