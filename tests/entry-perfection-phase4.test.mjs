import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Entry Perfection Phase 4 -- KS001 Character Certification (UI half). Every notice the person can see around KS001
// speaks calmly as SecurePay, says what is true and what to do next, and never uses internal words. Tested as
// principles (no jargon, no raw server text, message kept, safe retry), not comma-by-comma.
const bundle = await build({ stdin: { contents: `
export * from './src/features/sources/controller';
export { errorText, TURN_CHECKING_TEXT, TURN_STILL_WORKING_TEXT } from './src/features/agent/controller';
export { ApiError } from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;

const JARGON = /\b(step|candidate|reference|request|source or request|trade context|BUILD|error|exception|HTTP|409|500|null|undefined)\b/i;
const turnErrors = [
  new api.ApiError('network', 'fetch failed'),
  new api.ApiError('timeout', 'timeout'),
  new api.ApiError('http', 'java.lang.IllegalStateException: boom', 500, 'INTERNAL'),
  new api.ApiError('http', 'x', 404, 'NOT_FOUND'),
  new api.ApiError('http', 'x', 401, 'UNAUTHENTICATED'),
  new api.ApiError('http', 'x', 403, 'FORBIDDEN'),
  new api.ApiError('http', 'x', 409, 'AGENT_CONFLICT'),
  new api.ApiError('http', 'x', 409, 'AGENT_TURN_IN_PROGRESS'),
  new api.ApiError('http', 'x', 410, 'GONE'),
  new api.ApiError('http', 'x', 429, 'RATE_LIMIT_EXCEEDED'),
  new api.ApiError('http', 'java.lang.IllegalStateException: boom', 400, 'SOMETHING_NEW'),
];

test('every turn notice is jargon-free, never shows server text, and keeps the message where it matters', () => {
  for (const error of turnErrors) {
    const out = api.errorText(error);
    assert.doesNotMatch(out, JARGON, `${error.status} ${error.code}: ${out}`);
    assert.doesNotMatch(out, /java|boom|fetch failed/i);
    assert.ok(out.length <= 160, `short: ${out}`);
  }
  for (const status of [401, 403, 404]) {
    assert.match(api.errorText(new api.ApiError('http', 'x', status, 'X')), /Your message is still here/);
  }
});

test('authority and sign-in notices are honest about what is needed', () => {
  assert.equal(api.errorText(new api.ApiError('http', 'x', 401, 'X')), 'Sign in to continue. Your message is still here.');
  assert.match(api.errorText(new api.ApiError('http', 'x', 403, 'X')), /needs someone with the right permission/);
});

test('an unknown outcome is never presented as a failure and promises no duplicate', () => {
  for (const out of [api.TURN_CHECKING_TEXT, api.TURN_STILL_WORKING_TEXT, api.errorText(new api.ApiError('network', 'x'))]) {
    assert.doesNotMatch(out, /failed|error/i);
    assert.match(out, /won’t be sent twice|nothing is ever done twice/);
  }
});

test('every source notice is jargon-free and gives a next action', () => {
  const codes = ['AGENT_SOURCE_UNSUPPORTED_MEDIA_TYPE', 'AGENT_SOURCE_CONTENT_MISMATCH', 'AGENT_SOURCE_TOO_LARGE', 'AGENT_SOURCE_IMAGE_TOO_LARGE',
    'AGENT_SOURCE_NOT_FOUND', 'AGENT_CONVERSATION_NOT_FOUND', 'AGENT_CONFLICT', 'AGENT_INVALID_INPUT'];
  for (const code of codes) {
    const out = api.sourceIngestionErrorText(new api.ApiError('http', 'uploaded content does not match its declared type (application/pdf)', 400, code));
    assert.doesNotMatch(out, /application\/pdf|declared type|MIME/i, code);
    assert.doesNotMatch(out, /\b(candidate|trade context|BUILD|exception)\b/i, code);
    assert.match(out, /Try|try|add it again|Start a new one|safe/, `${code} gives a next action: ${out}`);
  }
  assert.match(api.sourceIngestionErrorText(new api.ApiError('http', 'x', 400, 'AGENT_SOURCE_CONTENT_MISMATCH')), /Try the original file, or paste the text here\./);
});
