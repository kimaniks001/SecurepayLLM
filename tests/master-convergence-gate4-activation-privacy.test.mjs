import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const activation=source('src/features/activation/ActivationExperience.tsx');
const fundingAdapter=source('src/api/securepay/subscription/adapters.ts');
const gateway=source('src/api/securepay/subscription/index.ts');
const activeMoney=source('src/features/living-workspace/ActiveAgreementWorkspace.tsx');

const built=await build({stdin:{contents:
  "export { createSessionStore } from './src/api/securepay/session';\n"+
  "export { isCurrentActivationSession } from './src/features/activation/sessionBoundary';",
  resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {createSessionStore,isCurrentActivationSession}=await import(
 'data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const tokens=name=>({accessToken:'access-'+name,refreshToken:'refresh-'+name,
 accessTokenExpiresAt:'2090-01-01T00:00:00Z',refreshTokenExpiresAt:'2090-01-01T00:00:00Z'});

test('Gate 4: session guard refuses signed-out and a stale signed-in account',()=>{
 const s=createSessionStore();
 const signedOut=s.getSnapshot();
 assert.equal(isCurrentActivationSession(s,signedOut),false);
 s.setTokens(tokens('owner-one'));
 const ownerOne=s.getSnapshot();
 assert.equal(isCurrentActivationSession(s,ownerOne),true);
 s.setTokens(tokens('owner-two'));
 const ownerTwo=s.getSnapshot();
 assert.equal(isCurrentActivationSession(s,ownerOne),false);
 assert.equal(isCurrentActivationSession(s,ownerTwo),true);
 s.clear();
 assert.equal(isCurrentActivationSession(s,ownerTwo),false);
 s.setTokens(tokens('owner-one'));
 assert.equal(isCurrentActivationSession(s,ownerOne),false);
 assert.equal(isCurrentActivationSession(s,s.getSnapshot()),true);
});

test('Gate 4: refresh and replacement invalidate the prior async authority rather than retaining stale records',()=>{
 const s=createSessionStore();s.setTokens(tokens('owner-one'));
 const old=s.getSnapshot();
 const delayedReply=Promise.resolve({subscriptionId:'private-other-owner',financiallyEnabled:true});
 s.setTokens(tokens('owner-one-rotated'));
 return delayedReply.then(data=>{
  assert.equal(isCurrentActivationSession(s,old),false);
  assert.equal(data.financiallyEnabled,true);
  // A displayed value cannot be inferred from the received data alone.
 });
});

test('Gate 4: activation cleans all account-scoped UI state on EVERY session snapshot change',()=>{
 assert.match(activation,/useEffect\(\(\) => \{\s*\/\/ Identity may change signed-in/);
 for(const key of ['setSubscription(null)','setAgreement(null)','setBilling(null)',
  'setFunding(null)','setError(null)','setAuthorityReadFailed(false)']){
   assert.ok(activation.includes(key),key);
 }
 assert.match(activation,/\}, \[sessionState\]\);/);
 assert.doesNotMatch(activation,/\}, \[sessionState\.status\]\);/);
 assert.match(activation,/if \(!activeSession\(identity\)\) return;/);
 assert.match(activation,/if \(!stillCurrent\(\)\) return;/);
 assert.match(activation,/identity !== sessionState/);
});

test('Gate 4: funding mutation requires a fresh backend next-action and current identity',()=>{
 assert.match(activation,/const latest = await gateway\.activationFundingStatus\(\)/);
 assert.match(activation,/latest\.nextAction !== action \|\| latest\.financiallyEnabled/);
 assert.match(activation,/const stillCurrent = \(\) => activeSession\(identity\)/);
 assert.match(activation,/if \(stillCurrent\(\)\) setFunding\(next\)/);
 assert.match(activation,/if \(!stillCurrent\(\)\) return;\s*const status = await gateway\.activationFundingStatus\(\)/);
 assert.doesNotMatch(activation,/setFunding\(await gateway\.initiateVerificationTransfer\(/);
});

test('Gate 4: activation authority still fails closed on unknown server enums and unknown initial plan',()=>{
 assert.match(fundingAdapter,/assertKnownPlan/);
 assert.match(fundingAdapter,/ACTIVATION_FUNDING_NEXT_ACTIONS/);
 assert.match(fundingAdapter,/ACTIVATION_FUNDING_COMPONENT_STATES/);
 assert.match(fundingAdapter,/throw new ApiError\('invalid-response'/);
 assert.match(gateway,/auth: 'required'/);
});

test('Gate 4: activation never computes a fee, creates a fake transfer, or marks Agreement confirmation as funding',()=>{
 assert.match(activation,/The exact activation-funding total and its subscription, returned verification transfer/);
 assert.match(activation,/Only actual backend funding can complete activation/);
 assert.match(activation,/A confirmed Activation Agreement is not financial activation/);
 assert.doesNotMatch(activation,/const activationFee\s*=|\*\s*0\.01|payMoney\(|releaseAgreement\(/);
});

test('Gate 4: active Agreement Money remains read-only before the payer consent journey',()=>{
 assert.match(activeMoney,/gateways\.moneySnapshot\.read\(agreementId\)/);
 assert.match(activeMoney,/describeMoneyTruth\(moneySnapshot\)/);
 assert.match(activeMoney,/the existing authorised Money journey must obtain a current quote/);
 assert.match(activeMoney,/No money is moved here/);
 assert.doesNotMatch(activeMoney,/\bexecutePayment\(|\breleaseMoney\(/);
});
