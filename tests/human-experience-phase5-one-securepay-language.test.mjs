import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('Phase 5: Money contextual entry keeps the Agreement visible and removes the module pathway', async () => {
  const src = await read('src/features/money/MoneyExperience.tsx');
  const dashboard = await read('src/features/money/SimpleMoneyDashboard.tsx');
  assert.match(src, /Money for \$\{handoff\.title\}/);
  assert.match(src, /This money belongs to the Agreement/);
  assert.doesNotMatch(src, /ExperiencePathway/);
  assert.match(dashboard, /Money for this Agreement/);
  assert.match(dashboard, /What was agreed/);
});

test('Phase 5: direct Money remains Agreement-first and financial authority stays backend-owned', async () => {
  const dashboard = await read('src/features/money/SimpleMoneyDashboard.tsx');
  const snapshot = await read('src/api/securepay/money-snapshot/dto.ts');
  assert.match(dashboard, /Money follows the agreement/);
  assert.match(dashboard, /No financial state is being inferred/);
  assert.match(snapshot, /movement: AgreementMoneyMovementSnapshot/);
  assert.match(snapshot, /state: 'READY' \| 'BLOCKED' \| 'UNAVAILABLE'/);
  assert.doesNotMatch(dashboard, /AGREED.*PAY|COMPLETED.*RELEASE/s);
});

test('Phase 5: Vision stays exploratory and speaks the shared SecurePay language', async () => {
  const dream = await read('src/features/visionboard/dreams/VisionDreamHome.tsx');
  const board = await read('src/features/visionboard/VisionBoardExperience.tsx');
  assert.match(dream, /What do you want to make possible\?/);
  assert.match(dream, /Vision stays exploratory until you choose/);
  assert.match(board, /Vision stays exploratory until you choose a real next step/);
  assert.doesNotMatch(board, /ExperiencePathway/);
});

test('Phase 5: Vision only moves deliberately into Store, Skills or Agreement', async () => {
  const board = await read('src/features/visionboard/VisionBoardExperience.tsx');
  assert.match(board, /Find what it needs/);
  assert.match(board, /Learn what you need/);
  assert.match(board, /Make an Agreement/);
  assert.match(board, /does not create a purchase, Agreement or Money instruction/);
});

test('Phase 5: Store contextual entry preserves the need rather than opening a generic marketplace', async () => {
  const home = await read('src/components/StoreHome.tsx');
  const experience = await read('src/features/store/StoreExperience.tsx');
  assert.match(home, /Find what \$\{contextLabel\} needs/);
  assert.match(home, /Opening an offer does not buy, agree or move money/);
  assert.match(experience, /contextLabel=\{returnContext\?\.label \?\? null\}/);
  assert.doesNotMatch(home, /ExperiencePathway/);
});

test('Phase 5: Store direct entry remains search-first and an offer is never silent commitment', async () => {
  const home = await read('src/components/StoreHome.tsx');
  assert.match(home, /What are you looking for\?/);
  assert.match(home, /Preview first, choose only when ready/);
  assert.match(home, /placeholder="What are you looking for\?"/);
});

test('Phase 5: Community is relevance-first instead of product-architecture-first', async () => {
  const home = await read('src/components/CommunityHome.tsx');
  const experience = await read('src/features/community/CommunityExperience.tsx');
  assert.match(home, /What is happening that matters to you\?/);
  assert.match(experience, /heading="What is happening that matters to you\?"/);
  assert.match(experience, /Real questions, needs, projects, opportunities and work stories/);
});

test('Phase 5: Community learning hands off contextually to Skills without changing Community authority', async () => {
  const home = await read('src/components/CommunityHome.tsx');
  const experience = await read('src/features/community/CommunityExperience.tsx');
  assert.match(home, /Explore related learning in Skills Institute/);
  assert.match(experience, /onOpenSkills=\{\(\) => onNavigate\('skills'\)\}/);
  assert.match(experience, /Join The Trust Project to share with the community/);
});

test('Phase 5: Skills uses the actual Institute backend routes', async () => {
  const gateway = await read('src/api/securepay/skills-institute/index.ts');
  assert.match(gateway, /\/api\/v1\/institute\/public\/search/);
  assert.match(gateway, /\/api\/v1\/institute\/learn/);
  assert.match(gateway, /\/api\/v1\/institute\/participations/);
  assert.doesNotMatch(gateway, /\/api\/v1\/institute\/search/);
});

test('Phase 5: Skills completion never independently grants Plug or Master capability', async () => {
  const skills = await read('src/features/skills/SkillsInstituteExperience.tsx');
  assert.match(skills, /programme completion only/);
  assert.match(skills, /professional or Plug\/Master capability remains separately authoritative/);
  assert.doesNotMatch(skills, /setQualified|grantCapability|qualified = true/i);
});

test('Phase 5: Skills learning synthesis is user-triggered, not an automatic paid-model call', async () => {
  const skills = await read('src/features/skills/SkillsInstituteExperience.tsx');
  assert.match(skills, /const askInstitute = \(\) =>/);
  assert.match(skills, /gateway\.learn\(question/);
  assert.match(skills, /onClick=\{askInstitute\}/);
  assert.match(skills, /public browsing is read-only; no model\/provider call/);
});

test('Phase 5: direct routes exist for Money, Store, Vision, Community and Skills', async () => {
  const runtime = await read('src/RuntimeApp.tsx');
  assert.match(runtime, /useMoneyRoute/);
  assert.match(runtime, /useSkillsRoute/);
  assert.match(runtime, /#\\\/\?store/);
  assert.match(runtime, /#\\\/\?\(\?:vision\|vision-board\)/);
  assert.match(runtime, /#\\\/\?community/);
  assert.match(runtime, /key=\{directSurfaceRoute \?\? 'app'\}/);
});

test('Phase 5: direct Community entry is actually consumed by the Community surface', async () => {
  const agent = await read('src/features/agent/AgentExperience.tsx');
  assert.match(agent, /useState\(externalEntryView === 'community'\)/);
  assert.match(agent, /useState\(externalEntryView === 'vision-board'\)/);
  assert.match(agent, /externalEntryView === 'store'/);
});

test('Phase 5: no permanent module pathway is rendered by Money, Vision or Store', async () => {
  const [money, vision, store] = await Promise.all([
    read('src/features/money/MoneyExperience.tsx'),
    read('src/features/visionboard/VisionBoardExperience.tsx'),
    read('src/components/StoreHome.tsx'),
  ]);
  assert.doesNotMatch(money, /ExperiencePathway/);
  assert.doesNotMatch(vision, /ExperiencePathway/);
  assert.doesNotMatch(store, /ExperiencePathway/);
});

test('Phase 5: the signed-in persistent NavBar remains restrained', async () => {
  const nav = await read('src/components/NavBar.tsx');
  assert.match(nav, /data-human-shell-nav/);
  assert.match(nav, /aria-label="SecurePay Home"/);
  assert.match(nav, /aria-label="Notifications"/);
  assert.match(nav, /aria-label="Account"/);
  assert.doesNotMatch(nav, /mobileNavItems|const navItems/);
});

test('Phase 5: shared empty and error language stays calm and fail-closed', async () => {
  const [skills, store, money] = await Promise.all([
    read('src/features/skills/SkillsInstituteExperience.tsx'),
    read('src/components/StoreHome.tsx'),
    read('src/features/money/SimpleMoneyDashboard.tsx'),
  ]);
  assert.match(skills, /No Institute programme needs your attention right now/);
  assert.match(store, /Nothing is published on SecurePay right now/);
  assert.match(money, /No financial state is being inferred/);
  assert.match(skills, /SecurePay could not check that right now/);
});

test('Phase 5: advanced machinery remains progressively disclosed', async () => {
  const [money, store, skills] = await Promise.all([
    read('src/features/money/MoneyExperience.tsx'),
    read('src/components/StoreHome.tsx'),
    read('src/features/skills/SkillsInstituteExperience.tsx'),
  ]);
  assert.match(money, /<details/);
  assert.match(money, /Technical & administration record/);
  assert.match(store, /<details/);
  assert.match(skills, /<details/);
  assert.match(skills, /Source details/);
});

test('Phase 5: 320px hierarchy keeps 44px interaction targets in converged surfaces', async () => {
  const [skills, store, vision] = await Promise.all([
    read('src/features/skills/SkillsInstituteExperience.tsx'),
    read('src/components/StoreHome.tsx'),
    read('src/features/visionboard/dreams/VisionDreamHome.tsx'),
  ]);
  assert.match(skills, /min-h-11/);
  assert.match(store, /min-h-11/);
  assert.match(vision, /max-w-3xl mx-auto px-4 md:px-6/);
});
