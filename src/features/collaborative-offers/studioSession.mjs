import {studioRoute} from './studioTransport.mjs';
const ks=v=>typeof v==='string'&&/^KS[0-9]{3,12}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v);
const mini=/^https:\/\/(?:staging|test-mini(?:-[a-z0-9]+)*)\.securepay\.ke$/;
const living=/^https:\/\/test-(?:living|workspace)(?:-[a-z0-9]+)*\.securepay\.ke$/;
export function studioOrigin(product,configured,current,enabled){
 return enabled==='true'&&typeof configured==='string'&&configured===current&&(product==='mini'?mini:product==='living'?living:null)?.test(current)?current:null;
}
export function personalIdentity(v){
 if(!v||!uuid(v.authenticatedIdentityId)||!ks(v.authenticatedKsNumber)||!Array.isArray(v.profiles))return null;
 const matches=v.profiles.filter(p=>p?.authorityKind==='PERSONAL'&&p.actingIdentityId===v.authenticatedIdentityId&&p.actingKsNumber===v.authenticatedKsNumber);
 return matches.length===1?{identityId:v.authenticatedIdentityId,ksNumber:v.authenticatedKsNumber}:null;
}
export function represented(v,expected){
 return !!v&&ks(v.businessKsNumber)&&v.businessKsNumber===expected&&v.identityType==='BUSINESS'&&v.relationship==='ADMINISTRATOR'&&v.canActFor===true;
}
export function studioBusinesses(v){
 if(!Array.isArray(v)||v.length>200||!v.every(x=>represented(x,x?.businessKsNumber))||new Set(v.map(x=>x.businessKsNumber)).size!==v.length)return null;
 return v.map(x=>({ksNumber:x.businessKsNumber,label:typeof x.displayName==='string'?x.displayName.slice(0,80):x.businessKsNumber}));
}
export function studioPath(capacity,suffix,method='GET',body,enableG5=false){
 if(!capacity||!ks(capacity.ksNumber)||!['personal','business'].includes(capacity.kind))return null;
 const path='/api/v1/g4/'+(capacity.kind==='personal'?'me':'business/'+capacity.ksNumber)+'/studio/'+suffix;
 if(!studioRoute(method,path,body,enableG5)||method==='POST'&&suffix==='drafts'&&body.organizerKsNumber!==capacity.ksNumber)return null;
 return path;
}
// Same canonical session only; no refresh, token storage, redirect, or account swap.
// Calling shell can reopen after sign-in/refresh; every response must still be under the exact captured session.
export function studioClient({origin,token,current,fetcher,enableG5=false}){
 async function request(path,method='GET',body){
  if(!current()||!token||typeof path!=='string'||!path.startsWith('/api/v1/'))throw Error('Session changed');
  const response=await fetcher(origin+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});
  if(!current()||!response.ok)throw Error('Studio unavailable');
  const value=await response.json();if(!current())throw Error('Session changed');return value;
 }
 return {
  personal:async()=>{const p=personalIdentity(await request('/api/v1/participants/me/acting-context'));if(!p)throw Error('Identity not verified');return p;},
  businesses:async()=>{const b=studioBusinesses(await request('/api/v1/business/mine'));if(!b)throw Error('Business list unavailable');return b;},
  scoped:async(capacity,suffix,method='GET',body)=>{
   const path=studioPath(capacity,suffix,method,body,enableG5);if(!path)throw Error('Unsupported Studio operation');
   const p=personalIdentity(await request('/api/v1/participants/me/acting-context'));if(!p||p.identityId!==capacity.identityId||p.ksNumber!==capacity.personalKsNumber)throw Error('Identity changed');
   if(capacity.kind==='personal'&&capacity.ksNumber!==p.ksNumber)throw Error('Personal scope mismatch');
   if(capacity.kind==='business'&&!represented(await request('/api/v1/business/'+capacity.ksNumber+'/representation'),capacity.ksNumber))throw Error('Representation unavailable');
   return request(path,method,body);
  }
 };
}

// Reuse Mini/SP4B's isolated same-origin Basic Auth proxy convention. Never forward a token to a different origin.
export function studioProxyFetch(origin,fetcher=fetch){return async(input,init={})=>{
 const url=new URL(String(input));if(url.origin!==origin||!url.pathname.startsWith('/api/v1/')||url.username||url.password||url.hash)throw Error('Unapproved Studio request');
 const headers=new Headers(init.headers),direct=headers.get('Authorization'),proxied=headers.get('X-SecurePay-Access-Token');
 if(direct&&proxied&&direct!==proxied)throw Error('Conflicting authentication');
 if(direct){headers.delete('Authorization');headers.set('X-SecurePay-Access-Token',direct);}
 return fetcher(url.href,{...init,headers,credentials:'same-origin',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer'});
};}
