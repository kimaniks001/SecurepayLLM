import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCertificationTarget } from './certification/staging-guard.mjs';

const base={
  siteOrigin:'https://staging.securepay.ke',
  apiOrigin:'https://staging-api.securepay.ke',
  confirmedTestOnly:'I_CONFIRM_TEST_ONLY',
  moneyMode:'NO_EXECUTION',
};

test('Phase 3 refuses actual SecurePay production backend or frontend even when operator authorises tests',()=>{
 for(const bad of [
   {...base,apiOrigin:'https://securepay.ke'},
   {...base,apiOrigin:'https://www.securepay.ke'},
   {...base,siteOrigin:'https://securepay.ke'},
   {...base,siteOrigin:'https://www.securepay.ke'},
 ]) assert.throws(()=>validateCertificationTarget(bad),/forbidden/);
});

test('Phase 3 refuses current Vercel previews because their relays point at production',()=>{
 for(const bad of [
  {...base,siteOrigin:'https://securepay-majy00p69-james-8078.vercel.app'},
  {...base,apiOrigin:'https://securepay-majy00p69-james-8078.vercel.app'}
 ]) assert.throws(()=>validateCertificationTarget(bad),/forbidden/);
});

test('Phase 3 refuses unsafe URLs, unlabelled environments and any financial execution mode',()=>{
 for(const bad of [
  {...base,apiOrigin:'https://api.example.com'},
  {...base,siteOrigin:'https://example.com'},
  {...base,siteOrigin:'http://staging.example.com'},
  {...base,apiOrigin:'https://staging.example.com/private'},
  {...base,apiOrigin:'https://user:pass@staging.example.com'},
  {...base,apiOrigin:'https://staging.example.com/?token=secret'},
  {...base,confirmedTestOnly:'yes'},
  {...base,moneyMode:'ALLOW_PAYMENTS'}
 ]) assert.throws(()=>validateCertificationTarget(bad));
});

test('Even explicitly authorised staging URL check never masquerades as verified routing or completed journeys',()=>{
 const result=validateCertificationTarget(base);
 assert.equal(result.phase,'CONFIGURATION_CHECK_ONLY');
 assert.equal(result.verifiedDeployedRouting,false);
 assert.equal(result.verifiedTestIdentities,false);
 assert.match(result.prohibitedActions,/payments/);
 assert.match(result.prohibitedActions,/real invitations/);
 assert.equal(result.apiOrigin,base.apiOrigin);
});

test('Isolated localhost test harness can be assessed but is not backend-certified',()=>{
 const r=validateCertificationTarget({...base,siteOrigin:'http://127.0.0.1:4173',apiOrigin:'http://localhost:8080'});
 assert.equal(r.verifiedDeployedRouting,false);
});
