import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('src/mini/miniAddedPaymentMethods.ts');
const compiled=ts.transpileModule(source,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}
}).outputText;
const m=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const {miniMethodAlias,miniMethodList,miniMethodAdd,miniMethodRemove,
  miniReadAddedMethods,miniWriteAddedMethods,miniAddedMethodRoute,
  MINI_ADDED_METHOD_LIMIT,MINI_ADDED_METHOD_STORAGE,MINI_ADDED_ROUTES}=m;

test('owner may add and select a fictional label mapped to one of the existing three rails',()=>{
  let methods=[];
  for(const [alias,route] of [
    ['Personal mobile money','MPESA'],
    ['Bank savings','CHOICE_BANK'],
    ['My bank transfer','PESALINK']
  ]){
    const added=miniMethodAdd(methods,alias,route);
    assert.ok(added);
    methods=added.items;
    assert.equal(added.method.alias,alias);
    assert.equal(miniAddedMethodRoute(added.method),route);
    assert.equal(added.method.simulationOnly,true);
    for(const k of ['providerConnected','accountVerified','paymentEnabled'])
      assert.equal(added.method[k],false);
  }
  assert.deepEqual(MINI_ADDED_ROUTES.map(x=>x.id),
    ['CHOICE_BANK','MPESA','PESALINK','OTHER']);
  assert.equal(methods.length,3);
  assert.equal(miniMethodAdd(methods,'bank SAVINGS','MPESA'),null,'alias duplicates fail closed');
  const cleaned=miniMethodRemove(methods,methods[1].id);
  assert.equal(cleaned.length,2);
  assert.equal(cleaned.find(x=>x.alias==='Bank savings'),undefined);
  const reused=miniMethodAdd(cleaned,'Holiday money','MPESA');
  assert.equal(reused.method.id,'SAMPLE-2');
});

test('unconnected provider can be remembered but cannot become an executable rail',()=>{
  const added=miniMethodAdd([],'Local SACCO','OTHER');
  assert.ok(added);
  assert.equal(miniAddedMethodRoute(added.method),null);
  assert.equal(added.method.providerConnected,false);
  assert.equal(added.method.paymentEnabled,false);
  assert.equal(miniMethodAdd([], 'Unapproved provider','UNSAFE_PROVIDER'),null);
  assert.equal(miniMethodAdd([], 'Online bank','REAL_BANK_TRANSFER'),null);
});

test('never solicit or store accounts, phone numbers, PINs, secrets or arbitrary injection strings',()=>{
  for(const alias of [
    '0722123456','+254722123456','Account number 123456789',
    'PIN 4321','CVV 999','Password abc','1234',
    '<script>alert(1)</script>','Mary@example.com',
    'A'.repeat(37),'x','  ',null,{},'Equity 12345'
  ]){
    assert.equal(miniMethodAlias(alias),null,String(alias));
    assert.equal(miniMethodAdd([],alias,'MPESA'),null,String(alias));
  }
  assert.equal(miniMethodAlias(' My day-to-day wallet '),'My day-to-day wallet');
});

test('at most five aliases may be saved; removal cannot fabricate extra slots',()=>{
  let items=[];
  for(let i=1;i<=MINI_ADDED_METHOD_LIMIT;i++)items=miniMethodAdd(
    items,'Wallet '+i,'MPESA').items;
  assert.equal(items.length,5);
  assert.equal(miniMethodAdd(items,'Wallet six','MPESA'),null);
  assert.equal(miniMethodList([...items,items[0]]).length,0);
  assert.equal(miniMethodList(items).length,5);
  assert.equal(miniMethodRemove(items,'fake').length,5);
});

test('tab-local persistence restores only validated explicit simulated/nonfinancial records',()=>{
  const data=new Map();
  const storage={getItem:key=>data.get(key)||null,
    setItem:(key,value)=>{data.set(key,value);}};
  const item=miniMethodAdd([],'My bank savings','CHOICE_BANK').items;
  assert.equal(miniWriteAddedMethods(item,storage),true);
  assert.deepEqual(miniReadAddedMethods(storage),item);
  assert.ok(data.has(MINI_ADDED_METHOD_STORAGE));
  for(const forgery of [
    [{...item[0],paymentEnabled:true}],
    [{...item[0],providerConnected:true}],
    [{...item[0],accountVerified:true}],
    [{...item[0],id:'real-bank-account-1'}],
    [...item,...item]
  ]){
    data.set(MINI_ADDED_METHOD_STORAGE,JSON.stringify(forgery));
    assert.deepEqual(miniReadAddedMethods(storage),[]);
    assert.equal(miniWriteAddedMethods(forgery,storage),false);
  }
  assert.deepEqual(miniReadAddedMethods({getItem:()=>'{broken'}),[]);
  assert.equal(miniWriteAddedMethods(item,{setItem:()=>{throw Error('Storage denied');}}),false);
});

test('both existing Mini rail pickers include Add payment method without changing the provider engine',()=>{
  const local=read('src/mini/MiniFundingPreview.tsx');
  const signed=read('src/mini/MiniGate3Funding.tsx');
  const ui=read('src/mini/MiniAddedPaymentMethods.tsx');
  const gates=read('api/mini-gate3-sandbox.js');
  assert.match(local,/<MiniAddedPaymentMethods language=\{language\}/);
  assert.match(signed,/<MiniAddedPaymentMethods language=\{language\}/);
  assert.match(local,/miniAddedMethodRoute\(savedMethod\)!==null/);
  assert.match(signed,/Boolean\(savedMethod&&!miniAddedMethodRoute\(savedMethod\)\)/);
  assert.match(signed,/startGate3Simulation\(reviewSession,rail,scenario\)/);
  assert.match(local,/miniFundingTestTransition/);
  assert.match(ui,/Add payment method/);
  assert.match(ui,/Save fictional method/);
  assert.match(ui,/This provider is not connected/);
  assert.match(ui,/aria-pressed/);
  assert.match(ui,/disabled=\{disabled\}/);
  assert.match(ui,/sessionStorage/);
  assert.match(gates,/GATE3_RAILS = Object\.freeze\(\['CHOICE_BANK', 'MPESA', 'PESALINK'\]\)/);
  for(const s of [source,ui]){
    assert.doesNotMatch(s,/fetch\(|\.initiate\(|STKPush|postMessage|fundFromSelf|sendWhatsApp|bankAccountNumber/);
  }
});
