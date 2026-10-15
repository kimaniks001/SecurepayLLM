import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import handler from '../api/preview-agent.js';

const source=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const headers={host:'securepay-test.vercel.app',origin:'https://securepay-test.vercel.app','content-type':'application/json'};
const path='/api/agent/conversations/example123/sources/upload';
const call=async (body,overrides={})=>{
  const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};
  await handler({method:'POST',query:{path},headers:{...headers,...overrides},body},res);
  return res;
};

test('photo relay rejects unsupported media, bad bytes and invalid origin without contacting backend', async()=>{
  const req={sourceKind:'PHOTO',filename:'receipt.jpg',mediaType:'image/jpeg',label:'Review this',dataBase64:Buffer.from('not a photo').toString('base64')};
  assert.equal((await call(req)).statusCode,415);
  assert.equal((await call({...req,mediaType:'image/svg+xml'})).statusCode,400);
  assert.equal((await call({...req,filename:'../receipt.jpg'})).statusCode,400);
  assert.equal((await call({...req,dataBase64:'%bad'})).statusCode,400);
  assert.equal((await call('{bad')).statusCode,400);
  assert.equal((await call(req,{origin:'https://attacker.example'})).statusCode,403);
});

test('photo relay forwards only canonical source photo multipart with token',async()=>{
  const previous=globalThis.fetch;
  let observed;
  globalThis.fetch=async(url,init)=>{
    observed={url:String(url),init};
    return new Response(JSON.stringify({sourceArtifactId:'source-123',extractionStatus:'RECEIVED'}),{status:201,headers:{'Content-Type':'application/json'}});
  };
  try{
    const jpeg=Buffer.from([0xff,0xd8,0xff,0xd9]);
    const response=await call({sourceKind:'PHOTO',filename:'photo.jpg',mediaType:'image/jpeg',label:'Chair delivery',dataBase64:jpeg.toString('base64')},{'x-securepay-conversation-token':'scoped-secret'});
    assert.equal(response.statusCode,201);
    assert.equal(observed.url,'https://securepay.ke'+path);
    assert.ok(observed.init.body instanceof FormData);
    assert.equal(observed.init.body.get('sourceKind'),'PHOTO');
    assert.equal(observed.init.body.get('label'),'Chair delivery');
    assert.equal(observed.init.headers['X-SecurePay-Conversation-Token'],'scoped-secret');
    assert.equal(observed.init.headers['Content-Type'],undefined);
    assert.equal(observed.init.body.get('file').type,'image/jpeg');
  }finally{globalThis.fetch=previous;}
});

test('photo UI only enables server upload with active conversation',()=>{
  const ui=source('src/features/living-workspace/UniversalSourceTray.tsx');
  const shell=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
  const relay=source('src/features/living-workspace/previewAgentGateway.ts');
  assert.match(ui,/gateway\.uploadSource\(conversationId,'PHOTO'/);
  assert.match(ui,/isDemo/);
  assert.match(ui,/not yet/);
  assert.match(shell,/conversationId=\{liveConversationId\}/);
  assert.match(relay,/dataBase64/);
});
