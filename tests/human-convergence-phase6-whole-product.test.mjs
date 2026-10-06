import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const nav = await readFile('src/components/NavBar.tsx', 'utf8');
const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
const store = await readFile('src/features/store/StoreExperience.tsx', 'utf8');
const preview = await readFile('src/components/OfferQuickPreview.tsx', 'utf8');
const moneyHandoff = await readFile('src/features/money/handoff.ts', 'utf8');
const community = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
const vision = await readFile('src/features/visionboard/VisionBoardExperience.tsx', 'utf8');
const notifications = await readFile('src/features/notifications/NotificationsExperience.tsx', 'utf8');
const notificationApi = await readFile('src/api/securepay/notifications/index.ts', 'utf8');
const runtime = await readFile('src/RuntimeApp.tsx', 'utf8');

test('assembled product contains all five prior Human Convergence contracts', async () => {
  for (const path of [
    'tests/human-convergence-phase1-agreements.test.mjs',
    'tests/human-convergence-phase2-money.test.mjs',
    'tests/human-convergence-phase3-vision.test.mjs',
    'tests/human-convergence-phase4-store.test.mjs',
    'tests/human-convergence-phase5-community.test.mjs',
  ]) {
    const source = await readFile(path, 'utf8');
    assert.ok(source.length > 100, `${path} must be present on the Phase 6 integration branch`);
  }
});

test('signed-in navigation exposes one consistent core destination vocabulary', () => {
  for (const label of ['Home', 'Agreements', 'Money', 'Store', 'Community', 'Account']) {
    assert.match(nav, new RegExp(`label: '${label}'`));
  }
  assert.match(nav, /mobileNavItems[\s\S]*label: 'Vision', view: 'vision-board'/);
  assert.match(nav, /view: 'agreements'/);
  assert.match(nav, /view: 'money'/);
  assert.doesNotMatch(nav, /label: 'Agreement Hub'|label: 'Marketplace'|label: 'Social'/);
});

test('Agreement to Money remains in-memory, identifier-free in the URL and returnable', () => {
  assert.match(moneyHandoff, /in-memory only/i);
  assert.match(moneyHandoff, /window\.location\.hash = '#\/money'/);
  assert.doesNotMatch(moneyHandoff, /agreementId.*URLSearchParams|agreementId.*location\.hash/);
  assert.match(runtime, /onOpenAgreement=\{agreementId =>/);
  assert.match(runtime, /storeAgreementEntry\(agreementId\)/);
});

test('Vision and Community Store handoffs preserve only source/return context in memory', () => {
  assert.match(agent, /storeReturnContext/);
  assert.match(agent, /kind: 'vision'/);
  assert.match(agent, /kind: 'community'/);
  assert.match(agent, /kind: 'agreement'/);
  assert.match(store, /returnContext\?: \{ label: string; onReturn: \(\) => void \}/);
  assert.match(preview, /sourceLabel/);
  assert.match(preview, /backLabel/);
  assert.match(preview, /From \{returnContext\.label\}|sourceLabel/);
  assert.doesNotMatch(agent, /storeReturnContext.*dreamText|storeReturnContext.*circleContent|storeReturnContext.*money/i);
});

test('Store back behavior returns to the originating human surface when context exists', () => {
  assert.match(store, /onBack=\{\(\) => returnContext \? returnContext\.onReturn\(\) : controller\.backToHome\(\)\}/);
  assert.match(agent, /if \(context\.kind === 'vision'\) \{ setVisionLibrary\(true\); return; \}/);
  assert.match(agent, /if \(context\.kind === 'community'\) \{ setCommunity\(true\); return; \}/);
  assert.match(agent, /setWorkspaceAgreementId\(context\.agreementId \?\? null\)/);
});

test('Store Use this remains deliberate and does not become Agreement or Money authority', () => {
  assert.match(preview, /No Agreement or payment is created by previewing it/);
  assert.match(store, /onUseThis=\{\(\) => controller\.useThis\(\)\}/);
  assert.match(store, /onUseOffer\(\{/);
  assert.doesNotMatch(preview, /Pay now|Agreement created|Supplier selected/);
});

test('Community to Vision is an explicit backend transition before navigation', () => {
  assert.match(community, /communityGateway\.transitions\.projectToVision\(item\.id\)/);
  assert.match(community, /\.then\(\(\) => onNavigate\('vision-board'\)\)/);
  assert.match(community, /Add to Vision/);
});

test('Community to Store/trade stays prepare-only or explicit source selection', () => {
  assert.match(community, /prepareProject\(item\.id,'STORE'\)/);
  assert.match(community, /Nothing has been booked or paid for/);
  assert.match(agent, /controller\.useCommunitySource\(fact\)/);
  assert.doesNotMatch(community, /autoCreateAgreement|autoSelectSupplier|autoPay/);
});

test('Circle privacy remains scoped and does not become a generic cross-surface payload', () => {
  assert.match(community, /Ask KS001 in this Circle/);
  assert.match(community, /private conversations stay separate/);
  assert.doesNotMatch(agent, /circleObjects.*setStoreOfferRoute|circleObjects.*vision/i);
});

test('Vision remains private and only explicit fulfilment/store actions leave it', () => {
  assert.match(vision, /Saved here means private Vision memory/);
  assert.match(vision, /does not create a Project, Agreement, Store request or payment authority/);
  assert.match(vision, /Find real Store options for this need/);
});

test('notification routing uses typed action keys and exact Agreement object routing where authority exists', () => {
  assert.match(notificationApi, /parseNotificationActionKey/);
  assert.match(notifications, /OPEN_AGREEMENT/);
  assert.match(notifications, /agreementIdFromNotification/);
  assert.match(notifications, /actionObjectReference/);
  assert.match(notifications, /Review Agreement/);
  assert.doesNotMatch(notifications, /window\.location.*actionObjectReference/);
});

test('unknown values are not silently converted to zero/false across converged surfaces', async () => {
  const money = await readFile('src/features/money/SimpleMoneyDashboard.tsx', 'utf8');
  const adapters = await readFile('src/api/securepay/store/adapters.ts', 'utf8');
  assert.match(money, /Unavailable/);
  assert.doesNotMatch(money, /fundedMinor \?\? 0|remainingFundedMinor \?\? 0/);
  assert.match(adapters, /Price not listed/);
  assert.match(preview, /Service area not established/);
});

test('Business representation does not become a global identity switch', () => {
  assert.match(agent, /actingForBusiness/);
  assert.match(agent, /actingForOrganization/);
  assert.doesNotMatch(nav, /Act as Business|Business mode/);
});

test('Community Saver remains protected from a whole-product shortcut', async () => {
  const saver = await readFile('tests/community-saver-plug-gate.test.mjs', 'utf8');
  assert.match(saver, /does not expose an ungated Community Saver command/);
  assert.doesNotMatch(agent, /proposeFromNeed\(|executeCommunitySaver|bypassPlug/);
});

test('whole-product convergence adds no gamification or fake recommendation language', () => {
  const combined = nav + agent + store + preview + community + vision;
  assert.doesNotMatch(combined, /SecurePay score|progress XP|engagement streak|leaderboard|People like you|Trending near you/i);
});

test('mobile continuity keeps touch-sized navigation and contextual Store actions', () => {
  assert.match(nav, /min-h-11/);
  assert.match(preview, /min-h-11/);
  assert.match(store, /min-h-dvh/);
});
