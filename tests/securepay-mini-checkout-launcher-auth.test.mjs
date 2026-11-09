import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import {
  MINI_CHECKOUT_PREVIEW_BRANCH,
  handleMiniCheckoutPreview
} from '../api/mini-checkout-preview.js';

const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');
const now = () => Date.now();
const env = {
  VERCEL_ENV:'preview',
  VERCEL_GIT_COMMIT_REF:MINI_CHECKOUT_PREVIEW_BRANCH,
  VERCEL_URL:'securepay-branch-preview.vercel.app',
  MINI_CHECKOUT_PREVIEW_SECRET:'R'.repeat(64),
};
const origin='https://'+env.VERCEL_URL;

function jsonResponse(){
  return {
    statusCode:200, headers:{},data:null,
    setHeader(name,value){this.headers[name.toLowerCase()]=value},
    end(value){this.data=JSON.parse(value)}
  };
}
async function server(method,path,body){
  const result=jsonResponse();
  await handleMiniCheckoutPreview({
    method,
    url:path,
    headers:{host:env.VERCEL_URL,origin,
      'content-type':'application/json'},
    body,
  },result,env,now());
  return {ok:result.statusCode>=200&&result.statusCode<300,
    status:result.statusCode,
    json:async()=>result.data,
    headers:result.headers};
}

function createHost(source){
  const store=source==='STORE',id=store?'STORE-DEMO-01':'STAY-DEMO-01';
  const path=store?'/checkout-demo-store.html':'/checkout-demo-shortstays.html';
  const listeners={};
  const elements={};
  for(const name of ['demo-pay','demo-popup','demo-close','demo-overlay','demo-frame','demo-fallback','demo-status']){
    elements[name]={hidden:name==='demo-popup'||name==='demo-overlay'||name==='demo-fallback',
      textContent:name==='demo-pay'?'Pay with SecurePay':'Payment not started',
      disabled:false,src:name==='demo-frame'?'about:blank':undefined,
      dataset:{},listeners:{},
      setAttribute(){},focus(){},
      addEventListener(type,listener){this.listeners[type]=listener;}
    };
  }
  const callLog=[];
  let grant=true;
  const host={
    document:{
      querySelector:selector=>selector==='[data-demo-host]'?
        {dataset:{demoHost:source,checkoutFixture:id}}:null,
      getElementById:name=>elements[name],
      addEventListener(type,fn){listeners[type]=fn}
    },
    window:{
      location:{pathname:path,origin},
      addEventListener(type,fn){listeners[type]=fn},
      setTimeout:()=>0,
    },
    fetch:async(route,options)=>{
      callLog.push({route,options});
      // Model a deployment protected by Vercel Authentication.
      // Requests WITHOUT the user's same-origin login cookie are denied.
      if(options.credentials!=='same-origin' || !grant)
        return {ok:false,status:401,json:async()=>({code:'AUTH_REQUIRED'})};
      return server(options.method,route,JSON.parse(options.body));
    }
  };
  runInNewContext(read('public/checkout-demo-server-host.js'),host);
  return {elements,callLog,id,origin,
    open:async()=>{elements['demo-pay'].listeners.click(); await Promise.resolve();
      await new Promise(resolve=>setImmediate(resolve));},
    close:()=>elements['demo-close'].listeners.click(),
    receive:payload=>listeners.message({
      origin,source:elements['demo-frame'].contentWindow,data:payload}),
    setGrant:value=>{grant=value}
  };
}

test('Store and ShortStays launch from browser via POST with SAME-ORIGIN preview login, no amount',async()=>{
  for(const kind of ['STORE','SHORTSTAYS']){
    const host=createHost(kind);
    host.elements['demo-frame'].contentWindow={};
    await host.open();
    assert.equal(host.callLog.length,1);
    assert.equal(host.callLog[0].options.credentials,'same-origin');
    assert.equal(host.callLog[0].options.redirect,'error');
    assert.deepEqual(JSON.parse(host.callLog[0].options.body),{source:kind});
    assert.ok(host.elements['demo-frame'].src.startsWith('/mini.html?embedded=1&checkoutSession='));
    assert.equal(host.elements['demo-popup'].hidden,false);
    assert.equal(host.elements['demo-pay'].disabled,false);
    assert.ok(!host.elements['demo-frame'].src.includes('merchant='));
    assert.ok(!host.elements['demo-frame'].src.includes('amount='));
    host.close();
    await host.open();
    assert.equal(host.callLog.length,1,'reopening uses the same unexpired preview checkout');
  }
});

test('no Vercel login permission produces a safe not-paid error, never false success or fallback',async()=>{
  const host=createHost('SHORTSTAYS');
  host.setGrant(false);
  await host.open();
  assert.equal(host.callLog.length,1);
  assert.equal(host.elements['demo-popup'].hidden,true);
  assert.equal(host.elements['demo-pay'].disabled,false);
  assert.match(host.elements['demo-status'].textContent,/unavailable.*Nothing paid/i);
  assert.equal(host.elements['demo-frame'].src,'about:blank');
});

test('the SAME-ORIGIN authentication cookie is also used when Mini reads an issued context',async()=>{
  const created=await server('POST','/api/mini-checkout-preview',{source:'STORE'});
  assert.equal(created.status,201);
  const issued=await created.json();
  const tsOutput=ts.transpileModule(read('src/mini/checkoutServerClient.ts'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
  }).outputText;
  const exportObject={};
  let usesCookie=false,requestedPath='';
  runInNewContext(tsOutput,{
    exports:exportObject,Number,Object,Date,String,
    fetch:async(path,options)=>{
      requestedPath=path;
      usesCookie=options.credentials==='same-origin';
      if(!usesCookie)return {ok:false,status:401};
      return server('GET',path,undefined);
    }
  });
  const result=await exportObject.fetchMiniPreviewCheckout(issued.session);
  assert.equal(usesCookie,true);
  assert.match(requestedPath,/^\/api\/mini-checkout-preview\?session=/);
  assert.equal(result.status,'ready');
  assert.equal(result.value.record.id,'STORE-DEMO-01');
  assert.equal(result.value.simulationOnly,true);
  assert.equal(result.value.financialAuthority,false);
  assert.equal(result.value.agreementAccepted,false);
  assert.equal(result.value.reservationHeld,false);
});
