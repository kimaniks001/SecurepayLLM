import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const experience=read('src/mini/MiniExperience.tsx');
const payment=read('src/mini/MiniPaySomeone.tsx');
const vite=read('vite.config.ts');
const entry=read('mini.html');
const vercel=read('vercel.json');
const audit=read('scripts/securepay-mini-release-audit.mjs');

test('default customer build cannot unlock synthetic merchants or payments from query parameters',()=>{
  assert.match(vite,/ownerFixtureBuild = !releaseBuild && process\.env\.SECUREPAY_MINI_OWNER_FIXTURES === '1'/);
  assert.match(vite,/__SECUREPAY_MINI_OWNER_FIXTURES__: JSON\.stringify\(ownerFixtureBuild\)/);
  assert.match(experience,/const playground = __SECUREPAY_MINI_OWNER_FIXTURES__/);
  assert.match(experience,/const businessDemo = playground \|\| \(__SECUREPAY_MINI_OWNER_FIXTURES__/);
  assert.match(experience,/isMiniExperiencePreviewHost\(window\.location\.hostname\)/);
  assert.match(experience,/__SECUREPAY_MINI_OWNER_FIXTURES__ \? copyDemo\(\) : EMPTY_DEMO_BUSINESS/);
  assert.match(experience,/offers:\[\],enquiries:\[\],agreements:\[\]/);
  assert.match(experience,/__SECUREPAY_MINI_OWNER_FIXTURES__ \? createMiniTradingSampleStore\(demoBusiness\) : undefined/);
  assert.match(payment,/const EXAMPLES:PaymentExample\[\]=__SECUREPAY_MINI_OWNER_FIXTURES__ \? \[/);
});

test('release entry is human-facing and retains no developer preview title',()=>{
  assert.match(entry,/<title>SecurePay Mini — Buy, Sell and Pay<\/title>/);
  assert.ok(!entry.includes('Sell Something & Agreement preview'));
  assert.match(experience,/screen==='pay-home' && <MiniPaySomeone/);
  assert.match(experience,/screen === 'home' && <section className="spm-entrance"/);
  assert.match(experience,/<MiniBuyStore/);
  assert.match(experience,/MiniFirstPartyKs001/);
});

test('build rejects demo artifacts and synthetic payment identity markers',()=>{
  assert.match(vercel,/npm run build:mini-release/);
  assert.match(audit,/DEMO-AGR-041/);
  assert.match(audit,/mini-demo-amina/);
  assert.match(audit,/mini-demo-njeri/);
  assert.match(audit,/mini-host-preview.html/);
  assert.match(audit,/SYNTHETIC DEMO ONLY/);
});

test('retain isolated repeatable test fixtures in source without creating real Money',()=>{
  assert.match(experience,/getMiniFirstPartyOrigin\(\)/);
  assert.match(payment,/preview&&/);
  assert.match(payment,/Nothing has been sent in this example/);
  assert.match(payment,/Recipient must accept/);
});
