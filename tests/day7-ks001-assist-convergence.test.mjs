import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAssistRequest, createAssistTurn, miniatureAnswer, assistCapabilityStatus, ASSIST_CONTRACT_VERSION } from '../src/features/ks001-assist/assistContract.mjs';

test('one contract supports distinct ShortStays, My Ride and physical Storage entrances', () => {
  assert.equal(ASSIST_CONTRACT_VERSION,'ks001-assist.v1');
  assert.equal(classifyAssistRequest('Need a cottage in Nyeri for two nights'), 'stays');
  assert.equal(classifyAssistRequest('I want an overnight guest room'), 'stays');
  assert.equal(classifyAssistRequest('Move my goods from Ruiru to Nakuru'), 'ride');
  assert.equal(classifyAssistRequest('I need to store my sofa for 14 days'), 'storage');
  assert.equal(classifyAssistRequest('Can I use a warehouse in Nairobi?'), 'storage');
  assert.equal(classifyAssistRequest('Find a Digital Store selling cement'), null);
  assert.equal(classifyAssistRequest('Make a receipt'), 'documents');
});

test('each request is opt-in, framed as a single canonical KS001 turn and never promises booking', () => {
  const raw = 'Sofa in Ruiru for 14 days; I may need pickup';
  const s = createAssistTurn({service:'storage',description:raw});
  assert.ok(s.includes(JSON.stringify(raw)));
  assert.match(s,/single most useful missing question/);
  assert.match(s,/informational estimate/);
  assert.match(s,/confirmed provider fare or availability/);
  assert.match(s,/Do not contact a provider/);
  assert.match(s,/no other source context is shared/);
  assert.match(createAssistTurn({service:'ride',journey:'goods',description:'3 cartons to Nyeri'}),/My Ride movement of goods/);
  assert.match(createAssistTurn({service:'stays',description:'Cabin in Nyeri'}),/ShortStays accommodation/);
  assert.throws(()=>createAssistTurn({service:'storage',description:''}));
  assert.throws(()=>createAssistTurn({service:'unknown',description:'hi'}));
});

test('mini inputs return the human-selected answer, not an invented action', () => {
  assert.equal(miniatureAnswer('place','Ruiru'),'The place is Ruiru.');
  assert.equal(miniatureAnswer('date','2026-11-14'),'The date is 2026-11-14.');
  assert.equal(miniatureAnswer('time','09:30'),'The local time is 09:30.');
  assert.equal(miniatureAnswer('money','KES 750.00'),'KES 750.00.');
  assert.equal(miniatureAnswer('person','Jane'),'The person is Jane.');
  assert.throws(()=>miniatureAnswer('money','KSh unspecified'));
  assert.throws(()=>miniatureAnswer('time','25:00'));
});

test('a visible tool grants no provider authority', () => {
  assert.equal(assistCapabilityStatus({implemented:false,backendAuthorised:true,providerEvidenceFresh:true}),'UNAVAILABLE');
  assert.equal(assistCapabilityStatus({implemented:true,backendAuthorised:false,providerEvidenceFresh:true}),'EXPLAIN_ONLY');
  assert.equal(assistCapabilityStatus({implemented:true,backendAuthorised:true,providerEvidenceFresh:false}),'NO_CURRENT_EVIDENCE');
  assert.equal(assistCapabilityStatus({implemented:true,backendAuthorised:true,providerEvidenceFresh:true}),'READ_VERIFIED_EVIDENCE');
});
