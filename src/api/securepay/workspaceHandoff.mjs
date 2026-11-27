// G1 candidate shared by Mini, SP4B and Living Workspace. No route is enabled by this file.
// Source and destination MUST be exact operator-approved HTTPS origins. The caller owns
// a user-approved popup/receiver window and authenticated same-origin transport.
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const shape=(v,keys)=>plain(v)&&Object.keys(v).sort().join(',')===keys.split(',').sort().join(',');
const origin=v=>typeof v==='string'&&!/\s/.test(v)&&/^https:\/\/(?:staging|test-(?:mini|sp4b|business|living|workspace)(?:-[a-z0-9]+)*)\.securepay\.ke$/.test(v);
const secret=v=>typeof v==='string'&&/^[A-Za-z0-9_~+./=-]{16,8192}$/.test(v);
const proof=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
const id=v=>typeof v==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v);
const ks=v=>typeof v==='string'&&/^KS[0-9]{3,12}$/.test(v);
const person=v=>plain(v)&&id(v.identityId)&&ks(v.ksNumber);
function validContext(v,expected){return person(v)&&person(expected)&&v.identityId===expected.identityId&&v.ksNumber===expected.ksNumber;}
function exactPeer(event,peer,peerOrigin){
 return !!peer&&origin(peerOrigin)&&event?.source===peer&&event.origin===peerOrigin;
}
function validPair(local,remote,approved){
 return origin(local)&&origin(remote)&&local!==remote&&Array.isArray(approved)&&approved.includes(local)&&approved.includes(remote);
}
function b64(bytes){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
export async function destinationProof(cryptoProvider){
 if(!cryptoProvider?.getRandomValues||!cryptoProvider?.subtle?.digest)throw Error('Secure proof unavailable');
 const verifier=b64(cryptoProvider.getRandomValues(new Uint8Array(32)));
 const nonce=b64(cryptoProvider.getRandomValues(new Uint8Array(32)));
 const challenge=b64(new Uint8Array(await cryptoProvider.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
 if(!proof(verifier)||!proof(nonce)||!proof(challenge)||verifier===nonce)throw Error('Invalid secure proof');
 return {verifier,nonce,challenge};
}
function validTokens(t,now){
 return shape(t,'accessToken,accessTokenExpiresAt,refreshToken,refreshTokenExpiresAt')&&secret(t.accessToken)&&secret(t.refreshToken)&&t.accessToken!==t.refreshToken&&
 Number.isFinite(Date.parse(t.accessTokenExpiresAt))&&Date.parse(t.accessTokenExpiresAt)>now&&
 Number.isFinite(Date.parse(t.refreshTokenExpiresAt))&&Date.parse(t.refreshTokenExpiresAt)>=Date.parse(t.accessTokenExpiresAt);
}
function validateConfig({localOrigin,peerOrigin,approvedOrigins,peer,enabled}){
 if(enabled!==true||!peer||!validPair(localOrigin,peerOrigin,approvedOrigins))throw Error('Workspace handoff unavailable');
}
// Source accepts ONE exact, destination-generated readiness challenge. It clears its
// old local session BEFORE issuing. Unknown results never restore/replay old credentials.
// A refresh already in flight must be drained by prepare(); dispatched commercial
// commands cannot be undone, so caller must obtain explicit save/discard and quiescence.
export function sourceHandoff(config){
 validateConfig(config);
 const {peer,peerOrigin,session,prepare,readIdentity,issue,post,now=Date.now}=config;
 const openedGeneration=session.getAccountGeneration(),openedAt=now();
 if(session.getSnapshot().status!=='signed-in')throw Error('Source sign-in required');
 const openingCurrent=()=>session.getAccountGeneration()===openedGeneration&&session.getSnapshot().status==='signed-in'&&now()>=openedAt&&now()-openedAt<120000;
 let phase='waiting';
 return {
  state:()=>phase,
  async receive(event){
   if(phase!=='waiting'||!exactPeer(event,peer,peerOrigin))return false;
   const m=event.data;
   if(!shape(m,'type,nonce,challenge')||m.type!=='SP_G1_READY'||!proof(m.nonce)||!proof(m.challenge))return false;
   if(!openingCurrent()){phase='failed';return false;}
   const generation=openedGeneration;
   phase='preparing';
   try{
    await prepare();
    const current=session.getSnapshot();
    if(!openingCurrent()||current.status!=='signed-in'||session.getAccountGeneration()!==generation)throw Error('Account changed');
    const expected=await readIdentity();
    if(!openingCurrent()||!person(expected)||session.getSnapshot()!==current||session.getAccountGeneration()!==generation||!validTokens(current.tokens,now()))throw Error('Identity or session changed');
    // Detach in one synchronous turn. The original session is never restored.
    session.clear();
    const detachedGeneration=session.getAccountGeneration();
    phase='detached';
    const result=await issue({accessToken:current.tokens.accessToken,refreshToken:current.tokens.refreshToken,targetOrigin:peerOrigin,proofChallenge:m.challenge});
    if(session.getAccountGeneration()!==detachedGeneration||session.getSnapshot().status!=='signed-out')throw Error('Account changed after transfer preparation');
    if(!shape(result,'ticket,expiresAt')||!secret(result.ticket)||!Number.isFinite(Date.parse(result.expiresAt))||Date.parse(result.expiresAt)<=now()||Date.parse(result.expiresAt)>now()+45000)throw Error('Transfer not confirmed');
    // Only ticket and correlated proof nonce cross the exact window boundary. The
    // human identity is supplied for comparison only; it grants no authority.
    post(peer,{type:'SP_G1_TICKET',nonce:m.nonce,ticket:result.ticket,expiresAt:result.expiresAt,identityId:expected.identityId,ksNumber:expected.ksNumber},peerOrigin);
    phase='sent';return true;
   }catch{phase='failed';throw Error('Workspace transfer unavailable. Sign in again if required.');}
  }
 };
}
export function destinationHandoff(config){
 validateConfig(config);
 const {peer,peerOrigin,session,redeem,readIdentityWithToken,post,now=Date.now}=config;
 let phase='idle',saved=null,generation=null;
 return {
  state:()=>phase,
  async begin(cryptoProvider){
   if(phase!=='idle'||session.getSnapshot().status!=='signed-out')throw Error('Destination account conflict');
   phase='preparing';generation=session.getAccountGeneration();
   try{
    saved=await destinationProof(cryptoProvider);
    if(session.getSnapshot().status!=='signed-out'||session.getAccountGeneration()!==generation)throw Error('Destination account changed');
    phase='waiting';post(peer,{type:'SP_G1_READY',nonce:saved.nonce,challenge:saved.challenge},peerOrigin);
   }catch{saved=null;phase='failed';throw Error('Workspace proof unavailable');}
  },
  async receive(event){
   if(phase!=='waiting'||!exactPeer(event,peer,peerOrigin))return false;
   const m=event.data;
   if(!shape(m,'type,nonce,ticket,expiresAt,identityId,ksNumber')||m.type!=='SP_G1_TICKET'||m.nonce!==saved?.nonce||!secret(m.ticket)||!person(m)||!Number.isFinite(Date.parse(m.expiresAt))||Date.parse(m.expiresAt)<=now()||Date.parse(m.expiresAt)>now()+45000)return false;
   const current=()=>session.getSnapshot().status==='signed-out'&&session.getAccountGeneration()===generation;
   if(!current()){saved=null;phase='failed';return false;}
   phase='redeeming';const verifier=saved.verifier;saved=null;
   try{
    const tokens=await redeem({ticket:m.ticket,verifier});
    if(!current()||!validTokens(tokens,now()))throw Error('Destination changed');
    // Verify against canonical acting context BEFORE installing tokens in application state.
    const actual=await readIdentityWithToken(tokens.accessToken);
    if(!current()||!validContext(actual,m))throw Error('Transferred identity not confirmed');
    session.setTokens(tokens);phase='complete';return true;
   }catch{phase='failed';throw Error('Workspace transfer not confirmed. Sign in again.');}
  }
 };
}
