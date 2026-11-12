import test from 'node:test';
import assert from 'node:assert/strict';
import {miniHistoryRestored} from '../src/mini/miniHistoryProof.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const cid='00000000-0000-4000-8000-000000000066';
const serverMessage=(n)=>({id:'h'+String(n).padStart(3,'0'),
  sender:n%2?'KS001':'HUMAN',text:n%2?'What else about delivery?':'I need chairs '+n,
  occurredAt:'2026-11-12T09:00:00Z'});
function session(count=24){
  const entries=Array.from({length:count},(_,i)=>serverMessage(i));
  const turns=entries.map(e=>e.sender==='HUMAN'
    ?{id:e.id,sender:'user',text:e.text}
    :{id:e.id,sender:'agent',response:{message:{type:'MESSAGE',text:e.text}}});
  return {history:{entries},state:{conversationId:cid,turns,pending:null,error:null,context:{status:'ready'}}};
}
test('12-turn Ruiru chairs conversation (24 entries) restores without artificial 20-message limit',()=>{
  const {history,state}=session(24);
  assert.equal(miniHistoryRestored(history,state,cid),true);
  const mini=read('src/mini/MiniFirstPartyKs001.tsx');
  const ctrl=read('src/features/agent/controller.ts');
  assert.match(mini,/conversationHistory\(priorId\)/);
  assert.doesNotMatch(mini,/conversationHistory\(priorId,\s*20\)/);
  assert.match(mini,/resumeConversation\(priorId,\s*history\)/);
  assert.match(ctrl,/verifiedHistory\s*\?\?\s*await gateway\.conversationHistory\(conversationId\)/);
});
test('longer conversations beyond twenty turns also restore',()=>{
  const {history,state}=session(86);
  assert.equal(miniHistoryRestored(history,state,cid),true);
});
test('empty new-but-authorised conversation with fresh context is a valid empty history',()=>{
  const {history,state}=session(0);
  assert.equal(miniHistoryRestored(history,state,cid),true);
});
test('equal-length but wrong historical message never passes',()=>{
  const {history,state}=session();
  state.turns[5].response.message.text='Changed response';
  assert.equal(miniHistoryRestored(history,state,cid),false);
});
test('equal-length but reordered IDs, speakers, or duplicated IDs never pass',()=>{
  for(const field of ['id','sender','dup']){
    const {history,state}=session();
    if(field==='id')state.turns[0].id='h0009';
    if(field==='sender')state.turns[0].sender='agent';
    if(field==='dup')history.entries[1].id=history.entries[0].id;
    assert.equal(miniHistoryRestored(history,state,cid),false,field);
  }
});
test('missing context or wrong conversation ID fails closed',()=>{
  const {history,state}=session();
  assert.equal(miniHistoryRestored(history,{...state,context:{status:'loading'}},cid),false);
  assert.equal(miniHistoryRestored(history,{...state,context:{status:'error'}},cid),false);
  assert.equal(miniHistoryRestored(history,{...state,conversationId:'another'},cid),false);
});
test('invalid history, unresolved pending command or backend error fails closed',()=>{
  const {history,state}=session();
  assert.equal(miniHistoryRestored({entries:'bad'},state,cid),false);
  assert.equal(miniHistoryRestored(history,{...state,pending:{kind:'turn'}},cid),false);
  assert.equal(miniHistoryRestored(history,{...state,error:'history not loaded'},cid),false);
});
