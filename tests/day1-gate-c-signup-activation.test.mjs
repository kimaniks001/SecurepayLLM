import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import ts from 'typescript';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const controllerSrc=read('src/features/signup/controller.ts');
const signup=read('src/features/join/JoinExperience.tsx');
const generic=read('src/features/join/SignUpExperience.tsx');
const welcome=read('src/features/join/SignupIssuedWelcome.tsx');
const agent=read('src/features/agent/AgentExperience.tsx');
const activation=read('src/features/activation/ActivationExperience.tsx');
const business=read('src/features/business/BusinessExperience.tsx');
const principles=read('src/features/join/controller.ts');
const session=read('src/api/securepay/session.ts');

const bundle=await build({stdin:{contents:`
export { createSignupController } from './src/features/signup/controller';
`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {createSignupController}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

function harness(fail=false){
 const calls=[], events=[];
 const auth={
  signupStart:async body=>{calls.push(['start',body.channelType]);return {signupChallengeToken:'challenge',maskedDestination:'•••• 1234',expiresAt:'later',resendAvailableAt:'later'};},
  signupResend:async()=>{calls.push(['resend']);},
  signupVerify:async body=>{calls.push(['verify',body.signupChallengeToken]);if(fail)throw Error('failed');
    return {ksNumber:'KS00004321',accessToken:'a',accessTokenExpiresAt:'later',refreshToken:'r',refreshTokenExpiresAt:'later'};},
 };
 const session={setTokens:t=>{calls.push(['session',t.accessToken]);events.push('session');}};
 const controller=createSignupController(auth,session,'GENERIC',ks=>{events.push('issued:'+ks);});
 return {controller,calls,events};
}
async function begin(controller){
 controller.setDisplayName('Example person');controller.setDestination('0712345678');controller.setPassword('sample-password');
 await controller.start();controller.setOtp('123456');await controller.verify();
}

test('Gate C confirms a server-issued KS exactly once after OTP and authenticates in one session',async()=>{
 const {controller,calls,events}=harness();await begin(controller);
 assert.equal(controller.getSnapshot().phase,'completed');
 assert.equal(controller.getSnapshot().issuedKsNumber,'KS00004321');
 assert.deepEqual(events,['session','issued:KS00004321']);
 assert.equal(calls.filter(x=>x[0]==='verify').length,1);
 assert.equal(calls.filter(x=>x[0]==='session').length,1);
 await controller.verify();
 assert.equal(calls.filter(x=>x[0]==='verify').length,1);
 controller.reset();
 assert.equal(controller.getSnapshot().issuedKsNumber,null);
});

test('Gate C verify failure has no KS Number, callback, session or membership side effect',async()=>{
 const {controller,calls,events}=harness(true);await begin(controller);
 assert.equal(controller.getSnapshot().phase,'otp');
 assert.equal(controller.getSnapshot().issuedKsNumber,null);
 assert.deepEqual(events,[]);
 assert.equal(calls.filter(x=>x[0]==='session').length,0);
});

test('Gate C uses exactly one existing signup API controller for generic and Trust entry',()=>{
 assert.match(generic,/SignupForm auth=\{auth\} session=\{session\}/);
 assert.match(generic,/onIssued=\{onIssued\}/);
 assert.match(generic,/data-gate-c-three-column-onboarding/);
 assert.match(generic,/Your SecurePay Check/);
 assert.match(signup,/createSignupController\(auth, session, context, onIssued\)/);
 assert.match(signup,/data-gate-c-signup-progress/);
 assert.match(signup,/context="TRUST_PROJECT_JOIN"/);
 assert.doesNotMatch(controllerSrc,/membership\.join|joinMyInvitation|confirmActivationAgreement/);
});

test('Gate C one-time welcome cannot issue credentials, join, apply or fund',()=>{
 assert.match(welcome,/data-gate-c-issued-number/);
 assert.match(welcome,/ksNumber/);
 assert.match(welcome,/Continue where I left off/);
 assert.match(welcome,/Explore The Trust Project/);
 assert.match(welcome,/Explore financial activation/);
 assert.doesNotMatch(welcome,/fetch\(|localStorage|sessionStorage|signupVerify\s*\(|session\.setTokens|payNow|activateFinancially/);
 assert.match(agent,/if \(issuedKsNumber\) return;/);
 assert.match(agent,/if \(!signedIn \|\| !\(signInRoute\.active \|\| signInRoute\.signingUp\)\) return;/);
 assert.match(agent,/signInRoute\.signingUp && signedIn && issuedKsNumber/);
 assert.match(agent,/onIssued=\{setIssuedKsNumber\}/);
 assert.match(agent,/signInRoute\.close\(\)/);
 assert.match(agent,/data-gate-c-trust-issued-welcome/);
 assert.match(agent,/continueLabel="Continue to The Trust Project"/);
 assert.match(signup,/context="TRUST_PROJECT_JOIN" onUseExisting=\{onUseExisting\} onBack=\{onBack\} onIssued=\{onIssued\}/);
});

test('Gate C reuses backend Truth for Trust, Business and Activation—not enrollment from signup',()=>{
 assert.match(principles,/currentPrinciples|loadPrinciples/);
 assert.match(principles,/membership|join/);
 assert.match(business,/Business/);
 assert.match(activation,/data-gate-c-activation-progress/);
 assert.match(activation,/funding\?\.financiallyEnabled/);
 assert.match(activation,/agreement\?\.confirmed/);
 assert.match(activation,/authorityReadFailed/);
 assert.match(session,/Tokens live only in memory/);
 assert.doesNotMatch(welcome,/KS\d{7,}/); // no hardcoded issued identifier
});

test('Gate C modified onboarding and activation components transpile syntactically',()=>{
 for(const [file,src] of [['controller.ts',controllerSrc],['signup.tsx',signup],['generic.tsx',generic],['welcome.tsx',welcome],['agent.tsx',agent],['activation.tsx',activation]]){
  const jsx=file.endsWith('.tsx');
  const out=ts.transpileModule(src,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,...(jsx?{jsx:ts.JsxEmit.ReactJSX}:{})}});
  const errors=(out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,file+': '+errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join('; '));
 }
});
