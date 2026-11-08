import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const shell=read('public/embed/shortstays-mini.html');
const sdk=read('public/embed/securepay-embed.js');
const agent=read('public/embed/securepay-guest-agent.js');
const vercel=JSON.parse(read('vercel.json'));
const inline=[...shell.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(m=>m[1]).filter(Boolean);

test('original SecurePay embed survives and new exact-parent frame JavaScript parses',()=>{
  assert.doesNotThrow(()=>new Function(sdk));
  assert.doesNotThrow(()=>new Function(agent));
  assert.equal(inline.length,1);
  assert.doesNotThrow(()=>new Function(inline[0]));
  assert.match(shell,/src="\/embed\/securepay-guest-agent\.js"/);
  assert.match(shell,/src="\/embed\/securepay-embed\.js"/);
  assert.match(shell,/var SITE_ID='shortstays-ke-preview'/);
});

test('guest credentials stay in the SecurePay-owned origin and ShortStays is an exact allowed frame ancestor',()=>{
  const policy=vercel.headers.find(x=>x.source==='/embed/shortstays-mini.html')
    ?.headers.find(x=>x.key==='Content-Security-Policy')?.value;
  assert.ok(policy);
  assert.match(policy,/frame-ancestors https:\/\/shortstays-ke-preview-james-8078\.vercel\.app/);
  assert.doesNotMatch(policy,/\*|shortstays\.ke(?!-preview)/);
  assert.match(shell,/APPROVED_PARENTS\.includes\(parentOrigin\)/);
  assert.match(shell,/window\.parent===window/);
  assert.match(shell,/document\.referrer/);
  assert.match(shell,/getReturnContext:function\(\)\{return \{purpose:'UNSPECIFIED'\};\}/);
  assert.match(agent,/sessionStorage/);
  assert.doesNotMatch(shell,/guestToken|accessSecret|Bearer |service_role/i);
});

test('only click-sent visible draft can enter the guest composer; never auto-send',()=>{
  assert.match(shell,/event\.source!==window\.parent\|\|event\.origin!==parentOrigin/);
  assert.match(shell,/data\.type!=='shortstays\.ks001\.prefill\.v1'/);
  assert.match(shell,/data\.product!==PROTOCOL\|\|data\.siteId!==SITE_ID/);
  assert.match(shell,/value\.length>1200/);
  assert.match(shell,/assistant\.prefill\(value\)/);
  assert.match(sdk,/prefill:function\(text\)/);
  assert.match(sdk,/chatDraft=text\.trim\(\);current='ask';render\(\);openPanel\(true\);return true/);
  assert.doesNotMatch(shell,/agent\.send|fetch\(\s*['"]\/api\/agent\/conversations/);
});

test('financial and consent authority is never conferred through iframe',()=>{
  assert.match(shell,/not a real AI connection/);
  assert.match(sdk,/No anonymous SecureLink creation/);
  assert.match(sdk,/not signed, sent or funded/);
  assert.match(shell,/tools:\['ask','contract','securelink'\]/);
  assert.doesNotMatch(shell,/\/api\/v1\/payments|\/api\/v1\/rails/);
});
