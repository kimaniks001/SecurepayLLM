import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const mini=read('src/mini/MiniExperience.tsx');
const identity=read('src/mini/MiniExploreWithYourAi.tsx');
const css=read('src/mini/miniCompanionIdentity.css');
const bracelet=read('src/mini/MiniProudlyKeMark.tsx');

test('approved companion styling is scoped to the native Mini',()=>{
  assert.match(mini,/className=\{'spm-root spm-clean'/);
  assert.match(mini,/spm-companion/);
  assert.match(mini,/miniCompanionIdentity\.css/);
  assert.match(css,/\.spm-root\.spm-companion/);
});

test('native trading and human help entry points remain authoritative',()=>{
  for(const name of ['MiniBuyStore','MiniSellSomething','MiniPaySomeone','MiniCollectConversation','MiniHumanHelp']){
    assert.match(mini,new RegExp(name));
  }
  assert.match(mini,/MiniServerCheckout/);
  assert.match(mini,/MiniRealStoreOffer/);
  assert.match(mini,/onClick=\{openHumanHelp\}/);
});

test('SecurePay mark replaces generic KS001 sparkle on the home screen',()=>{
  assert.match(mini,/spm-ks001-mark/);
  assert.match(mini,/securepay-mark-green\.png/);
  assert.match(mini,/<span>KS001<\/span>/);
  assert.doesNotMatch(mini,/<div className="spm-persona"><Sparkles/);
});

test('personal AI invitation is compact, locally copyable and honest',()=>{
  assert.match(mini,/MiniExploreWithYourAi language=\{lang\}/);
  assert.match(identity,/Explore with your AI/);
  assert.match(identity,/navigator\.clipboard/);
  assert.match(identity,/Select all/);
  assert.match(identity,/Gundua na AI yako/);
  assert.match(identity,/not a salesperson/);
  assert.match(identity,/Do not assume live escrow/);
  assert.doesNotMatch(identity,/fetch\(|axios|localStorage|sessionStorage|window\.open/);
});

test('small Proudly.ke signature remains subordinate to existing footer',()=>{
  assert.match(bracelet,/data:image\/jpeg;base64,/);
  const at=mini.indexOf('className="spm-proudly-footer"');
  assert.ok(at>mini.indexOf('<footer className="spm-footer">'));
  assert.ok(at<mini.lastIndexOf('</footer>'));
  assert.match(css,/\.spm-footer \.spm-proudly-beads/);
  assert.match(css,/width:27px;height:9px/);
});
