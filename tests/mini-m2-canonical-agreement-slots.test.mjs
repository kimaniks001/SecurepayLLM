import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { miniAgreementSlots } from '../src/mini/miniAgreementSlots.mjs';

const read = path => readFileSync(fileURLToPath(new URL('../'+path,import.meta.url)),'utf8');
const cid='00000000-0000-4000-8000-000000000088';
const term=(key,label,value,needsChecking=false)=>({key,label,value,needsChecking,
  basis:'USER_STATED',evidence:[],detail:null});
const formation=()=>({
  conversationId:cid,version:7,digest:'synthetic-view-hash',stage:'FORMING',
  reviewable:true,confirmable:false,summary:'Synthetic mother collection discussion',
  what:[term('purpose','Purpose','Mother treatment')],
  who:[{key:'mum',name:'Mother',role:'Beneficiary',identity:'UNVERIFIED',
    link:'LINKED',participation:'NOT_JOINED',evidence:[]}],
  money:[term('target','Target','KSh 50,000',true)],
  when:[term('date','Proposed deadline','15 December 2026')],
  responsibilities:[{party:'Daughter',duties:[term('report','Reporting','Share expenses with contributors',true)]}],
  conditions:[],notIncluded:[],
  openPoints:[{id:'consent',kind:'PEOPLE',effect:'BLOCKS_SETUP',
    text:'Does your mother authorise the collection?',sides:[],
    checkable:true,checked:true,state:'ACKNOWLEDGED'}],
  question:{ask:true,id:'q-consent',text:'Who may receive these contributions?',
    choices:['My mother','A provider'],blocksSetUp:true,alreadyAsked:false},
  readingSources:[],
});

test('mother collection opens known People/Money/Dates/duties as draft slots only',()=>{
  const view=miniAgreementSlots(formation());
  assert.ok(view);
  assert.deepEqual(view.sections.map(x=>x.id),['purpose','people','money','dates','duties']);
  assert.equal(view.sections.find(x=>x.id==='money').items[0].value,'KSh 50,000');
  assert.equal(view.sections.find(x=>x.id==='dates').items[0].value,'15 December 2026');
  assert.equal(view.sections.find(x=>x.id==='duties').items[0].title,'Daughter — Reporting');
  assert.equal(view.accepted,false);
  assert.equal(view.paid,false);
  assert.equal(view.moneyMoved,false);
});
test('linked KS identity never becomes consent or participation authority',()=>{
  const v=miniAgreementSlots(formation());
  const p=v.sections.find(x=>x.id==='people').items[0];
  assert.equal(p.needsChecking,true);
  assert.match(p.detail,/Has not joined or accepted/);
  const x=formation();
  x.who[0].participation='NOT_NAMED';
  assert.equal(miniAgreementSlots(x).sections.find(x=>x.id==='people').items[0].needsChecking,true);
});
test('acknowledged or checked disagreement remains open, never automatically resolved',()=>{
  const v=miniAgreementSlots(formation());
  assert.equal(v.unresolved.length,1);
  assert.equal(v.unresolved[0].acknowledged,true);
  assert.match(v.unresolved[0].text,/authorise/);
});
test('question comes only from server and never repeats already asked question',()=>{
  const v=miniAgreementSlots(formation());
  assert.match(v.question.text,/Who may receive/);
  const a=formation();a.question.alreadyAsked=true;
  assert.equal(miniAgreementSlots(a).question,null);
  a.question=null;
  assert.equal(miniAgreementSlots(a).question,null);
});
test('missing essential canonical API properties fail closed',()=>{
  for(const corrupt of [
    {...formation(),conversationId:''},
    {...formation(),version:NaN},
    {...formation(),version:3.5},
    {...formation(),openPoints:null},
    {...formation(),who:null},
    {...formation(),money:null},
    {...formation(),responsibilities:null}
  ])assert.equal(miniAgreementSlots(corrupt),null);
});
test('unestablished slots do not create empty mandatory fields',()=>{
  const d=formation();
  d.what=[];d.who=[];d.money=[];d.when=[];d.responsibilities=[];d.openPoints=[];
  const v=miniAgreementSlots(d);
  assert.equal(v.sections.length,0);
  assert.equal(v.unresolved.length,0);
  assert.equal(v.accepted,false);
});
test('unverified money, changed terms and sources remain explicitly provisional',()=>{
  const d=formation();
  d.readingSources=['Lab quote'];
  d.reviewBlockedReason='Waiting for mother to agree';
  const v=miniAgreementSlots(d);
  assert.equal(v.sections.find(x=>x.id==='money').items[0].needsChecking,true);
  assert.deepEqual(v.sourceReading,['Lab quote']);
  assert.equal(v.reviewBlockedReason,'Waiting for mother to agree');
});
test('approved Mini remains a compact read-only layer inside existing KS001, no Money calls',()=>{
  const ui=read('src/mini/MiniAgreementSlots.tsx');
  const first=read('src/mini/MiniFirstPartyKs001.tsx');
  assert.match(first,/<MiniAgreementSlots formation=\{review\}\/>/);
  assert.match(ui,/<details/);
  assert.match(ui,/Needs checking/);
  assert.match(ui,/not an accepted Agreement/);
  assert.doesNotMatch(ui,/createHandoff|createAgreement|acceptAgreement|issueSecureLink|paymentIntent|releaseFunds/);
});
