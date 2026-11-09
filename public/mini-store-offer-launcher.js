/* Owner-only same-origin Store offer review. NEVER install as production checkout SDK. */
(() => {
  'use strict';
  if(window.location.pathname!=='/checkout-store-offer-preview.html')return;
  const $=id=>document.getElementById(id);
  const choices=$('offer-choices'),notice=$('offer-notice'),form=$('offer-form');
  const popup=$('demo-popup'),overlay=$('demo-overlay'),frame=$('demo-frame');
  const closeButton=$('demo-close'),fallback=$('demo-fallback'),direct=$('demo-direct');
  if(!choices||!notice||!form||!popup||!overlay||!frame||!closeButton||!fallback||!direct)return;
  const ks=/^KS\d{3,12}$/,uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let busy=false;
  function setStatus(message){notice.textContent=message;}
  function show(open){
    popup.hidden=!open;
    overlay.hidden=!open;
    if(open)closeButton.focus();
  }
  function close(){
    show(false);
    setStatus('Returned from Mini · no order placed and nothing paid.');
  }
  function row(offer) {
    const b=document.createElement('button');
    b.type='button';
    b.className='demo-offer-choice';
    const title=document.createElement('strong');title.textContent=offer.title;
    const merchant=document.createElement('span');
    merchant.textContent=offer.sellerName+' · '+offer.sellerKsNumber;
    const price=document.createElement('span');
    price.textContent='Listed price · KSh '+(offer.priceMinor/100).toLocaleString('en-KE');
    b.append(title,merchant,price);
    b.addEventListener('click',()=>void review(offer.sellerKsNumber,offer.offerId,1));
    return b;
  }
  async function discover(){
    try{
      const response=await fetch('/api/mini-store-offer-preview?discover=1',{
        method:'GET',credentials:'same-origin',redirect:'error',cache:'no-store',
        headers:{Accept:'application/json'}
      });
      if(!response.ok)throw Error('STORE_DISCOVERY_UNAVAILABLE');
      const data=await response.json();
      if(!data||data.simulationOnly!==true||data.checkoutEnabled!==false||
        !Array.isArray(data.offers))throw Error('BAD_SOURCE');
      choices.replaceChildren();
      const offers=data.offers.filter(item=>item&&ks.test(item.sellerKsNumber)&&
        uuid.test(item.offerId)&&typeof item.title==='string'&&
        typeof item.sellerName==='string'&&
        Number.isSafeInteger(item.priceMinor)&&item.priceMinor>0);
      if(!offers.length){
        const p=document.createElement('p');p.className='demo-meta';
        p.textContent='No published priced products are available for preview right now. You can try a known Store offer below.';
        choices.append(p);return;
      }
      offers.slice(0,5).forEach(offer=>choices.append(row(offer)));
    }catch{
      choices.textContent='Store offers could not be loaded. No order was placed. You may try again or enter a known offer below.';
      const retry=document.createElement('button');retry.type='button';
      retry.className='demo-pay';retry.textContent='Retry Store search';
      retry.addEventListener('click',()=>void discover());choices.append(retry);
    }
  }
  async function review(sellerKsNumber,offerId,quantity){
    if(busy)return;
    sellerKsNumber=String(sellerKsNumber||'').trim().toUpperCase();
    offerId=String(offerId||'').trim();
    quantity=Number(quantity);
    if(!ks.test(sellerKsNumber)||!uuid.test(offerId)||
      !Number.isSafeInteger(quantity)||quantity<1||quantity>20){
      setStatus('Check the seller KS Number, Offer ID and quantity. Nothing paid.');
      return;
    }
    busy=true;
    setStatus('Checking the latest Store listing…');
    try{
      const response=await fetch('/api/mini-store-offer-preview',{
        method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({sellerKsNumber,offerId,quantity})
      });
      if(!response.ok)throw Error('SOURCE_UNAVAILABLE');
      const result=await response.json();
      if(!result||result.simulationOnly!==true||
        result.orderCreated!==false||result.paymentEnabled!==false||
        typeof result.offerSession!=='string'||
        result.offerSession.length<70||result.offerSession.length>1024||
        typeof result.expiresAt!=='number'||result.expiresAt<=Date.now())
        throw Error('INVALID_PREVIEW_REFERENCE');
      const url='/mini.html?embedded=1&storeOfferSession='+encodeURIComponent(result.offerSession);
      frame.hidden=false;fallback.hidden=true;frame.src=url;direct.href=url;
      show(true);
      setStatus('Review opened · no order placed and nothing paid.');
    }catch{
      setStatus('This Store offer could not be verified right now. Nothing paid. Check the listing and try again.');
    }finally{busy=false;}
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const data=new FormData(form);
    void review(data.get('sellerKsNumber'),data.get('offerId'),data.get('quantity'));
  });
  closeButton.addEventListener('click',close);
  overlay.addEventListener('click',close);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popup.hidden)close();});
  window.addEventListener('message',event=>{
    if(event.origin!==window.location.origin ||
      event.source!==frame.contentWindow||
      !event.data||event.data.type!=='SECUREPAY_MINI_STORE_OFFER_REVIEW_CLOSED'||
      event.data.reviewOnly!==true)return;
    close();
  });
  frame.addEventListener('load',()=>{
    if(!frame.src || frame.src==='about:blank')return;
    window.setTimeout(()=>{
      try {
        const mounted=Boolean(frame.contentDocument?.querySelector('.spm-root'));
        frame.hidden=!mounted;fallback.hidden=mounted;
      }catch{frame.hidden=true;fallback.hidden=false;}
    },900);
  });
  void discover();
})();
