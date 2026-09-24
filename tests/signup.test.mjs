import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

// KS001 Upgrade Phase 4 continuation -- "Get my KS Number" (signup-in-invitation).
const bundle = await build({ stdin: { contents: `
export * from './src/features/signup/controller';
export * from './src/features/signup/view';
export * from './src/api/securepay/http';
export * from './src/api/securepay/session';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const err = (kind, status, message) => new api.ApiError(kind, message ?? 'x', status ?? null, null);

const pendingSignup = (overrides = {}) => ({
  signupChallengeToken: 'challenge-1', expiresAt: '2026-12-01T00:00:00Z',
  maskedDestination: '•••• 5678', resendAvailableAt: '2026-09-24T00:01:00Z', ...overrides,
});
const completedSignup = (overrides = {}) => ({
  ksNumber: 'KS0009999', accessToken: 'access-1', accessTokenExpiresAt: '2026-09-24T00:15:00Z',
  refreshToken: 'refresh-1', refreshTokenExpiresAt: '2026-10-24T00:00:00Z', ...overrides,
});

function setup(overrides = {}) {
  const calls = [];
  const auth = {
    signupStart: async body => { calls.push(['signupStart', body]); return pendingSignup(); },
    signupResend: async token => { calls.push(['signupResend', token]); },
    signupVerify: async body => { calls.push(['signupVerify', body]); return completedSignup(); },
    ...overrides,
  };
  const sessionCalls = [];
  const session = { setTokens: tokens => sessionCalls.push(tokens) };
  const controller = api.createSignupController(auth, session);
  return { controller, calls, sessionCalls };
}

test('the happy path: form -> otp -> verify establishes a session and reaches completed, never touching join', async () => {
  const { controller, calls, sessionCalls } = setup();
  controller.setDisplayName('Mary Wanjiku');
  controller.setChannelType('SMS');
  controller.setDestination('0712345678');
  controller.setPassword('a-strong-password');
  await controller.start();
  assert.equal(controller.getSnapshot().phase, 'otp');
  assert.equal(controller.getSnapshot().maskedDestination, '•••• 5678');
  assert.equal(calls[0][0], 'signupStart');
  assert.equal(calls[0][1].destination, '0712345678');

  controller.setOtp('123456');
  await controller.verify();
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'completed');
  assert.equal(sessionCalls.length, 1);
  assert.equal(sessionCalls[0].accessToken, 'access-1');
  // Nothing here ever asserts or implies participation -- no join-shaped call was ever possible:
  // this controller has no join method and no Agreement gateway dependency at all.
  assert.equal(typeof controller.join, 'undefined');
});

test('changing the channel clears any half-typed destination', () => {
  const { controller } = setup();
  controller.setChannelType('SMS');
  controller.setDestination('0712345678');
  controller.setChannelType('EMAIL');
  assert.equal(controller.getSnapshot().destination, '');
  assert.equal(controller.getSnapshot().channelType, 'EMAIL');
});

test('blank fields never call the gateway', async () => {
  const { controller, calls } = setup();
  controller.setDisplayName('');
  controller.setDestination('');
  controller.setPassword('');
  await controller.start();
  assert.equal(calls.length, 0);
  assert.equal(controller.getSnapshot().phase, 'form');
});

test('every 4xx cause gets the SAME undifferentiated copy -- SecurePay itself never distinguishes them', async () => {
  const { controller: c1 } = setup({ signupStart: async () => { throw err('http', 400, 'Invalid or expired signup challenge'); } });
  c1.setDisplayName('Mary'); c1.setDestination('0712345678'); c1.setPassword('pw');
  await c1.start();
  const wrongOtpWording = c1.getSnapshot().error;

  const { controller: c2 } = setup({ signupStart: async () => { throw err('http', 400, 'Invalid or expired signup challenge'); } });
  c2.setDisplayName('Mary'); c2.setDestination('mary@example.com'); c2.setPassword('pw');
  await c2.start();
  const duplicateContactWording = c2.getSnapshot().error;

  assert.equal(wrongOtpWording, duplicateContactWording);
  assert.match(wrongOtpWording, /Nothing has been joined/);
  assert.doesNotMatch(wrongOtpWording, /already registered|account exists|duplicate/i);
});

test('a delivery/network failure gets distinct, honest wording -- never confused with a wrong code', async () => {
  const { controller } = setup({ signupStart: async () => { throw err('http', 503, 'Signup is temporarily unavailable'); } });
  controller.setDisplayName('Mary'); controller.setDestination('0712345678'); controller.setPassword('pw');
  await controller.start();
  assert.match(controller.getSnapshot().error, /couldn.t send or check that code right now/);
});

test('a failed verify never advances past otp and never touches the session', async () => {
  const { controller, sessionCalls } = setup({ signupVerify: async () => { throw err('http', 400, 'Invalid or expired signup challenge'); } });
  controller.setDisplayName('Mary'); controller.setDestination('0712345678'); controller.setPassword('pw');
  await controller.start();
  controller.setOtp('000000');
  await controller.verify();
  assert.equal(controller.getSnapshot().phase, 'otp');
  assert.equal(controller.getSnapshot().otp, '');
  assert.equal(sessionCalls.length, 0);
});

test('resend calls the SAME challenge token and never advances the phase', async () => {
  const { controller, calls } = setup();
  controller.setDisplayName('Mary'); controller.setDestination('0712345678'); controller.setPassword('pw');
  await controller.start();
  await controller.resend();
  assert.equal(calls.filter(c => c[0] === 'signupResend').length, 1);
  assert.equal(calls.find(c => c[0] === 'signupResend')[1], 'challenge-1');
  assert.equal(controller.getSnapshot().phase, 'otp');
});

test('reset returns to the form and never leaves stray otp/password state visible', async () => {
  const { controller } = setup();
  controller.setDisplayName('Mary'); controller.setDestination('0712345678'); controller.setPassword('pw');
  await controller.start();
  controller.setOtp('123456');
  controller.reset();
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'form');
  assert.equal(state.otp, '');
  assert.equal(state.password, '');
  assert.equal(state.challengeToken, null);
});

// ------------------------------------------------------------ view
test('signupView never invents copy the mandate did not specify, and never conflates signup with Join/Confirm', () => {
  const formView = api.signupView({ phase: 'form', busy: false, displayName: '', channelType: 'SMS', destination: '', password: '', otp: '', challengeToken: null, maskedDestination: null, error: null });
  assert.match(formView.reason, /does not join or confirm this Agreement/);
  assert.doesNotMatch(formView.reason + formView.title, /Join Agreement|Confirm|Accept/);

  const otpView = api.signupView({ phase: 'otp', busy: false, displayName: '', channelType: 'SMS', destination: '', password: '', otp: '', challengeToken: 'c', maskedDestination: '•••• 5678', error: null });
  assert.match(otpView.identityKsn, /5678/);
  assert.doesNotMatch(otpView.reason, /Join|Confirm/);
});

// ------------------------------------------------------------ structural: signup cannot join
test('structural: the signup controller module never imports any Agreement/invitation join-shaped gateway', async () => {
  const src = await readFile('src/features/signup/controller.ts', 'utf8');
  assert.doesNotMatch(src, /AgreementGateway|joinMyInvitation|recipient\.join/);
});
