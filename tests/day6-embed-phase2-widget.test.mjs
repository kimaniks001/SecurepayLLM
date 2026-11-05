import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../public/embed/securepay-embed.js', import.meta.url), 'utf8');

class Node {
  constructor(tag) {
    this.tag = tag; this.children = []; this.parent = null; this.shadow = null;
    this.className = ''; this.textContent = ''; this.hidden = false; this.value = '';
    this.attributes = {}; this.style = {}; this.listeners = {};
  }
  appendChild(n) {n.remove(); n.parent = this; this.children.push(n); return n;}
  insertBefore(n,ref) {n.remove(); n.parent=this; const pos=this.children.indexOf(ref); this.children.splice(pos<0?this.children.length:pos,0,n); return n;}
  replaceChildren(...nodes) {this.children.forEach(n=>n.parent=null);this.children=[];nodes.forEach(n=>this.appendChild(n));}
  remove() {if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
  setAttribute(k,v) {this.attributes[k]=v;}
  addEventListener(k,f) {(this.listeners[k]??=[]).push(f);}
  click() {(this.listeners.click||[]).forEach(f=>f());}
  attachShadow() {this.shadow = new Node('shadow');return this.shadow;}
  querySelectorAll(selector) {const out=[]; const walk=n=>{for(const c of n.children){if(selector.startsWith('.')&&c.className.split(' ').includes(selector.slice(1)))out.push(c);walk(c)}};walk(this);return out;}
}
function find(node,predicate) {
  if(predicate(node))return node;
  if(node.shadow){const found=find(node.shadow,predicate);if(found)return found;}
  for(const child of node.children){const found=find(child,predicate);if(found)return found;}
  return null;
}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

test('estate guest widget preserves suggestions, genuinely returned reply and a single settings/invite footer',async()=>{
  const body = new Node('body');
  const document = {body,createElement:tag=>new Node(tag)};
  const chat = {status:'ready',ready:true,entries:[],error:'',pending:null};
  const client = {
    connect:async()=>({...chat}),
    snapshot:()=>({...chat,entries:[...chat.entries]}),
    send:async text=>{
      chat.entries.push({sender:'HUMAN',text});
      chat.entries.push({sender:'KS001',text:'Real backend answer'});
      return {...chat};
    },
    retry:async()=>({...chat}),
    reset:()=>{chat.entries=[];return {...chat};}
  };
  const window = {SecurePayGuestAgent:{create:()=>client}};
  const context = vm.createContext({window,document});
  vm.runInContext(source,context);
  const mount=window.SecurePayEmbed.mount({
    siteId:'varsityville-next-demo',
    title:'Varsityville Estate',
    apiBaseUrl:'https://staging.securepay.ke',
    suggestedPrompts:['I need a plumber']
  });
  mount.open();
  await flush();
  const prompt=find(body,n=>n.tag==='button'&&n.textContent==='I need a plumber');
  assert.ok(prompt,'human-confirmed prompt is visible');
  prompt.click();
  assert.equal(find(body,n=>n.tag==='textarea').value,'I need a plumber');
  find(body,n=>n.tag==='button'&&n.textContent==='Send').click();
  await flush();
  assert.ok(find(body,n=>n.textContent==='Real backend answer'),'real stub response displayed');
  assert.equal(find(body,n=>n.textContent==='⚙ Settings')!==null,true);
  const footer=body.children[0].shadow.querySelectorAll('.row')
    .filter(n=>n.children.some(c=>c.textContent==='⚙ Settings'));
  assert.equal(footer.length,1,'single footer no duplicate');
  mount.destroy();
  assert.equal(body.children.length,0);
});
