import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const mini=read('src/mini/MiniExperience.tsx');
const firstParty=read('src/mini/MiniFirstPartyKs001.tsx');
const config=read('src/mini/miniFirstPartyConfig.ts');
const origin=read('src/mini/miniFirstPartyOrigin.mjs');
const guest=read('src/mini/MiniGuestChat.tsx');
const sdk=read('public/embed/securepay-guest-agent.js');
const slots=read('src/mini/MiniAgreementSlots.tsx');

test('the staging-only first-party route uses existing Agent and Agreement Gateway, never new authority',()=>{
  assert.match(firstParty,/createAgentGateway\(createHttpClient\(apiOrigin, \(\) => null\)\)/);
  assert.match(firstParty,/createAgentController\(gateway\)/);
  assert.match(firstParty,/gateway\.readAgreementFormation/);
  assert.match(firstParty,/gateway\.conversationHistory/);
  assert.match(firstParty,/gateway\.resumableConversationId/);
  assert.match(firstParty,/clientTurnId|same message|SAME clientTurnId/);
  assert.doesNotMatch(firstParty,/releaseFunds\(|createPaymentIntent\(|createAgreement\(|issueSecureLink\(/);
});

test('no anonymous staging Mini conversation is represented as a signed Agreement or paid',()=>{
  assert.match(firstParty,/Nothing has been accepted or sent/);
  assert.match(firstParty,/<MiniAgreementSlots formation=\{review\}/);
  assert.match(slots,/No invitations, payments or funds have moved/);
  assert.match(firstParty,/staging/);
  assert.match(firstParty,/continuity-unavailable/);
  assert.match(firstParty,/miniHistoryRestored\(history,\s*snapshot,\s*priorId\)/);
});

test('protected stage origin cannot be arbitrary or production, and no fallback leaks client secrets',()=>{
  assert.match(config,/VITE_MINI_FIRST_PARTY_API_ORIGIN/);
  assert.match(config,/VITE_SECUREPAY_API_BASE_URL/);
  assert.match(config,/miniFirstPartyOriginsAligned/);
  assert.match(origin,/https:/);
  assert.match(origin,/staging\|sandbox\|qa\|test/);
  assert.match(origin,/securepay/);
  assert.match(origin,/agent===shared/);
  assert.match(origin,/return null/);
  assert.doesNotMatch(config+origin,/localStorage|Bearer|fetch\(/);
});

test('the approved Mini selection and independent registered-guest fallback remain intact',()=>{
  assert.match(mini,/getMiniFirstPartyOrigin\(\)/);
  assert.match(mini,/<MiniFirstPartyKs001/);
  assert.match(mini,/<MiniGuestChat/);
  assert.match(guest,/getMiniPilotConfig/);
  assert.match(sdk,/securepay\.embed\.guest\.v3/);
  assert.match(mini,/Collecting for your mother or someone else/);
  assert.match(mini,/MiniBuyStore/);
});
