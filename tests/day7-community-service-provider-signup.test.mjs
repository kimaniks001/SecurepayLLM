import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const component=read('src/features/store/CommunityProviderInterestStep.tsx');
const setup=read('src/features/store/DigitalStoreSetup.tsx');
const app=read('src/features/store/StoreExperience.tsx');
const gateway=read('src/api/securepay/store/index.ts');
const dto=read('src/api/securepay/store/dto.ts');

test('Digital Store is the opt-in recruitment entrance for exactly 3 independent service products',()=>{
 for(const value of ['SHORTSTAYS','MY_RIDE','STORAGE']) {
   assert.match(component,new RegExp("'"+value+"'"));
   assert.match(dto,new RegExp("'"+value+"'"));
 }
 assert.match(setup,/CommunityProviderInterestStep/);
 assert.match(setup,/storeAddressReady=\{Boolean\(savedAddress\)\}/);
 assert.match(component,/Not now/);
 assert.match(component,/Your Digital Store and KS Number stay the same/);
});

test('specialist agreement is explicitly given, never prechecked, and required before submit',()=>{
 assert.match(component,/const \[agreed,setAgreed\]=useState\(false\)/);
 assert.match(component,/Please read and agree to the community provider commitments first/);
 assert.match(component,/!agreed/);
 assert.match(component,/I agree to apply as a special community provider/);
 assert.match(component,/policyVersion = 'community-special-provider-v1'/);
 assert.match(component,/\{services:withdraw\?\[\]:selected,agree:!withdraw,policyVersion:withdraw\?null:policyVersion\}/);
 assert.doesNotMatch(component,/setVerifiedProvider|status:\\s*'VERIFIED'|createProviderApproval/i);
});

test('only authenticated Store or represented Business endpoints record a consent, not public browsing',()=>{
 assert.match(gateway,/myCommunityProviderInterest: \(\) => http.request/);
 assert.match(gateway,/businessCommunityProviderInterest: \(ks: string\) =>/);
 assert.match(gateway,/saveBusinessCommunityProviderInterest:/);
 assert.match(gateway,/community-service-provider/);
 assert.match(gateway,/auth: 'required'/);
 assert.doesNotMatch(gateway,/community-service-provider[^\n]*auth: 'none'/);
});

test('consent failure and withdrawal fail closed and do not change identity, Money or booking',()=>{
 assert.match(component,/SecurePay did not confirm this choice/);
 assert.match(component,/Withdraw my interest/);
 assert.match(component,/services:withdraw\?\[\]:selected/);
 assert.match(component,/This invitation is optional/);
 assert.match(component,/does not change your subscription/);
 assert.match(component,/not yet verified/i);
 assert.doesNotMatch(component,/session\.setTokens|gateway\.createAgreement|gateway\.book\(|gateway\.fund\(/);
});

test('KS001 is a guided next step only after backend confirmed interest',()=>{
 assert.match(app,/onCommunityProviderContinue=\{onAskKs001/);
 assert.match(app,/I have explicitly registered my interest/);
 assert.match(app,/do not claim I am verified/);
 assert.match(component,/active.length>0 && onContinueWithKs001/);
 assert.doesNotMatch(component,/window\.location\.assign|location\.href|autoRedirect/);
});
