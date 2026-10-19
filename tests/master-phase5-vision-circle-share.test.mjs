import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['src/features/living-workspace/visionCircleShareAuthority.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
});
const { publishSelectedVisionNote } = await import('data:text/javascript;base64,' +
  Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const excerpt = Object.freeze({
  dreamId: 'private-dream-1', dreamTitle: 'Private project and location',
  boardRevision: 3, objectId: 'note-to-share', kind: 'note',
  text: 'We could compare three rainwater tanks.',
});
const saved = {
  v: 1, objects: [
    { id: 'note-to-share', kind: 'note', text: excerpt.text },
    { id: 'secret-note', kind: 'note', text: 'CONFIDENTIAL_PRIVATE_NOTE' },
    { id: 'secret-image', kind: 'image', assetId: 'PRIVATE_ASSET_BYTES' },
  ],
};
function harness({ revision = 3, member = 'ACTIVE', owner = false, kind = 'note',
                   chosenText = excerpt.text, circleStatus = 'ACTIVE',
                   responseCircleId = 'circle-one', dreamId = excerpt.dreamId } = {}) {
  const calls = [];
  const board = { ...saved, objects: [{ id: excerpt.objectId, kind, text: chosenText }, ...saved.objects.slice(1)] };
  const dreams = {
    get: async id => { calls.push(['dream-get', id]); return { dreamId }; },
    board: async id => { calls.push(['board-get', id]); return {
      schemaVersion: 1, revision, documentJson: JSON.stringify(board),
    }; },
  };
  const community = { circles: {
    get: async id => { calls.push(['circle-get', id]); return { id, status: circleStatus }; },
    membership: async id => { calls.push(['membership', id]); return { status: member, isOwner: owner }; },
    objects: { create: async (...args) => {
      calls.push(['post', ...args]);
      return { circleId: responseCircleId, objectType: 'DISCUSSION', id: 'post-1' };
    } },
  } };
  return { calls, input: { excerpt, circleId: 'circle-one', intent: 'idempotent-share-1', dreams, community } };
}

test('one selected saved Vision note becomes a Circle-only DISCUSSION with the same intent', async () => {
  const { input, calls } = harness();
  const result = await publishSelectedVisionNote(input);
  assert.equal(result.circleId, 'circle-one');
  assert.deepEqual(calls.map(c => c[0]), ['dream-get', 'board-get', 'circle-get', 'membership', 'post']);
  assert.deepEqual(calls.at(-1), [
    'post', 'circle-one', 'DISCUSSION', 'Shared Vision note', excerpt.text, null, 'idempotent-share-1',
  ]);
  assert.doesNotMatch(JSON.stringify(calls.at(-1)), /CONFIDENTIAL_PRIVATE_NOTE|PRIVATE_ASSET_BYTES|Private project and location|private-dream-1/);
});

test('unconfirmed or stale Dream revisions never publish anything to a Circle', async () => {
  for (const revision of [0, 2, 4]) {
    const { calls, input } = harness({ revision });
    await assert.rejects(publishSelectedVisionNote({ ...input,
      excerpt: { ...excerpt, boardRevision: revision === 0 ? 0 : excerpt.boardRevision } }));
    assert.equal(calls.some(c => c[0] === 'post'), false);
  }
});

test('changed text, omitted note, assets and source identity mismatch fail closed', async () => {
  for (const change of [
    { chosenText: 'Different content' },
    { kind: 'image' },
    { dreamId: 'another-private-dream' },
  ]) {
    const { calls, input } = harness(change);
    await assert.rejects(publishSelectedVisionNote(input));
    assert.equal(calls.some(c => c[0] === 'post'), false);
  }
});

test('an outsider, removed member or closed Circle cannot share a Vision excerpt', async () => {
  for (const opts of [{member:null}, {member:'REMOVED'}, {member:'INVITED'}, {circleStatus:'QUIET'}]) {
    const { calls, input } = harness(opts);
    await assert.rejects(publishSelectedVisionNote(input));
    assert.equal(calls.some(c => c[0] === 'post'), false);
  }
});

test('backend mismatch is never claimed a confirmed Circle share', async () => {
  const { calls, input } = harness({ responseCircleId:'a-different-circle' });
  await assert.rejects(publishSelectedVisionNote(input), /intended Circle post/);
  assert.equal(calls.at(-1)[6], 'idempotent-share-1');
});

test('explicitly chosen content must be bounded and never an arbitrary asset or drawing', async () => {
  for (const change of [
    { ...excerpt, kind:'image' },
    { ...excerpt, kind:'drawing' },
    { ...excerpt, text:'   ' },
    { ...excerpt, text:'a'.repeat(4001) },
  ]) {
    const { calls, input } = harness();
    await assert.rejects(publishSelectedVisionNote({ ...input, excerpt:change }));
    assert.equal(calls.length, 0);
  }
});
