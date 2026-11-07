import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const publicSignup = read('src/features/join/SignUpExperience.tsx');
const form = read('src/features/join/JoinExperience.tsx');
const people = read('src/features/living-workspace/PeopleInvitationsTool.tsx');
const workspace = read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const identity = read('src/api/securepay/agent/index.ts');

test('public signup is one compact humane entry using existing backend signup controller', () => {
  assert.match(publicSignup, /max-w-lg/);
  assert.match(publicSignup, /1 · Your details/);
  assert.match(publicSignup, /2 · Verify your contact/);
  assert.match(publicSignup, /3 · Your KS Number/);
  assert.match(publicSignup, /<SignupForm auth=\{auth\} session=\{session\} context="GENERIC"/);
  assert.match(form, /createSignupController\(auth, session, context, onIssued\)/);
  assert.doesNotMatch(publicSignup, /signupStart\s*\(|signupVerify\s*\(|session\.setTokens\s*\(/);
  assert.match(publicSignup, /does not join The Trust Project/);
});

test('checking a KS Number stays exact, opt-in and lookup-only, without adding a participant', () => {
  assert.match(people, /Already has a KS Number\?/);
  assert.match(people, /Check KS Number/);
  assert.match(people, /does not prove who is holding the phone/);
  assert.match(people, /ksLookupSequence\.current\+\+/);
  assert.match(people, /sequence===ksLookupSequence\.current/);
  assert.match(people, /identity\.canonicalKsNumber\|\|ks/);
  assert.match(workspace, /gateway\.selectKsIdentity\(id,\{ksNumber\}\)/);
  assert.match(identity, /Omitting[\s\S]{0,150}expectedTradeContextVersion performs a PURE lookup/);
  assert.doesNotMatch(people, /membership\.join\(|agreement\.accept\(|session\.setTokens\(/);
});

test('an invite to a person without a KS Number uses existing signup, not automatic recruitment', () => {
  assert.match(people, /No KS Number yet\? Invite them/);
  assert.match(people, /normal signup/);
  assert.match(people, /only opens a personal WhatsApp draft/);
  assert.match(people, /const canShare=!!inviteName\.trim\(\)/);
  assert.doesNotMatch(people, /createSignupController|signupStart\s*\(|signupVerify\s*\(/);
});
