import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {suggestedStoreSearchTerm} from '../src/features/living-workspace/suggestedStoreSearchTerm.mjs';
import {
  startCollectInterview, answerCollectInterview, collectionReview,
} from '../src/mini/miniCollectInterview.mjs';

const read=path=>readFileSync(fileURLToPath(new URL('../'+path,import.meta.url)),'utf8');
const fixture=JSON.parse(read('tests/fixtures/securepay-mini-preflight-20.json'));
const mini=read('src/mini/MiniExperience.tsx');
const buy=read('src/mini/MiniBuyStore.tsx');
const first=read('src/mini/MiniFirstPartyKs001.tsx');
const guest=read('public/embed/securepay-guest-agent.js');
const collection=read('src/mini/MiniCollectConversation.tsx');

test('all 20 original personas are stable, synthetic and never live-money identities',()=>{
  const expected=['Amina','Peter','Wanjiku','Kamau','Njeri','Brian','Mercy','Joseph','Lucy','David',
    'Grace','Hassan','Ruth','Samuel','Joan','Kevin','Esther','Daniel','Irene','George'];
  assert.deepEqual(fixture.people.map(p=>p.name),expected);
  assert.equal(new Set(fixture.people.map(p=>p.id)).size,20);
  assert.equal(new Set(fixture.people.map(p=>p.fixtureIdentity)).size,20);
  assert.equal(fixture.productionAccess,false);
  assert.equal(fixture.needsIsolatedBackend,true);
  for(const p of fixture.people){
    assert.equal(p.realMoneyPermitted,false,p.name);
    assert.ok(p.criticalGate.length>15,p.name);
    assert.match(p.fixtureIdentity,/^isolated-preflight-persona-\d{2}$/);
    assert.equal(p.testKshCurrency,true);
  }
});

for (const p of fixture.people) {
  test('Preflight '+p.id+' · '+p.name+' — '+p.kind+' source contract',()=>{
    // These tests execute existing Mini classifiers and UI/model contract guards.
    // They are NOT 20 actual backend impersonations: those need isolated
    // authenticated synthetic identities, API tests and explicit acceptance.
    assert.match(p.prompt,/\S/);
    switch(p.kind) {
      case 'STORE_SEARCH': {
        assert.equal(suggestedStoreSearchTerm(p.prompt),p.expectedSearchTerm);
        assert.match(buy,/createStoreGateway\(createHttpClient/);
        assert.match(buy,/stores\.offer\(line\.sellerKsNumber, line\.offerId\)/);
        assert.match(buy,/Nothing is ordered, agreed or reserved yet/);
        break;
      }
      case 'BENEFICIARY': {
        let state=startCollectInterview(p.prompt);
        assert.equal(state.stage,'purpose');
        state=answerCollectInterview(state,'medical');
        assert.equal(state.stage,'consent');
        // The person explicitly says permission is not obtained.
        state=answerCollectInterview(state,'pending');
        state=answerCollectInterview(state,'collector');
        assert.equal(state.stage,'recipientAuthority');
        state=answerCollectInterview(state,'pending');
        state=answerCollectInterview(state,'open');
        state=answerCollectInterview(state,'updates');
        state=answerCollectInterview(state,'purpose');
        assert.equal(state.stage,'review');
        const summary=collectionReview(state);
        assert.equal(summary.publishable,false);
        assert.equal(summary.paid,false);
        assert.equal(summary.agreementAccepted,false);
        assert.match(summary.checks.join(' '),/consent or independently verified lawful authority is still needed/i);
        assert.match(summary.checks.join(' '),/authority to receive or manage these funds is not established/i);
        assert.match(collection,/No public collection or payment/);
        break;
      }
      case 'ORDINARY_PAYMENT':
        assert.match(mini,/begin\('pay'\)/);
        assert.match(mini,/begin\('collect'\)/);
        break;
      case 'CONTINUITY':
        assert.match(guest,/status='continuity-unavailable'/);
        assert.match(first,/snapshot\.context\.status !== 'ready'/);
        assert.match(first,/Clear and start a new conversation/);
        break;
      case 'INVITATION_PENDING':
        assert.match(first,/No participant accepted, no SecureLink issued and no Money moved/);
        assert.match(first,/readAgreementFormation/);
        break;
      case 'PLUG_PERMISSION':
      case 'PLUG_DENY':
      case 'MASTER_REVIEW':
      case 'SKILLS':
      case 'POOLING':
      case 'STORE_SELLER':
      case 'SERVICE':
      case 'VETTED_SERVICE':
      case 'PRIVATE_DENY':
        // Current M1 UI is not role authority. The real backend must prove
        // the person's qualification/membership/consent before capability.
        // The source contract must not implement a role-switching shortcut.
        assert.match(first,/createAgentGateway\(createHttpClient/);
        assert.doesNotMatch(first,/setRole\(|mockRole\(|forceQualified\(|grantMembership\(/);
        assert.match(first,/No participant accepted, no SecureLink issued and no Money moved/);
        break;
      default:assert.fail('Unknown preflight route '+p.kind);
    }
  });
}

test('Preflight cannot be represented as actual end-to-end participant testing',()=>{
  assert.match(fixture.warning,/NOT AN ACTIVE SEEDED API ENVIRONMENT/);
  assert.match(fixture.warning,/NO REAL KSNumber/);
  assert.ok(fixture.people.some(p=>p.kind==='PRIVATE_DENY'));
  assert.ok(fixture.people.some(p=>p.kind==='PLUG_DENY'));
  assert.ok(fixture.people.some(p=>p.kind==='INVITATION_PENDING'));
  assert.ok(fixture.people.some(p=>p.kind==='CONTINUITY'));
});
