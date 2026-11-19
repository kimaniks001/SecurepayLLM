import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const output = await build({
  entryPoints: ['src/features/human-layer/humanLayerEntry.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node'
});
const mod = await import('data:text/javascript;base64,' +
  Buffer.from(output.outputFiles[0].text).toString('base64'));

test('Buy, Sell, Pay and Collect share a private, local-only help entry', () => {
  for (const journey of ['buy', 'sell', 'pay', 'collect']) {
    const launch = mod.prepareHumanHelpLaunch({ journey, intent: 'talk-to-someone' });
    assert.equal(launch.sourceProduct, 'MINI');
    assert.equal(launch.sourceJourney, journey);
    assert.equal(launch.agreementRef, null);
    assert.equal(launch.state, 'LOCAL_INTENT_ONLY');
    assert.equal(launch.access, 'NONE_UNTIL_SERVER_REAUTHORISES');
  }
});

test('Agreement references require the exact accepted version, not private data', () => {
  const launch = mod.prepareHumanHelpLaunch({
    journey: 'living-agreement', intent: 'field-fact-check',
    agreementId: 'agreement-7', acceptedVersionId: 'version-3',
    address: 'PRIVATE', messages: ['PRIVATE'], bankAccount: 'PRIVATE'
  });
  assert.deepEqual(launch.agreementRef,
    { agreementId: 'agreement-7', acceptedVersionId: 'version-3' });
  assert.equal(JSON.stringify(launch).includes('PRIVATE'), false);
  assert.throws(() => mod.prepareHumanHelpLaunch({
    journey: 'living-agreement', intent: 'review-agreement'
  }));
  assert.throws(() => mod.prepareHumanHelpLaunch({
    journey: 'buy', intent: 'field-fact-check', agreementId: 'agreement-7'
  }));
});

test('unknown journey, intent and automatic worker hire are rejected', () => {
  assert.throws(() => mod.prepareHumanHelpLaunch({
    journey: 'unknown', intent: 'talk-to-someone'
  }));
  assert.throws(() => mod.prepareHumanHelpLaunch({
    journey: 'buy', intent: 'automatically-hire-plug'
  }));
});
