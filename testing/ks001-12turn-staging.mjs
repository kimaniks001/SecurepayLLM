#!/usr/bin/env node
/**
 * KS001 API continuity certification candidate.
 *
 * REAL isolated staging only. This is deliberately NOT part of the ordinary
 * frontend tests, does not target production, and never performs Agreement,
 * identity, Store, payment, invitation or other consequential writes.
 *
 * Required environment:
 *   KS001_STAGING_ACK=YES
 *   KS001_STAGING_API_URL=https://staging.securepay.ke
 *
 * It writes exactly one disposable conversation and 12 user turns. A PASS
 * proves protocol/context continuity over 12 turns, not model answer quality,
 * seller verification, LLM provider identity, Money readiness or release.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const script = [
  'I need to buy chairs for a school event in Ruiru. Help me plan the trade.',
  'I need 40 chairs. I have not selected a seller.',
  'They should be stackable and in good condition.',
  'The chairs will be delivered to the school gate in Ruiru, Kenya.',
  'Please keep the requirement for 40 chairs. We have no price yet.',
  'I would like delivery on Saturday, but the exact time is not agreed.',
  'An online shop displays 15 chairs. That is not confirmed stock for my order.',
  'I still need 40 chairs in total, not 15. What should I check?',
  'Can someone help coordinate delivery if I find several sellers?',
  'I do not want to hire a Plug or Master automatically. Let me choose later.',
  'Can you prepare the information for my review? Nobody has accepted an Agreement.',
  'Summarise the 40-chair requirement, what remains unverified, and what I should do next.',
];

export function validatedStagingBase(raw) {
  let url;
  try { url = new URL(raw); } catch { throw Error('Explicit isolated staging URL required'); }
  const hostname = url.hostname.toLowerCase();
  const validHost = hostname === '127.0.0.1'
    || (hostname.endsWith('.securepay.ke') && /(?:^|[.-])(?:staging|sandbox|qa|test)(?:[.-]|$)/.test(hostname));
  if (!validHost || !['https:', 'http:'].includes(url.protocol)
      || (url.protocol === 'http:' && hostname !== '127.0.0.1')
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw Error('Only an explicit SecurePay staging or loopback base URL is permitted');
  return url.origin;
}

async function jsonRequest(base, method, path, secret, body, fetchImpl) {
  const response = await fetchImpl(base + path, {
    method,
    headers: {
      Accept: 'application/json',
      ...(secret ? { 'X-SecurePay-Conversation-Token': secret } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: 'error',
    signal: AbortSignal.timeout(55_000),
  });
  if (!response.ok) throw Error(method + ' ' + path.split('/').at(-1) + ': HTTP ' + response.status);
  return response.json();
}

export async function checkKs001TwelveTurns({ apiBaseUrl, fetchImpl = fetch } = {}) {
  const base = validatedStagingBase(apiBaseUrl);
  const created = await jsonRequest(base, 'POST', '/api/agent/conversations', null, null, fetchImpl);
  const conversationId = created.conversationId;
  const secret = created.conversationAccessSecret;
  assert.match(conversationId || '', /^[a-f0-9-]{36}$/i, 'No server conversation ID');
  assert.ok(typeof secret === 'string' && secret.length >= 40, 'No scoped conversation token');
  const path = '/api/agent/conversations/' + conversationId;
  const outcomes = [];
  let priorVersion = 0;
  for (const [index, message] of script.entries()) {
    const answer = await jsonRequest(base, 'POST', path + '/turns', secret, {
      message, clientTurnId: randomUUID(), clientTimeZone: 'Africa/Nairobi',
    }, fetchImpl);
    assert.ok(typeof answer.message === 'string' && answer.message.trim().length >= 12,
      'Empty or unhelpful API text at turn ' + (index + 1));
    assert.ok(!/your message is here, but i can't work on it|i couldn't work on it just now|still working on your message/i.test(answer.message),
      'Backend model fallback at turn ' + (index + 1));
    assert.ok(typeof answer.replyId === 'string' && answer.replyId.length,
      'Missing persisted reply ID at turn ' + (index + 1));
    const context = await jsonRequest(base, 'GET', path + '/context', secret, null, fetchImpl);
    assert.equal(context.conversationId, conversationId, 'Foreign context at turn ' + (index + 1));
    assert.ok(Number.isSafeInteger(context.version) && context.version >= priorVersion,
      'Context regressed at turn ' + (index + 1));
    const visibleFacts = JSON.stringify(context.entities ?? []).toLowerCase();
    if (index === 0 || index === 4 || index === 11) {
      assert.ok(visibleFacts.includes('chair'), '40-chair intention lost at turn ' + (index + 1));
    }
    priorVersion = context.version;
    outcomes.push({ turn: index + 1, hasReply: true, hasContext: true, contextVersion: priorVersion });
  }
  const history = await jsonRequest(base, 'GET', path + '/history?limit=50', secret, null, fetchImpl);
  assert.ok(Array.isArray(history.entries) && history.entries.filter(e => e.sender === 'HUMAN').length === 12,
    'Canonical history lost a human turn');
  return {
    status: 'API_12_TURN_PROTOCOL_PASS_MODEL_QUALITY_NOT_CERTIFIED',
    environment: 'ISOLATED_STAGING_ONLY',
    turnCount: outcomes.length,
    conversationStable: true,
    currentContextVersion: priorVersion,
    outcomes,
    // Never print conversation token, raw speech, or private fact contents.
    unverified: ['model identity', 'semantic quality', 'source/stock authority', 'Agreement acceptance', 'money'],
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  assert.equal(process.env.KS001_STAGING_ACK, 'YES',
    'Disposable staging must be explicitly acknowledged');
  console.log(JSON.stringify(await checkKs001TwelveTurns({
    apiBaseUrl: process.env.KS001_STAGING_API_URL,
  }), null, 2));
}
