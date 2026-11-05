import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../public/embed/securepay-embed.js',import.meta.url),'utf8');
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.parent=null;this.textContent='';this.className='';this.style={};this.hidden=false;this.listeners={};this.attributes={};this.value='';}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}
  appendChild(child){child.remove();child.parent=this;this.children.push(child);return child;}
  insertBefore(child,ref){child.remove();child.parent=this;const i=this.children.indexOf(ref);this.children.splice(i>=0?i:this.children.length,0,child);return child;}
  replaceChildren(...items){this.children.forEach(x=>x.parent=null);this.children=[];items.forEach(x=>this.appendChild(x));}
  attachShadow(){this.shadow=new Element('shadow');return this.shadow;}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f);}
  click(){(this.listeners.click||[]).forEach(f=>f());}
  querySelectorAll(selector){const found=[];function walk(n){for(const c of n.children){if(selector[0]==='.'&&c.className.split(' ').includes(selector.slice(1)))found.push(c);walk(c);}}walk(this);return found;}
}
function find(n,p){if(p(n))return n;if(n.shadow){const e=find(n.shadow,p);if(e)return e;}for(const c of n.children){const e=find(c,p);if(e)return e;}return null;}
const flush=async()=>{for(let n=0;n<16;n++)await Promise.resolve();};
test('Continue in SecurePay uses only precise postMessage; ack checks request and never leaks tokens in URL',async()=>{
  const root=new Element('body'),document={body:root,createElement:t=>new Element(t)};
  const receiver='https://staging.securepay.ke';
  const nonce='22222222-3333-4333-8333-444444444444';
  const secret='a'.repeat(48),ticket='b'.repeat(43);
  let targetUrl='',sent=[],handlers={},acknowledged=0,reset=0;
  function dispatch(event){(handlers.message||[]).forEach(handler=>handler(event));}
  const popup={
    location:{replace(url){targetUrl=url;Promise.resolve().then(()=>
      dispatch({source:popup,origin:receiver,data:{type:'securepay.embed.transfer.ready',nonce}}));}},
    postMessage:(data,origin)=>sent.push({data,origin}),close:()=>{}
  };
  const guest={
    snapshot:()=>({ready:true,status:'ready',conversationId:'11111111-2222-4222-8222-333333333333',entries:[],pending:null}),
    connect:async()=>{},reset:()=>{reset++;},
    createWorkTransfer:async()=>({ticket,guestToken:secret,receiverOrigin:receiver,siteId:'varsityville-next-demo',
      conversationId:'11111111-2222-4222-8222-333333333333',
      expiresAt:new Date(Date.now()+200000).toISOString()})
  };
  const host={
    SecurePayGuestAgent:{create:()=>guest},open:()=>popup,
    setTimeout:()=>1,clearTimeout:()=>{},
    addEventListener:(type,fn)=>{(handlers[type]??=[]).push(fn);},
    removeEventListener:(type,fn)=>{handlers[type]=(handlers[type]||[]).filter(x=>x!==fn);}
  };
  vm.runInNewContext(src,{window:host,document});
  const widget=host.SecurePayEmbed.mount({siteId:'varsityville-next-demo',title:'Estate.ke',
    getReturnContext:()=>({returnReference:'SR-123456',purpose:'HOME'}),
    onTransferClaimed:()=>{acknowledged++;}});
  widget.open();await flush();
  const continueButton=find(root,n=>n.tag==='button'&&n.textContent==='Continue in SecurePay');
  assert.ok(continueButton);
  continueButton.click();await flush();
  assert.equal(targetUrl,receiver+'/#/embed/continue');
  assert.equal(sent.length,1);
  assert.equal(sent[0].origin,receiver);
  assert.equal(sent[0].data.ticket,ticket);
  assert.equal(sent[0].data.guestToken,secret);
  assert.ok(!targetUrl.includes(ticket)&&!targetUrl.includes(secret));
  const status={type:'securepay.embed.transfer.claimed',nonce,
    siteId:'varsityville-next-demo',returnReference:'WRONG',status:'SECUREPAY_WORK_SAVED'};
  dispatch({source:popup,origin:receiver,data:status});
  assert.equal(acknowledged,0,'wrong request cannot be marked saved');
  dispatch({source:popup,origin:'https://evil.example',
    data:{...status,returnReference:'SR-123456'}});
  assert.equal(acknowledged,0,'wrong origin cannot mark saved');
  dispatch({source:popup,origin:receiver,
    data:{...status,returnReference:'SR-123456'}});
  await flush();
  assert.equal(acknowledged,1);
  assert.equal(reset,1,'retired anonymous guest state must be cleared');
});
