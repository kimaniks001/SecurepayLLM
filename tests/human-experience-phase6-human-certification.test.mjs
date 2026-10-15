import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const read = path => readFile(path, 'utf8');

const bundleOf = async contents => {
  const result = await build({
    stdin: { contents, resolveDir: process.cwd() },
    bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic',
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  return mod.exports;
};

const reviewApi = await bundleOf(`
export { meansNoAgreementChange } from './src/features/formation/AgreementReview';
`);

test('Phase 6 contract 01 — cold start has one obvious natural-language entry', async () => {
  const home = await read('src/components/SignedOutHome.tsx');
  assert.match(home, /What would you like to/);
  assert.match(home, /Tell me in your own words/);
  assert.match(home, /Start without a KS Number/);
  assert.match(home, /Tell KS001 what you want to get done/);
  assert.doesNotMatch(home, /Start with KS001/);
});

test('Phase 6 contract 02 — Agreement artifact appears before system machinery', async () => {
  const shaping = await read('src/features/formation/AgreementShaping.tsx');
  assert.match(shaping, /Your Agreement is taking shape/);
  assert.match(shaping, /data-phase3-agreement/);
  assert.match(shaping, /Nothing is agreed yet/);
  assert.doesNotMatch(shaping, /Here's what I understood|Here’s what I understood/);
});

test('Phase 6 contract 03 — formation exposes one material question, not a questionnaire', async () => {
  const shaping = await read('src/features/formation/AgreementShaping.tsx');
  const question = await read('src/features/formation/NextQuestion.tsx');
  assert.match(shaping, /One thing needs your attention/);
  assert.match(shaping, /formation\.question/);
  assert.match(question, /question\.text/);
  assert.doesNotMatch(question, /question 1|question 2|question 3/i);
});

test('Phase 6 contract 04 — natural no-change language remains safe', () => {
  for (const phrase of ['nothing', 'nothing change', 'everything is okay', 'everything is ok', 'all good', 'looks good']) {
    assert.equal(reviewApi.meansNoAgreementChange(phrase), true, phrase);
  }
  assert.equal(reviewApi.meansNoAgreementChange('make it KES 90,000 instead'), false);
});

test('Phase 6 contract 05 — invitation is explicitly not agreement', async () => {
  const invite = await read('src/features/invitations/InvitePanel.tsx');
  assert.match(invite, /Creating it does not mean they have joined or agreed/);
  assert.match(invite, /the other person has not joined or agreed/);
});

test('Phase 6 contract 06 — recipient review keeps join and agreement separate', async () => {
  const recipient = await read('src/components/RecipientReview.tsx');
  const view = await read('src/features/recipient/view.ts');
  assert.match(recipient, /You have not joined or agreed to anything/);
  assert.match(view, /I agree to this Agreement/);
  assert.match(view, /moves no money/);
});

test('Phase 6 contract 07 — signing in cannot masquerade as agreement or Trust membership', async () => {
  const recipient = await read('src/features/recipient/RecipientExperience.tsx');
  const trust = await read('src/features/trust-project/TrustProjectExperience.tsx').catch(() => '');
  assert.match(recipient, /Signing in only proves who you are/);
  if (trust) assert.doesNotMatch(trust, /sign.?in.{0,60}(?:creates?|makes?).{0,40}member/is);
});

test('Phase 6 contract 08 — Agreed never claims Money moved', async () => {
  const agreed = await read('src/components/AgreementEstablished.tsx');
  assert.match(agreed, /Agreed/);
  assert.doesNotMatch(agreed, /paid|released|funded/i);
});

test('Phase 6 contract 09 — evidence never equals completion or release', async () => {
  const progress = await read('src/features/execution/ProgressPanel.tsx');
  assert.match(progress, /Submitting it doesn’t approve it or complete the work/);
  assert.match(progress, /Approving it doesn’t by itself complete the work or release money/);
});

test('Phase 6 contract 10 — completion never equals release authority', async () => {
  const next = await read('src/features/workspace/AgreementNextStep.tsx');
  assert.match(next, /release authority|release/i);
  assert.doesNotMatch(next, /COMPLETED\s*=>\s*RELEASE|COMPLETED.*RELEASE_NOW/s);
});

test('Phase 6 contract 11 — unknown remains unknown rather than failed', async () => {
  const next = await read('src/features/workspace/AgreementNextStep.tsx');
  const skills = await read('src/features/skills/SkillsInstituteExperience.tsx');
  assert.match(next, /UNKNOWN/);
  assert.match(next, /couldn't confirm|could not confirm/i);
  assert.match(skills, /SecurePay could not check that right now/);
});

test('Phase 6 contract 12 — Continue resolves exact context instead of module Home', async () => {
  const shell = await read('src/features/shell/humanNext.ts');
  const agent = await read('src/features/agent/AgentExperience.tsx');
  assert.match(shell, /HumanNext/);
  assert.match(agent, /routeHumanNext|openHumanNext/);
  assert.match(agent, /workspaceAgreementId|agreementId/);
});

test('Phase 6 contract 13 — Money contextual entry keeps Agreement context', async () => {
  const money = await read('src/features/money/MoneyExperience.tsx');
  assert.match(money, /Money for \$\{handoff\.title\}/);
  assert.match(money, /This money belongs to the Agreement/);
  assert.doesNotMatch(money, /AGREED.*PAY|COMPLETED.*RELEASE/s);
});

test('Phase 6 contract 14 — Store contextual entry preserves need and offer is non-committal', async () => {
  const store = await read('src/components/StoreHome.tsx');
  assert.match(store, /Find what \$\{contextLabel\} needs/);
  assert.match(store, /does not buy, agree or move money/);
});

test('Phase 6 contract 15 — Circle privacy remains an authority boundary', async () => {
  const community = await read('src/features/community/CommunityExperience.tsx');
  assert.match(community, /Private — not in general discovery/);
  assert.match(community, /private non-member never sees the feed|never even fetched/i);
});

test('Phase 6 contract 16 — Community Saver still requires a Plug', async () => {
  const progress = await read('src/features/execution/ProgressPanel.tsx');
  assert.match(progress, /A Plug must verify fit, coordinate consent and practical feasibility/i);
  assert.match(progress, /SecurePay has not combined this Agreement/i);
});

test('Phase 6 contract 17 — learning completion cannot grant Plug or Master capability', async () => {
  const skills = await read('src/features/skills/SkillsInstituteExperience.tsx');
  assert.match(skills, /Learning here never silently grants a Plug, Master, licence or commercial capability/);
  assert.match(skills, /professional or Plug\/Master capability remains separately authoritative/);
  assert.doesNotMatch(skills, /setQualified|grantCapability/);
});

test('Phase 6 contract 18 — permanent signed-in module navigation maze stays gone', async () => {
  const nav = await read('src/components/NavBar.tsx');
  assert.match(nav, /data-human-shell-nav/);
  assert.match(nav, /SecurePay Home/);
  assert.match(nav, /Notifications/);
  assert.match(nav, /Account/);
  assert.doesNotMatch(nav, /mobileNavItems|const navItems/);
});

test('Phase 6 contract 19 — mobile primary interactions retain 44px targets', async () => {
  const files = await Promise.all([
    read('src/components/SignedOutHome.tsx'),
    read('src/features/formation/AgreementReview.tsx'),
    read('src/components/StoreHome.tsx'),
    read('src/features/skills/SkillsInstituteExperience.tsx'),
  ]);
  const joined = files.join('\n');
  assert.match(joined, /min-h-11|min-h-12/);
  assert.match(joined, /md:/);
});

test('Phase 6 contract 20 — printed Agreement remains human-readable and hides screen machinery', async () => {
  const review = await read('src/features/formation/AgreementReview.tsx');
  const print = await read('src/components/AgreementPrintRecord.tsx');
  const css = await read('src/index.css');
  assert.match(review, /Print Agreement/);
  assert.match(review, /data-agreement-print/);
  assert.match(print, /Agreement/);
  assert.doesNotMatch(print, /JSON|stringify|digest|provider/i);
  assert.match(css, /@media print/);
  assert.match(css, /agreement-screen-only/);
});
