import test from 'node:test';
import assert from 'node:assert/strict';
import { miniEnsureFreshSession } from '../src/api/securepay/sessionRefresh.mjs';

function session() {
  let state={status:'signed-out'},generation=0;
  return {
    getSnapshot:()=>state,
    getAccountGeneration:()=>generation,
    getAccessToken:()=>state.status==='signed-in'?state.tokens.accessToken:null,
    setTokens:tokens=>{generation++;state={status:'signed-in',tokens};},
    setRefreshedTokens:tokens=>{if(state.status==='signed-in')state={status:'signed-in',tokens};},
    clear:()=>{generation++;state={status:'signed-out'};},
    isAccessTokenExpired:()=>state.status==='signed-in'&&state.tokens.expired===true,
  };
}
const token=(accessToken,expired=false)=>({accessToken,refreshToken:'refresh-'+accessToken,expired});

test('P2: concurrent refresh requests rotate the original session only once',async()=>{
  const s=session();s.setTokens(token('A',true));
  let finish,calls=0;
  const auth={refresh:async()=>{calls++;return new Promise(resolve=>{finish=resolve;});}};
  const generation=s.getAccountGeneration();
  const a=miniEnsureFreshSession(s,auth),b=miniEnsureFreshSession(s,auth);
  assert.equal(calls,1);
  finish(token('A2'));
  await Promise.all([a,b]);
  assert.equal(s.getAccessToken(),'A2');
  assert.equal(s.getAccountGeneration(),generation);
});

test('P2: late account A refresh cannot replace logged-in B',async()=>{
  const s=session();s.setTokens(token('A',true));
  let finish;
  const work=miniEnsureFreshSession(s,{refresh:async()=>new Promise(resolve=>{finish=resolve;})});
  s.setTokens(token('B'));
  finish(token('A2'));
  await work;
  assert.equal(s.getAccessToken(),'B');
});

test('P2: late failure from A cannot revoke login B',async()=>{
  const s=session();s.setTokens(token('A',true));
  let fail;
  const work=miniEnsureFreshSession(s,{refresh:async()=>new Promise((_,reject)=>{fail=reject;})});
  s.setTokens(token('B'));
  fail(Error('Old refresh rejected'));
  await assert.rejects(work,/Old refresh rejected/);
  assert.equal(s.getAccessToken(),'B');
});

test('P2: a failed refresh of CURRENT login signs it out',async()=>{
  const s=session();s.setTokens(token('A',true));
  await assert.rejects(miniEnsureFreshSession(s,{
    refresh:async()=>{throw Error('Current refresh invalid');},
  }),/Current refresh invalid/);
  assert.equal(s.getSnapshot().status,'signed-out');
});

test('P2: refresh is not performed for unexpired or signed-out sessions',async()=>{
  const s=session();let calls=0;
  const auth={refresh:async()=>{calls++;return token('unexpected');}};
  await miniEnsureFreshSession(s,auth);
  s.setTokens(token('A',false));
  await miniEnsureFreshSession(s,auth);
  assert.equal(calls,0);
});
