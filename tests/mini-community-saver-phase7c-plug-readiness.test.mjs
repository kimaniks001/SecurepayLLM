import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('7C only recognized platforms have Plug activity-specific private checks',()=>{
  const gateway=read('src/api/securepay/community-saver-plug-readiness/index.ts');
  assert.ok(gateway.includes("'MY_RIDE_CARGO_COMPATIBILITY'"));
  assert.ok(gateway.includes("'SHORTSTAYS_BOOKING_FIT'"));
  assert.ok(gateway.includes("'STORAGE_SPACE_COMPATIBILITY'"));
  assert.equal(gateway.includes("'REAL_ESTATE'"),false);
  assert.ok(gateway.includes("auth:'required'"));
});
test('7C Plug can inspect own credentials, never search people or claim rewards',()=>{
  const gateway=read('src/api/securepay/community-saver-plug-readiness/index.ts');
  assert.ok(gateway.includes("'/api/v1/mini/me/community-saver/plug-readiness?activityCode='"));
  assert.equal(gateway.includes('plugIdentityId:'),false);
  assert.equal(gateway.includes('agreementId:'),false);
  assert.equal(gateway.includes("method:'POST'"),false);
  assert.equal(gateway.includes('acceptOpportunity'),false);
  assert.equal(gateway.includes('payPlug'),false);
  assert.ok(gateway.includes('canReceiveLiveAssignment:false'));
  assert.ok(gateway.includes('canSeeOtherTraders:false'));
  assert.ok(gateway.includes('moneyAuthorized:false'));
});
test('7C never exposes readiness on fictional demo or normal Mini by URL query',()=>{
  const shell=read('src/mini/MiniFirstPartyKs001.tsx');
  assert.ok(shell.includes("const liveCommunitySaverPlugReadiness=!demo &&"));
  assert.ok(shell.includes("import.meta.env.VITE_SECUREPAY_MINI_PHASE7_PLUG_READINESS==='enabled'"));
  assert.ok(shell.includes('signedIn && liveCommunitySaverPlugReadiness'));
  assert.ok(shell.includes('setSaverPlugOpen(false)'));
  assert.ok(shell.includes('My Community Saver skills'));
});
test('7C phone experience refuses any server claim of a live assignment',()=>{
  const ui=read('src/mini/MiniCommunitySaverPlugReadiness.tsx');
  assert.ok(ui.includes('current.canReceiveLiveAssignment!==false'));
  assert.ok(ui.includes('current.canSeeOtherTraders!==false'));
  assert.ok(ui.includes('current.moneyAuthorized!==false'));
  assert.ok(ui.includes('No work was accepted'));
  assert.ok(ui.includes('SPECIALISM_NOT_CURRENT'));
  assert.ok(ui.includes('A general property or trading qualification cannot substitute'));
});
test('7C existing 25% and Plug fee calculation is not overridden by readiness',()=>{
  const core=read('src/mini/communitySaverPreScreen.mjs');
  assert.ok(core.includes('minNetSavingPercent:25'));
  assert.ok(core.includes('plugPercentOfMinimumSaving:10'));
  const ui=read('src/mini/MiniCommunitySaverPlugReadiness.tsx');
  assert.equal(ui.includes('communitySaverPreScreen('),false);
  assert.equal(ui.includes('makeMoneyPayment('),false);
});
