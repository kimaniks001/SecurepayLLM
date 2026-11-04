import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const file = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const experience = file('src/features/store/StoreExperience.tsx');
const setup = file('src/features/store/DigitalStoreSetup.tsx');
const runtime = file('src/RuntimeApp.tsx');
const route = file('src/features/store/route.ts');
const gateway = file('src/api/securepay/store/index.ts');
const dto = file('src/api/securepay/store/dto.ts');
const entry = file('src/features/experience/entryIntent.ts');
const agent = file('src/features/agent/AgentExperience.tsx');
const controller = file('src/features/store/controller.ts');
const manage = file('src/components/StoreManagementHome.tsx');
const routes = await import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(route, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText).toString('base64'));

test('Gate 1: direct merchant Store address resolves through public API without automatic signup', () => {
  assert.equal(routes.parseDigitalStoreAddressRoute('#/shop/trader-store'), 'trader-store');
  assert.equal(routes.parseLegacySharedShortLink('#/s/trader-store'), 'trader-store');
  assert.equal(routes.parseLegacySharedShortLink('#/shop/trader-store'), null);
  assert.match(runtime, /SharedShortLinkResolver/);
  assert.match(route, /parseDigitalStoreAddressRoute/);
  assert.match(experience, /gateway\.publicDigitalAddress\(addressSlug\)/);
  assert.match(experience, /controller\.openStore\(result\.canonicalKsNumber\)/);
  assert.match(gateway, /publicDigitalAddress:.*auth: 'none'/);
});

test('Gate 1: authoritative owner / Business address data with private coordinates', () => {
  for (const api of ['myDigitalAddress', 'saveMyDigitalAddress', 'businessDigitalAddress', 'saveBusinessDigitalAddress']) {
    assert.match(gateway, new RegExp(api));
  }
  assert.match(dto, /export interface DigitalStoreAddress/);
  assert.match(dto, /export interface PublicDigitalStoreAddress/);
  assert.match(setup, /publicPin: false/);
  assert.match(setup, /getCurrentPosition/);
  assert.match(setup, /accuracyMeters/);
  assert.match(setup, /locationProvenance: 'DEVICE'/);
  assert.match(setup, /A manual pin is not verified premises evidence/);
  assert.match(setup, /Capture or enter a pin before making it public/);
});

test('Gate 1: full Store workspace manages presentation and share only after publication', () => {
  assert.match(manage, /digitalStoreSetup/);
  assert.match(experience, /<DigitalStoreSetup/);
  assert.match(setup, /updateBusinessProfile/);
  assert.match(setup, /updateMyProfile/);
  assert.match(setup, /const shareReady = Boolean\(savedAddress && publishedCount > 0\)/);
  assert.match(setup, /#\/shop\//);
  assert.match(setup, /I.m here now/);
});

test('Gate 1: trader starts with offer before auth and explicitly submits after KS identity', () => {
  assert.match(experience, /if \(gate === 'create'\)/);
  assert.match(experience, /controller\.openBuilder\(null\)/);
  assert.match(experience, /setSignInGate\('create'\)/);
  assert.match(experience, /holdFirstStoreOffer\(state\.draft\)/);
  assert.match(entry, /let firstStoreOffer/);
  assert.match(entry, /published: false/);
  assert.match(controller, /restoreFirstOffer\(draft: OfferDraftFields\)/);
  assert.match(agent, /if \(hasFirstStoreOffer\(\)\) \{ navigateTo\('store'\); return; \}/);
  assert.match(experience, /onSubmit=\{\(\) => \{/);
  assert.doesNotMatch(setup, /preparePayment|paymentReady|releaseFunds/);
});
