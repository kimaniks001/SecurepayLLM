import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const receiver=read('src/features/embed/EmbedTransferReceiveExperience.tsx');
const sdk=read('public/embed/securepay-embed.js');
const guest=read('public/embed/securepay-guest-agent.js');
const claim=read('src/api/securepay/embed/transfer.ts');
const signup=read('src/features/join/JoinExperience.tsx');
const workspace=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');

test('new and returning people get two plain choices at the same SecurePay-origin receiver',()=>{
 assert.match(receiver,/Do you already have a KS Number/);
 assert.match(receiver,/Yes, I have one/);
 assert.match(receiver,/No, get my KS Number/);
 assert.match(receiver,/data-ks001-one-identity-entry/);
 assert.match(receiver,/identityChoice==='signup'/);
 assert.match(receiver,/identityChoice==='signin'/);
 assert.match(receiver,/SignInExperience auth=\{auth\} session=\{session\}/);
 assert.match(receiver,/SignupForm auth=\{auth\} session=\{session\} context="GENERIC"/);
 assert.match(signup,/createSignupController\(auth, session, context, onIssued\)/);
});

test('signup and login do not themselves claim or pay: explicit user click is mandatory',()=>{
 assert.match(receiver,/sessionState.status==='signed-in'/);
 assert.match(receiver,/onIssued=\{ksNumber=>setIssuedKsNumber\(ksNumber\)\}/);
 assert.match(receiver,/onClick=\{\(\)=>void claim\(\)\}/);
 assert.match(receiver,/Yes, continue in My Work/);
 assert.match(receiver,/if\(!incoming\|\|busy\|\|consumed.current\|\|session.getSnapshot\(\).status!=='signed-in'/);
 assert.equal((receiver.match(/gateway\.claim\(/g)||[]).length,1);
 assert.doesNotMatch(receiver,/useEffect\([\s\S]{0,240}gateway\.claim\(/);
});

test('the original host stays open and handoff status never leaks a guest proof to the opener',()=>{
 assert.match(receiver,/e.source!==opener/);
 assert.match(receiver,/e.data.nonce!==nonce/);
 assert.match(receiver,/e.data.receiverOrigin!==window.location.origin/);
 assert.match(receiver,/result.returnOrigin!==incoming.sourceOrigin/);
 assert.match(receiver,/sourceWindow.current\?\.postMessage/);
 const acknowledgement=receiver.slice(receiver.indexOf("type:'securepay.embed.transfer.claimed'"),receiver.indexOf("},incoming.sourceOrigin"));
 assert.doesNotMatch(acknowledgement,/guestToken|ticket|authorization|accessToken|refreshToken/);
 assert.match(sdk,/event.source!==popup\|\|event.origin!==matchedOrigin/);
 assert.match(sdk,/event.data.siteId===transfer.siteId/);
 assert.match(sdk,/agent.reset\(\)/);
 assert.match(sdk,/original page remains open/);
});

test('an expired transfer never falls through to a new identity-free claim',()=>{
 assert.match(receiver,/const expired=!!incoming/);
 assert.match(receiver,/!\s*expired && sessionState.status==='signed-in'/);
 assert.match(receiver,/!\s*expired && sessionState.status!=='signed-in'/);
 assert.match(receiver,/Date.parse\(incoming.expiresAt\)<=Date.now\(\)/);
 assert.match(receiver,/Return there and choose Continue in SecurePay again/);
});

test('claim uses first-party authentication and guest proof, never query-string transport',()=>{
 assert.match(claim,/auth:'required'/);
 assert.match(claim,/'X-SecurePay-Conversation-Token':guestToken/);
 assert.match(claim,/ticket: string/);
 assert.match(sdk,/popup\.location\.replace\(matchedOrigin\+'\/#\/embed\/continue'\)/);
 assert.doesNotMatch(claim,/location\.href|window\.open/);
});

test('website-specific verification and identity are NOT replaced by a cross-site signup',()=>{
 assert.match(receiver,/Your original conversation has not been transferred yet/);
 assert.match(receiver,/does not book, join or pay for anything/);
 assert.match(receiver,/one-identity-entry/);
 assert.doesNotMatch(receiver,/new SessionStore|createSignupController\(|signUpNewIdentity/);
 assert.match(guest,/siteId/);
});

test('post-claim workspace tells people to use the still-open source tab, never fabricates a deep-link',()=>{
 assert.match(workspace,/original task should still be open in the other browser tab/);
 assert.match(workspace,/Open \{new URL\(embedOriginHint.returnOrigin\).hostname\} home/);
 assert.doesNotMatch(workspace,/Return to Estate.ke/);
});
