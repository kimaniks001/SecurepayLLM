// G1 same-origin HTTP adapter for the shared handoff protocol.
// No cross-origin fetch, URL credential, cookie auth, retry or proxy key.
const originShape=v=>typeof v==='string'&&!/\s/.test(v)&&/^https:\/\/(?:staging|test-(?:mini|sp4b|business|living|workspace)(?:-[a-z0-9]+)*)\.securepay\.ke$/.test(v);
const secret=v=>typeof v==='string'&&/^[A-Za-z0-9_~+./=-]{16,8192}$/.test(v);
const proof=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===keys.split(',').sort().join(',');
const id=v=>typeof v==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v);
const ks=v=>typeof v==='string'&&/^KS[0-9]{3,12}$/.test(v);
export function createWorkspaceTransport({enabled,localOrigin,approvedOrigins,fetcher=fetch,now=Date.now}){
 if(enabled!==true||!originShape(localOrigin)||!Array.isArray(approvedOrigins)||!approvedOrigins.includes(localOrigin)||approvedOrigins.length<2||!approvedOrigins.every(originShape)||new Set(approvedOrigins).size!==approvedOrigins.length)throw Error('Workspace transport unavailable');
 const approved=new Set(approvedOrigins);
 const future=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&Date.parse(v)>now();
 async function request(path,body,accessToken){
  if(accessToken!==undefined&&!secret(accessToken))throw Error('Workspace transfer unavailable');
  const headers={Accept:'application/json'};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(accessToken!==undefined)headers['X-SecurePay-Access-Token']='Bearer '+accessToken;
  try{
   const r=await fetcher(localOrigin+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!r.ok||!r.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error('Unconfirmed transfer');
   const reader=r.body?.getReader();if(!reader)throw Error('Unconfirmed transfer');
   const chunks=[];let length=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>32768){await reader.cancel();throw Error('Response too large');}chunks.push(value);}}finally{reader.releaseLock();}
   const data=new Uint8Array(length);let offset=0;for(const part of chunks){data.set(part,offset);offset+=part.byteLength;}
   return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
  }catch{throw Error('Workspace transfer unavailable. Sign in again if required.');}
 }
 return {
  async issue(v){
   if(!shape(v,'accessToken,refreshToken,targetOrigin,proofChallenge')||!secret(v.accessToken)||!secret(v.refreshToken)||v.accessToken===v.refreshToken||!approved.has(v.targetOrigin)||v.targetOrigin===localOrigin||!proof(v.proofChallenge))throw Error('Invalid transfer request');
   const r=await request('/api/v1/auth/workspace-transfer/issue',{refreshToken:v.refreshToken,targetOrigin:v.targetOrigin,proofChallenge:v.proofChallenge},v.accessToken);
   if(!shape(r,'ticket,expiresAt')||!secret(r.ticket)||!future(r.expiresAt)||Date.parse(r.expiresAt)>now()+45000)throw Error('Transfer not confirmed');
   return r;
  },
  async redeem(v){
   if(!shape(v,'ticket,verifier')||!secret(v.ticket)||!proof(v.verifier))throw Error('Invalid transfer proof');
   const r=await request('/api/v1/auth/workspace-transfer/redeem',v);
   if(!shape(r,'accessToken,accessTokenExpiresAt,refreshToken,refreshTokenExpiresAt')||!secret(r.accessToken)||!secret(r.refreshToken)||r.accessToken===r.refreshToken||!future(r.accessTokenExpiresAt)||!future(r.refreshTokenExpiresAt)||Date.parse(r.refreshTokenExpiresAt)<Date.parse(r.accessTokenExpiresAt))throw Error('Transfer not confirmed');
   return r;
  },
  async readIdentityWithToken(accessToken){
   const r=await request('/api/v1/participants/me/acting-context',undefined,accessToken);
   if(!r||!id(r.authenticatedIdentityId)||!ks(r.authenticatedKsNumber)||!Array.isArray(r.profiles)||r.profiles.length>1000||r.profiles.filter(p=>p&&p.authorityKind==='PERSONAL'&&p.actingIdentityId===r.authenticatedIdentityId&&p.actingKsNumber===r.authenticatedKsNumber).length!==1)throw Error('Human identity not confirmed');
   return {identityId:r.authenticatedIdentityId,ksNumber:r.authenticatedKsNumber};
  }
 };
}
