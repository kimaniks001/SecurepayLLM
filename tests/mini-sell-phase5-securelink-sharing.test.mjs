import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const actions=fs.readFileSync(new URL('../src/mini/MiniSellerShareOptions.tsx',import.meta.url),'utf8');
const seller=fs.readFileSync(new URL('../src/mini/MiniSellSomething.tsx',import.meta.url),'utf8');
const demo=fs.readFileSync(new URL('../src/mini/MiniSellSecureLinkWalkthrough.tsx',import.meta.url),'utf8');
const qr=fs.readFileSync(new URL('../src/features/securelink/QrCode.tsx',import.meta.url),'utf8');

test('copy, native share, WhatsApp and QR reuse the exact server-issued URL',()=>{
  assert.ok(actions.includes('navigator.clipboard.writeText(publicUrl)'));
  assert.ok(actions.includes('url:publicUrl'));
  assert.ok(actions.includes("encodeURIComponent(message)"));
  assert.ok(actions.includes("const message=text+'\\n'+publicUrl"));
  assert.ok(actions.includes('<SecureLinkQrCode publicUrl={publicUrl}'));
  assert.ok(qr.includes('value={publicUrl}'));
  assert.equal(actions.includes('generatePublicUrl'),false);
  assert.equal(actions.includes('createAgreement('),false);
});
test('the seller controls when and how a link is shared',()=>{
  for(const s of ['Copy link','Share link','WhatsApp','Show QR','Hide QR'])
    assert.ok(actions.includes(s),s);
  assert.ok(actions.includes('onClick={whatsapp}'));
  assert.ok(actions.includes('onClick={()=>void copy()}'));
  assert.ok(actions.includes('onClick={()=>void share()}'));
  assert.ok(actions.includes('onClick={()=>setShowQr(v=>!v)}'));
  assert.ok(actions.includes("noopener,noreferrer"));
});
test('invalid link cannot render a scannable code or sharing controls',()=>{
  assert.ok(actions.includes('if(!urlValid){'));
  assert.ok(actions.includes("u.protocol==='https:'"));
  assert.ok(actions.includes('!u.username && !u.password'));
  assert.ok(actions.indexOf('if(!urlValid){')<actions.indexOf('return <section className="spm-sell-link-actions"'));
});
test('Mini link options exist only after real backend issuance',()=>{
  assert.ok(seller.includes('{shareUrl&&<MiniSellerShareOptions publicUrl={shareUrl} title={title}/> }'));
  assert.ok(seller.includes('setShareUrl(issued.publicUrl)'));
  assert.ok(seller.includes('miniSellerIssueAgreementDoorway'));
  assert.equal(seller.includes('Connect to Money'),false);
});
test('opening or scanning cannot be confused with acceptance or Money',()=>{
  assert.ok(actions.includes('not acceptance or payment'));
  assert.ok(actions.includes('no second Agreement is created'));
  assert.ok(actions.includes('SecurePay has not sent it automatically'));
});
test('isolated owner walkthrough previews channel choice without creating a fake link or QR',()=>{
  assert.ok(demo.includes('Show QR example'));
  assert.ok(demo.includes('data-mini-nonscannable-qr-example'));
  assert.ok(demo.includes('NOT a scannable QR code'));
  assert.equal(demo.includes('SecureLinkQrCode'),false);
  assert.equal(demo.includes('navigator.clipboard.writeText'),false);
});
