import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './src/features/store/firstOfferDraft';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {createFirstOfferDraftStore,FIRST_OFFER_KEY}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const draft={kind:'PRODUCT',title:'Private timber offer',description:'Ten boards',priceMinor:120000,quantityAvailable:10,availabilityState:'AVAILABLE',published:true,mediaRefs:[]};
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
test('new store instance recovers the same private draft after reload, without publication or extra fields',()=>{
 const s=storage();const a=createFirstOfferDraftStore(s,()=>1000);a.remember({...draft,password:'never-store',latitude:42,ownerKsNumber:'KS999'});
 const restored=createFirstOfferDraftStore(s,()=>2000).read();assert.deepEqual(restored,{...draft,published:false});
 assert.doesNotMatch(s.getItem(FIRST_OFFER_KEY),/password|latitude|ownerKsNumber/);
});
test('expiry and malformed drafts are discarded; another tab has no draft',()=>{
 const s=storage();createFirstOfferDraftStore(s,()=>1000).remember(draft);
 assert.equal(createFirstOfferDraftStore(storage(),()=>2000).read(),null);
 assert.equal(createFirstOfferDraftStore(s,()=>1000+24*60*60*1000).read(),null);
 s.setItem(FIRST_OFFER_KEY,JSON.stringify({draft:{...draft,priceMinor:-1},expiresAt:5000}));
 assert.equal(createFirstOfferDraftStore(s,()=>2000).read(),null);
});
test('saved/discarded draft is forgotten; unavailable storage preserves only memory',()=>{
 const s=storage();const a=createFirstOfferDraftStore(s,()=>1000);a.remember(draft);a.clear();assert.equal(a.read(),null);assert.equal(s.getItem(FIRST_OFFER_KEY),null);
 const b=createFirstOfferDraftStore({getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}},()=>1000);b.remember(draft);assert.equal(b.read().title,draft.title);b.clear();assert.equal(b.read(),null);
});
