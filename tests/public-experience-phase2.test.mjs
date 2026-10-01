import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';

// Public Experience Convergence Phase 2 -- the public shell, public Home, Sign in, the Join gate, customer
// language and accessibility (contract: docs/PUBLIC_EXPERIENCE_CONVERGENCE_PHASE1.md §4–§18).
const bundleOf = async (contents, plugins = []) => {
  const result = await build({ stdin: { contents, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' }, plugins });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  return mod.exports;
};
const api = await bundleOf(`
export { NavBar } from './src/components/NavBar';
export { PublicNav } from './src/features/public/PublicNav';
export { PUBLIC_NAV_SECTIONS } from './src/features/public/publicContent';
export { PublicShellProvider, createPublicShellBridge } from './src/features/public/publicShell';
export { PublicHome } from './src/features/public/PublicHome';
export { SignInExperience } from './src/features/public/SignInExperience';
export { isSignInHash } from './src/features/public/signInRoute';
export { SignedOutHome, SecurePayHero } from './src/components/SignedOutHome';
export { FairTradeAffordance } from './src/components/FairTradePrinciples';
export { BringPlanPanel } from './src/features/sources/ui/BringPlanPanel';
export { sourceIngestionErrorText } from './src/features/sources/controller';
export { SecureAuthCard } from './src/components/SecureAuth';
export { ConversationInput } from './src/components/ConversationInput';
export { HOME_EXAMPLES, EXAMPLE_OUTCOME, CAPACITIES } from './src/features/public/publicContent';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`);
const h = (component, props = {}, ...children) => api.createElement(component, props, ...children);
const html = element => api.renderToStaticMarkup(element);
const text = markup => markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const noop = () => {};
const actions = { home: noop, signIn: noop, section: noop, skipToKs001: noop };
const homeProps = { onStart: noop, onBringPlan: noop, onPickDocument: noop, onPickPhoto: noop, onFocusComposer: noop, onBrowseStores: noop, onSignIn: noop, onRecover: noop, onHelp: noop, onSection: noop };
const publicHome = html(h(api.PublicHome, homeProps));
const publicHomeText = text(publicHome);
const strip = src => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const publicFiles = async () => (await readdir('src/features/public')).map(f => `src/features/public/${f}`);

// ------------------------------------------------------------------ PUBLIC NAV
const APP_NAV = ['Agreements', 'Money', 'Store', 'Community', 'Account', 'Notifications', 'Projects', 'Vision Board'];
test('signed out: NavBar renders the public navigation and none of the signed-in app destinations', () => {
  const markup = html(h(api.PublicShellProvider, { value: actions }, h(api.NavBar, { view: 'signed-out', onNavigate: noop })));
  const out = text(markup);
  for (const label of ['How it works', 'The Trust Project', 'For Business', 'Sign in', 'Skip to KS001']) assert.match(out, new RegExp(label));
  for (const label of APP_NAV) assert.doesNotMatch(out, new RegExp(`\\b${label}\\b`), `${label} must not appear in the public nav`);
  assert.doesNotMatch(markup, /fixed bottom-0/, 'no signed-out bottom navigation');
});
// Phase 4 final UI polish (UR-223, explicitly authorised): the signed-in NavBar's PRESENTATION changed (44px targets,
// mark-only brand at md, the wordmark's alt moved to the button's aria-label). Its information architecture must not:
// destinations, labels, order and element structure stay identical to main once presentational attributes are removed.
const structural = markup => markup.replace(/ class="[^"]*"/g, '').replace(/ alt="[^"]*"/g, '').replace(/ aria-label="SecurePay"/g, '');
test('signed in (no public shell): NavBar structure is identical to main (presentation-only Phase 4 polish)', async () => {
  const baseline = await bundleOf(`
export { NavBar } from './src/components/NavBar';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';`, [{ name: 'main-navbar', setup(b) { b.onLoad({ filter: /src\/components\/NavBar\.tsx$/ }, () => ({ contents: execFileSync('git', ['show', 'cb6aa531cd4614a941c2e8b0707e190870c0975c:src/components/NavBar.tsx'], { encoding: 'utf8' }), loader: 'tsx' })); } }]);
  for (const view of ['signed-in', 'agreements', 'money', 'store', 'community', 'account', 'notifications']) {
    const now = html(h(api.NavBar, { view, onNavigate: noop }));
    const then = baseline.renderToStaticMarkup(baseline.createElement(baseline.NavBar, { view, onNavigate: noop }));
    assert.equal(structural(now), structural(then), `signed-in NavBar structure changed for view ${view}`);
  }
});
test('the mobile menu button exposes its state and controls the sheet', () => {
  const markup = html(h(api.PublicNav, { actions }));
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /aria-controls="[^"]+"/);
  assert.match(markup, /aria-label="Open menu"/);
  assert.deepEqual(api.PUBLIC_NAV_SECTIONS.map(s => s.id), ['how-it-works', 'trust-project', 'for-business']);
});
test('the menu traps focus, closes on Escape and returns focus to its trigger', async () => {
  const src = await readFile('src/features/public/PublicNav.tsx', 'utf8');
  assert.match(src, /event\.key === 'Escape'[\s\S]*closeMenu\(true\)/);
  assert.match(src, /triggerRef\.current\?\.focus\(\)/);
  assert.match(src, /event\.key !== 'Tab'/);
  assert.match(src, /role="dialog"/);
  // The tap-outside backdrop must live outside the blurred header, which would otherwise be the containing
  // block for fixed children and collapse the backdrop to zero height (found in browser verification).
  assert.ok(src.indexOf('fixed inset-0 z-20') > src.indexOf('</header>'), 'backdrop must be rendered after </header>');
});
test('chapter navigation scrolls and focuses the heading and never changes location.hash', async () => {
  const shell = strip(await readFile('src/features/public/publicShell.ts', 'utf8'));
  assert.match(shell, /\[data-public-section="\$\{id\}"\] h2/);
  assert.match(shell, /scrollIntoView/);
  assert.match(shell, /heading\.focus\(/);
  for (const file of await publicFiles()) assert.doesNotMatch(strip(await readFile(file, 'utf8')).replace(/SIGN_IN_HASH[\s\S]*?;/, ''), /location\.hash\s*=\s*['"`]#(how|trust|for)/, file);
  for (const id of ['how-it-works', 'trust-project', 'for-business']) {
    assert.match(publicHome, new RegExp(`data-public-section="${id}"[\\s\\S]*?<h2[^>]*tabindex="-1"`), `${id} heading must be focusable`);
  }
});

// ------------------------------------------------------------------ JOIN GATE
// Phase 2 kept Join unavailable. Public Experience Convergence Phase 4 made it REAL (ADR-0021, real
// `/membership/join` authority), so the gate now pins the opposite: Join is live, never a placeholder, and
// never an Organization or Business Join.
test('Join is live in the public experience (Phase 4) and never a placeholder or an Organization/Business Join', async () => {
  const nav = text(html(h(api.PublicNav, { actions })));
  assert.match(nav, /\bJoin\b/);
  assert.match(publicHomeText, /Join The Trust Project/);
  for (const out of [nav, publicHomeText]) {
    assert.doesNotMatch(out, /coming soon|opens soon|not ready yet/i);
    assert.doesNotMatch(out, /Join (as|for) (a |an |your )?(Business|Organi[sz]ation)/i);
  }
});

// ------------------------------------------------------------------ PUBLIC HOME
test('the public Home keeps the exact SecurePay + KS001 hero, supporting copy and trust line', () => {
  assert.ok(publicHomeText.includes('Bring the plan. Leave with an agreement.'));
  // User-Ready Beta Gate 1 (EP-CERT-009) -- one-sentence supporting idea.
  assert.ok(publicHomeText.includes('Tell SecurePay what you’re trying to make happen, or give it what you already have. It shapes the agreement with you — you only check what needs deciding.'));
  assert.ok(publicHomeText.includes('Start without a KS Number. Nothing becomes an agreement until you review and confirm it.'));
  assert.equal((publicHome.match(/<h1\b/g) ?? []).length, 1, 'exactly one h1');
});
test('chapters are in the contract order with semantic h2 headings', () => {
  const order = ['Bring the plan. Leave with an agreement.', 'Tile my bathroom.', 'What you leave with', 'How SecurePay works', 'The Trust Project is powered by SecurePay. Your KS Number is your identity across both.', 'Member, Plug and Master', 'What becomes possible', 'Stores and Community', 'Use SecurePay directly or build it into how your business already works.', 'Guided by the 12 Principles of Fair Trade'];
  let at = -1;
  for (const s of order) { const i = publicHomeText.indexOf(s, at + 1); assert.ok(i > at, `"${s}" missing or out of order`); at = i; }
  const levels = [...publicHome.matchAll(/<h([1-6])\b/g)].map(m => Number(m[1]));
  for (let i = 1; i < levels.length; i++) assert.ok(levels[i] - levels[i - 1] <= 1, `heading level skips from h${levels[i - 1]} to h${levels[i]}`);
});
// User-Ready Beta Gate 1 (EP-CERT-009) -- a FEW strong examples spanning household, business and community (never a wall
// of chips), each starting a real conversation through onStart; and ONE clearly labelled illustration of the output.
test('Home examples are three, span household/business/community, and use onStart', async () => {
  assert.equal(api.HOME_EXAMPLES.length, 3);
  for (const example of api.HOME_EXAMPLES) assert.ok(publicHomeText.includes(example), example);
  const src = await readFile('src/components/SignedOutHome.tsx', 'utf8');
  assert.match(src, /onClick=\{\(\) => onStart\(example\)\}/);
});
test('the example outcome is labelled as an illustration, and names appear ONLY inside it (never as testimonials)', () => {
  const figure = publicHome.match(/<figure[^>]*data-example-outcome[^>]*>[\s\S]*?<\/figure>/)[0];
  assert.match(text(figure), /Example · illustration/);
  assert.match(figure, /aria-label="Example of an agreement taking shape \(illustration\)"/);
  assert.doesNotMatch(text(publicHome.replace(figure, '')), /Peter|James|Kamau|Amina|Joseph/);
  assert.doesNotMatch(figure, /<button|<a /, 'the illustration is never an interactive control');
});
test('Member, Plug and Master are equal, not ranked, and carry no authority; businesses may belong', () => {
  assert.deepEqual(api.CAPACITIES.map(c => c.name), ['Member', 'Plug', 'Master']);
  const cards = [...publicHome.matchAll(/<li class="([^"]*)" data-capacity="(\w+)"/g)];
  assert.equal(cards.length, 3);
  assert.ok(cards.every(c => c[1] === cards[0][1]), 'the three cards share one visual treatment');
  assert.match(publicHomeText, /People and businesses belong through their own KS Number/);
  assert.match(publicHomeText, /Plugs and Masters are individual people/);
  assert.match(publicHomeText, /never ranks/);
  assert.doesNotMatch(publicHomeText, /Member\s*→\s*Plug|upgrade to|level up|\btier\b/i);
  assert.doesNotMatch(publicHomeText, /organi[sz]ation (join|sign up)|join as an organi[sz]ation/i, 'no Organization action');
});
test('no fake live activity: no counts, no people, no testimonials, no automatic data loading', async () => {
  assert.doesNotMatch(publicHomeText, /\b\d[\d,.]*\+?\s*(members|people|stores|businesses|agreements|offers|sellers|users)\b/i);
  assert.doesNotMatch(publicHomeText, /testimonial|featured|top sellers|trending|verified/i);
  for (const file of await publicFiles()) {
    const src = strip(await readFile(file, 'utf8'));
    if (file.endsWith('SignInExperience.tsx')) continue; // authentication only, via the identity controller
    assert.doesNotMatch(src, /Gateway|fetch\(|http\.request/, `${file} must not load live data`);
  }
});
test('no public Home component imports fixture or demo data', async () => {
  const files = [...await publicFiles(), 'src/components/SignedOutHome.tsx', 'src/components/TrustProjectSection.tsx', 'src/components/FairTradePrinciples.tsx', 'src/components/NavBar.tsx'];
  for (const file of files) {
    const src = await readFile(file, 'utf8');
    assert.doesNotMatch(src, /from ['"][^'"]*(demoData|ecosystemData|storeData|circleData|DisputeMaster|fixture|ReferralHistoryView)[^'"]*['"]/, file);
  }
});
test('Store glimpse is explanation plus a user-initiated Browse Stores; Community stays private', async () => {
  assert.match(publicHomeText, /People and businesses keep a Store for what they offer\. Anyone can browse\./);
  assert.match(publicHomeText, /Members ask for and offer help in Community and Circles\./);
  assert.match(publicHomeText, /Browse Stores/);
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /onBrowseStores=\{\(\) => navigateTo\('store'\)\}/);
});
test('For Business is truthful: no Business onboarding promise, no "sign in as the Business", no Business Join', () => {
  assert.doesNotMatch(publicHomeText, /create your business ks number|sign in as the business|join for (your|a) business/i);
  assert.match(publicHomeText, /An authorised person acts for the business\./);
  assert.doesNotMatch(publicHomeText, /webhook|credential|API key|sandbox/i);
});
test('public-only chapters never render in the signed-in Home', async () => {
  const signedInMarkup = text(html(h(api.SignedOutHome, { onStart: noop, onBringPlan: noop, onPickDocument: noop, onPickPhoto: noop })));
  for (const chapter of ['How SecurePay works', 'Member, Plug and Master', 'What becomes possible', 'Stores and Community', 'For Business']) {
    assert.doesNotMatch(signedInMarkup, new RegExp(chapter), `${chapter} leaked into the signed-in Home`);
  }
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  const signedInBranch = agent.slice(agent.indexOf('{signedIn ? <>'), agent.indexOf('</> : ('));
  assert.ok(signedInBranch.length > 0);
  assert.doesNotMatch(signedInBranch, /<PublicHome/);
  assert.ok(agent.indexOf('<PublicHome') > agent.indexOf('</> : ('), 'PublicHome renders only in the signed-out branch');
  assert.match(agent, /<PublicShellProvider value=\{sessionState\.status === 'signed-in' \? null : bridge\}>/);
});

// ------------------------------------------------------------------ SIGN IN
test('#/sign-in is recognised; nothing else is', () => {
  for (const hash of ['#/sign-in', '#sign-in', '#/sign-in/']) assert.equal(api.isSignInHash(hash), true, hash);
  for (const hash of ['', '#/', '#/activate', '#/join', '#/sign-in/x', '#/signin']) assert.equal(api.isSignInHash(hash), false, hash);
});
test('the Sign in page reuses SecureAuth with labelled fields and is authentication only', async () => {
  const markup = html(h(api.SignInExperience, { auth: { signIn: noop, completeOtp: noop, resendOtp: noop }, session: { setTokens: noop }, onSignedIn: noop, onCancel: noop, onRecover: noop }));
  assert.match(text(markup), /Sign in to SecurePay/);
  assert.equal((markup.match(/<h1\b/g) ?? []).length, 1);
  for (const [, forId] of markup.matchAll(/<label for="([^"]+)"/g)) assert.match(markup, new RegExp(`<input id="${forId.replace(/[:]/g, '\\:')}"`), 'label must point at its input');
  assert.match(text(markup), /It does not create, join, confirm or pay for anything\./);
  const src = strip(await readFile('src/features/public/SignInExperience.tsx', 'utf8'));
  assert.match(src, /createIdentityController/);
  assert.match(src, /SecureAuthCard/);
  assert.doesNotMatch(src, /subscription|Subscription|activation|Activation|funding|membership|agreement|Agreement/, 'no plan, activation, funding, membership or Agreement calls');
});
test('signed-out requests for private areas go to Sign in, never to a dead-end "Review this" notice', async () => {
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.doesNotMatch(agent, /Sign in through "Review this"/);
  assert.match(agent, /const requestSignIn = \(intent: AppView\) => \{ setHome\(true\); signInRoute\.open\(intent\); \};/);
  assert.match(agent, /if \(signInRoute\.active && !signedIn\)[\s\S]*<SignInExperience/);
  // After sign-in, leave the route and continue to the requested area.
  assert.match(agent, /const intent = signInRoute\.close\(\);\s*if \(intent\) navigateTo\(intent\);/);
});
test('Activation stays a signed-in destination and is untouched', async () => {
  const runtime = await readFile('src/RuntimeApp.tsx', 'utf8');
  assert.match(runtime, /\/\^#\\\/\?activate\\\/\?\$\//);
  // Phase 4D adds Organization. Vision V1.4 is the later, explicitly bounded exception: it adds
  // only the private Dream gateway and passes it to AgentExperience. Activation itself must remain untouched.
  const diff = execFileSync('git', ['diff', '-U0', 'cb6aa531cd4614a941c2e8b0707e190870c0975c', '--', 'src/RuntimeApp.tsx'], { encoding: 'utf8' });
  const changed = diff.split('\n').filter(line => /^[+-](?![+-])/.test(line));
  const removed = changed.filter(line => line.startsWith('-')).map(line => line.slice(1));
  const added = changed.filter(line => line.startsWith('+')).map(line => line.slice(1));
  assert.ok(added.every(line => /organizationGateway|visionDreamGateway|api\.visionDreams|Phase 4D/.test(line)),
    'RuntimeApp gains only the Organization and private Vision Dream gateway wiring');
  assert.ok(removed.every(line => /return api && agentGateway|<AgentExperience/.test(line)),
    'Vision may only replace the runtime readiness line and AgentExperience call');
  assert.ok(changed.every(line => !/activate|Activation/.test(line)), 'Activation routing/configuration remains byte-untouched');
  assert.match(runtime, /visionDreamGateway=\{visionDreamGateway\}/, 'the private Dream gateway is passed explicitly');
  const signedInHome = text(html(h(api.SignedOutHome, { onStart: noop })));
  assert.match(signedInHome, /Activate SecurePay/, 'the signed-in Home keeps its Activation entry');
  assert.doesNotMatch(publicHomeText, /Activate SecurePay/, 'the public Home no longer uses Activation as its front door');
});

// ------------------------------------------------------------------ COPY CLEANUP
test('source intake copy never names the internal BUILD workspace', async () => {
  const panel = text(html(h(api.BringPlanPanel, { busy: false, error: null, onSubmit: noop, onClose: noop })));
  assert.match(panel, /Add to this conversation/);
  assert.match(panel, /SecurePay will pick out useful details as suggestions for you to check\./);
  assert.doesNotMatch(panel, /BUILD/);
  const unreachable = api.sourceIngestionErrorText(new api.ApiError('network', 'offline'));
  // Entry Perfection Phase 2 -- DELIBERATELY RESTATED (Phase 1 H6): a dropped connection is an UNKNOWN outcome, not "nothing was added" (the server may have
  // finished). The backend's own FAILED reason keeps the Phase 3 sentence; this is the transport case only.
  assert.match(unreachable, /couldn’t confirm whether it read this\. Trying again is safe/);
  assert.doesNotMatch(unreachable, /BUILD/);
  assert.doesNotMatch(unreachable, /agreement/i);
  const card = strip(await readFile('src/features/sources/ui/SourceCard.tsx', 'utf8'));
  assert.doesNotMatch(card, /Read into BUILD|Reading this into BUILD|added to BUILD|reached BUILD/);
});
test('Phase 2 register targets use customer language (no "backend", public spelling "KS Number")', async () => {
  const checks = [
    ['src/features/money/MoneyExperience.tsx', /SecurePay already knows who you are — just tell it where you want to be paid\./, /The backend derives|KSNumber --/],
    ['src/features/developer/DeveloperExperience.tsx', /Only what’s available to your Business is shown here\./, /backend-verified/],
    ['src/features/business/BusinessExperience.tsx', /Assigning roles to other members isn’t available here yet\./, /maker-checker role-assignment authority/],
    ['src/features/activation/ActivationExperience.tsx', /SecurePay has a next step this screen can’t show yet\. Check again, or contact support\./, /does not recognize the backend/],
  ];
  for (const [file, present, absent] of checks) {
    const src = await readFile(file, 'utf8');
    assert.match(src, present, file);
    assert.doesNotMatch(src, absent, file);
  }
});

// ------------------------------------------------------------------ FAIR TRADE
test('Fair Trade uses the canonical principles, capitalised, at AA contrast', async () => {
  const affordance = html(h(api.FairTradeAffordance, { onOpen: noop }));
  assert.match(text(affordance), /Guided by the 12 Principles of Fair Trade/);
  assert.doesNotMatch(affordance, /text-sand-(400|500)\b/);
  for (const file of await publicFiles()) {
    const src = strip(await readFile(file, 'utf8'));
    assert.doesNotMatch(src, /FAIR_TRADE_PRINCIPLES\s*=|Principle \d/, `${file} must not keep its own principles list`);
  }
  assert.match(await readFile('src/features/public/PublicHome.tsx', 'utf8'), /import \{ FairTradePrinciplesPanel \} from '\.\.\/\.\.\/components\/FairTradePrinciples'/);
});

// ------------------------------------------------------------------ ACCESSIBILITY
test('public text never uses the low-contrast sand-400/sand-500 tokens', async () => {
  for (const file of [...await publicFiles(), 'src/components/SignedOutHome.tsx']) {
    const src = strip(await readFile(file, 'utf8'));
    assert.doesNotMatch(src, /text-sand-(400|500)\b(?![^"]*placeholder)/, file);
  }
});
test('reduced motion is honoured on every screen', async () => {
  const css = await readFile('src/index.css', 'utf8');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration: 0\.01ms !important/);
  assert.match(css, /scroll-behavior: auto !important/);
});
test('the composer, file pickers and sign-in fields have accessible names', () => {
  const input = html(h(api.ConversationInput, { onSend: noop }));
  assert.match(input, /aria-label="Message KS001"/);
  assert.match(input, /aria-label="Send"/);
  assert.match(input, /data-ks001-composer/);
  const hero = html(h(api.SecurePayHero, { onStart: noop, onBringPlan: noop, onPickDocument: noop, onPickPhoto: noop, variant: 'public' }));
  // Phase 3 -- one visible, named "+" trigger; every picker behind it is a hidden, non-focusable input.
  assert.match(hero, /aria-haspopup="menu"[^>]*aria-label="Add what you have"|aria-label="Add what you have"[^>]*aria-haspopup="menu"/);
  for (const input of hero.match(/<input[^>]*type="file"[^>]*>/g) ?? []) assert.match(input, /tabindex="-1"/);
  const auth = html(h(api.SecureAuthCard, { data: { type: 'SECURE_AUTH', title: 'Sign in', identityName: '', identityKsn: '', reason: 'r', fields: [{ label: 'One-time code', placeholder: '', type: 'otp' }], primaryLabel: 'Verify', primaryValue: 'v', secondaryLabel: 'Back', secondaryValue: 'b' }, values: [''], onFieldChange: noop, onChoice: noop, errorText: 'That didn’t work.' }));
  assert.match(auth, /inputMode="numeric"/);
  assert.match(auth, /autoComplete="one-time-code"/);
  assert.match(auth, /aria-invalid="true"/);
  const describedBy = auth.match(/aria-describedby="([^"]+)"/)[1];
  assert.match(auth, new RegExp(`<p id="${describedBy.replace(/[:]/g, '\\:')}" role="alert"`));
});

// ------------------------------------------------------------------ REGRESSION
test('the KS001 intake keeps its file types, photo capture and conversation pathway in both Homes', () => {
  for (const variant of ['public', 'app']) {
    const hero = html(h(api.SecurePayHero, { onStart: noop, onBringPlan: noop, onPickDocument: noop, onPickPhoto: noop, variant }));
    assert.match(hero, /accept="\.pdf,\.docx,\.txt,\.md,\.csv,application\/pdf,application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document,text\/plain,text\/markdown,text\/csv"/, variant);
    assert.match(hero, /accept="image\/jpeg,image\/png" capture="environment"/, variant);
    // Phase 3 -- the intake is the ONE shared SourceMenu; its choices render when it opens.
    assert.match(hero, /aria-label="Add what you have"/, variant);
  }
});
test('the public screens a signed-out visitor can reach drop the bottom-navigation padding only in the public shell', async () => {
  for (const file of ['src/features/store/StoreExperience.tsx', 'src/features/community/CommunityExperience.tsx', 'src/features/circle/CircleExperience.tsx', 'src/features/recovery/RecoveryExperience.tsx']) {
    const src = await readFile(file, 'utf8');
    assert.match(src, /const navPadding = useAppNavPadding\(\);/, file);
    assert.doesNotMatch(src, /bg-cream-100 pb-16 md:pb-0"/, file);
  }
  const shell = await readFile('src/features/public/publicShell.ts', 'utf8');
  assert.match(shell, /return usePublicShell\(\) \? '' : 'pb-16 md:pb-0';/);
});

// ================================================================== Phase 2 final correction pass
const extra = await bundleOf(`
export { ChoiceButtons } from './src/components/ChoiceButtons';
export { TrustProjectSection } from './src/components/TrustProjectSection';
export { RecoveryExperience } from './src/features/recovery/RecoveryExperience';
export { createRecoveryController } from './src/features/recovery/controller';
export { SupportView } from './src/features/support/SupportExperience';
export { StoreHome } from './src/components/StoreHome';
export { OfferDetail } from './src/components/OfferDetail';
export { ResultCard } from './src/features/discovery/ui/ResultCard';
export { CommunityHome } from './src/components/CommunityHome';
export { CommunityObjectCard } from './src/components/CommunityObjectCard';
export { PublicShellProvider } from './src/features/public/publicShell';
export { SupportExperience, HUMAN_SUPPORT_UNAVAILABLE } from './src/features/support/SupportExperience';
export { AgreementSupport } from './src/components/AgreementSupport';
export { secureAuthView } from './src/features/identity/view';
export { demoOffers, demoStores } from './src/storeData';
export { demoCommunityObjects } from './src/communityData';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`);
const xr = (component, props = {}) => extra.renderToStaticMarkup(extra.createElement(component, props));
/**
 * Rendered-state contrast check: every NON-icon element in the rendered markup whose own class sets a text colour
 * of sand-400 or sand-500 (below AA 4.5:1 at these small sizes on cream/white). Icons (<svg>) and placeholder:
 * modifiers are decorative/exempt and ignored.
 */
const lowContrastText = markup => [...markup.matchAll(/<(\w+)\b[^>]*\bclass="([^"]*)"[^>]*>/g)]
  .filter(([, tag, cls]) => tag !== 'svg' && /(?:^|\s)text-sand-(400|500)(?:\s|$)/.test(cls))
  .map(([whole]) => whole.slice(0, 120));

test('ChoiceButtons give every choice a 44px minimum target without losing the pill styling', () => {
  const markup = xr(extra.ChoiceButtons, { data: { type: 'CHOICE_BUTTONS', choices: [{ label: 'Yes', value: 'y' }, { label: 'Not yet', value: 'n' }] }, onChoice: noop });
  const buttons = [...markup.matchAll(/<button[^>]*class="([^"]*)"/g)].map(m => m[1]);
  assert.equal(buttons.length, 2);
  for (const cls of buttons) {
    assert.match(cls, /(?:^|\s)min-h-11(?:\s|$)/, '44px minimum target');
    assert.match(cls, /rounded-full/, 'still a pill');
    assert.match(cls, /focus-visible:ring-2/);
    assert.doesNotMatch(cls, /min-h-(1[2-9]|[2-9]\d)|py-(3|4|5)\b|text-(base|lg|xl)/, 'not an oversized CTA');
  }
  assert.match(buttons[0], /bg-forest-600 text-cream-50/, 'primary choice keeps its style');
  assert.match(buttons[1], /bg-white text-forest-700 border/, 'secondary choice keeps its style');
});

test('Plug copy separates a membership invitation from a commercial referral, on the public Home and the signed-in doorway', () => {
  const doorway = text(xr(extra.TrustProjectSection, { onExploreCommunity: noop, onOpenStores: noop }));
  for (const out of [publicHomeText, doorway]) {
    assert.match(out, /An invitation is not a referral, and recruiting members earns nothing automatically\./);
    assert.match(out, /Income is never guaranteed\./);
    assert.match(out, /Helping never gives a Plug authority over anyone’s agreement or money\./);
    assert.doesNotMatch(out, /inviting people earns nothing/i, 'no blanket rule denying qualifying commercial referrals');
    assert.doesNotMatch(out, /\d+\s?%|per cent|percent|guaranteed (income|reward|commission)/i, 'no percentages or promised rewards');
  }
});

test('the Store follows the KS identity, not Trust Project membership', () => {
  const doorway = text(xr(extra.TrustProjectSection, { onExploreCommunity: noop, onOpenStores: noop }));
  assert.match(doorway, /Your KS Store/);
  assert.doesNotMatch(doorway, /A Store for every member/);
  assert.match(doorway, /Your KS identity gives you a digital Store while your SecurePay identity is active\./);
  assert.doesNotMatch(doorway, /(membership|joining|member) (gives|creates|activates|provides)[^.]*Store/i);
});

test('signed-out Recovery renders no low-contrast text in any step', async () => {
  // Recovery is reachable only signed out and every one of its steps is a signed-out state, so the whole file is
  // the state under test. (It uses useSyncExternalStore without a server snapshot, so it cannot be SSR-rendered
  // here; the rendered page was audited in the browser.)
  const src = strip(await readFile('src/features/recovery/RecoveryExperience.tsx', 'utf8'));
  assert.doesNotMatch(src, /(?<![:\w-])text-sand-(400|500)\b/);
  assert.match(src, /text-sand-600/);
});

test('signed-out Help renders no low-contrast text', () => {
  const nav = { openAgreement: noop, openAgreementReviews: noop, openMoney: noop, askAgent: noop, recovery: noop, notifications: noop, account: noop, agreements: noop, money: noop, store: noop, community: noop };
  const markup = xr(extra.SupportView, { signedIn: false, ctx: null, label: null, reviews: null, reviewCase: null, money: null, nav });
  assert.match(text(markup), /What do you need help with\?/);
  assert.deepEqual(lowContrastText(markup), []);
});

test('Sign in (credentials and one-time code) renders no low-contrast text', () => {
  const base = { type: 'SECURE_AUTH', title: 'Enter the code sent to you', identityName: '', reason: 'r', primaryLabel: 'Verify', primaryValue: 'v', secondaryLabel: 'Start over', secondaryValue: 's' };
  const otp = html(h(api.SecureAuthCard, { data: { ...base, identityKsn: 'KS018', fields: [{ label: 'One-time code', placeholder: '6-digit code', type: 'otp' }] }, values: [''], onFieldChange: noop, onChoice: noop }));
  assert.match(text(otp), /KS018/);
  assert.deepEqual(lowContrastText(otp), []);
  const signIn = html(h(api.SignInExperience, { auth: { signIn: noop, completeOtp: noop, resendOtp: noop }, session: { setTokens: noop }, onSignedIn: noop, onCancel: noop, onRecover: noop }));
  assert.deepEqual(lowContrastText(signIn), []);
});

test('signed-out Store browse, result cards and offer detail render no low-contrast text', () => {
  const home = xr(extra.StoreHome, { onOpenOffer: noop, onOpenStore: noop, onManageStore: noop, onCreateOffer: noop, onStartConversation: noop, offers: [], stores: [], query: '', onQueryChange: noop, searchStatus: 'ready' });
  assert.deepEqual(lowContrastText(home), []);
  const card = xr(extra.ResultCard, { offer: { key: 'k', offerId: 'o', ownerKs: 'KS012', ownerName: 'A seller', kind: 'SERVICE', title: 'Plumbing', description: 'Fix leaks', priceMinor: null, currency: 'KES', priceLabel: null, availabilityState: 'AVAILABLE', availabilityLabel: 'Taking work', tone: 'open', quantity: null, place: 'Othaya', updatedAt: null }, onOpen: noop });
  assert.match(text(card), /KS012/);
  assert.deepEqual(lowContrastText(card), []);
  for (const offer of extra.demoOffers) {
    const detail = xr(extra.OfferDetail, { offer, onBack: noop, onInterested: noop, onUseThis: noop, onAskSecurePay: noop, onShare: noop, onViewStore: noop });
    assert.deepEqual(lowContrastText(detail), [], `offer ${offer.id}`);
  }
});

test('signed-out Community renders no low-contrast text (banner, home, store-offer cards)', async () => {
  const community = xr(extra.CommunityHome, { query: '', onQueryChange: noop, objects: extra.demoCommunityObjects, people: [], businesses: [], onOpenObject: noop, onOpenPerson: noop, onOpenBusiness: noop, onCreate: noop, onStartConversation: noop, onOpenCircles: noop, storeSearchStatus: 'ready' });
  assert.deepEqual(lowContrastText(community), []);
  for (const object of extra.demoCommunityObjects) assert.deepEqual(lowContrastText(xr(extra.CommunityObjectCard, { object, onClick: noop })), [], object.id);
  const src = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(src, /<p className="text-\[0\.78rem\] text-sand-600">A community of people choosing to trade fairly\.<\/p>/);
  // The signed-out prompt stays at full contrast. Phase 4 replaced the superseded invitation-only copy with
  // direct-Join truth (ADR-0021).
  assert.match(src, /<p className="text-\[0\.8rem\] text-forest-800">Sign in or join The Trust Project to take part in Community\.<\/p>/);
  assert.doesNotMatch(src, /invitation-based/);
  assert.match(src, /You’re not a member of The Trust Project yet\./);
});

test('Circle-level Join authority is untouched by the Phase 2 Join gate', async () => {
  const circle = await readFile('src/features/circle/CircleExperience.tsx', 'utf8');
  const community = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.equal(execFileSync('git', ['diff', 'cb6aa531cd4614a941c2e8b0707e190870c0975c', '--', 'src/components/CircleJoinFlow.tsx', 'src/features/circle/controller.ts'], { encoding: 'utf8' }), '');
  // Phase 4 changed the Community controller only to remove the one-tap Trust Project accept (it moved to the
  // Join page); every Circle method there is untouched.
  const communityDiff = execFileSync('git', ['diff', 'cb6aa531cd4614a941c2e8b0707e190870c0975c', '--', 'src/features/community/controller.ts'], { encoding: 'utf8' });
  for (const line of communityDiff.split('\n').filter(l => /^[+-][^+-]/.test(l))) assert.doesNotMatch(line, /[Cc]ircle/, line);
  assert.ok(circle.length > 0 && community.length > 0);
  assert.match(community, /REQUEST_TO_JOIN|requestToJoin|joinCircle/);
});

// ================================================================== Phase 2 public shell closure
const helpNav = { openAgreement: noop, openAgreementReviews: noop, openMoney: noop, askAgent: noop, recovery: noop, notifications: noop, account: noop, agreements: noop, money: noop, store: noop, community: noop };
const noGateway = { detail: async () => { throw new Error('no read expected'); }, list: async () => { throw new Error('no read expected'); }, status: async () => { throw new Error('no read expected'); } };
const renderHelp = (signedIn, inPublicShell) => {
  const help = extra.createElement(extra.SupportExperience, { ctx: null, signedIn, agreementGateway: noGateway, reviewGateway: noGateway, moneyGateway: noGateway, nav: helpNav, navigate: noop, onBack: noop });
  return extra.renderToStaticMarkup(inPublicShell ? extra.createElement(extra.PublicShellProvider, { value: actions }, help) : help);
};

test('signed-out Help renders the public navigation through the shared public shell', async () => {
  const markup = renderHelp(false, true);
  const out = text(markup);
  for (const label of ['How it works', 'The Trust Project', 'For Business', 'Sign in', 'Skip to KS001']) assert.match(out, new RegExp(label));
  for (const label of ['Agreements', 'Money', 'Account', 'Notifications']) assert.doesNotMatch(out, new RegExp(`\\b${label}\\b`), `${label} leaked into signed-out Help`);
  assert.match(markup, /data-public-nav/);
  assert.doesNotMatch(markup, /fixed bottom-0/, 'no signed-out bottom navigation');
  assert.match(out, /Help &amp; Support|Help & Support/);
  // Help does not choose a navigation itself: it always renders NavBar and never imports PublicNav.
  const src = strip(await readFile('src/features/support/SupportExperience.tsx', 'utf8'));
  assert.match(src, /navBar=\{nb\(\)\}/);
  assert.doesNotMatch(src, /PublicNav|usePublicShell/);
});

test('signed-in Help keeps the unchanged app navigation and its signed-in actions', () => {
  const out = text(renderHelp(true, false));
  for (const label of ['Home', 'Agreements', 'Money', 'Store', 'Community', 'Account']) assert.match(out, new RegExp(`\\b${label}\\b`));
  assert.doesNotMatch(out, /Skip to KS001|For Business/);
  for (const action of ['An Agreement', 'A formal review', 'Open notifications', 'Account &amp; security|Account & security']) assert.match(out, new RegExp(action));
});

test('Help speaks in present tense and claims no support capability', () => {
  for (const markup of [renderHelp(false, true), renderHelp(true, false)]) {
    const out = text(markup);
    assert.match(out, /Getting more help/);
    assert.match(out, /This Help page doesn’t create a support request or contact a person\. Use the options above, or ask KS001 for the next step\./);
    assert.doesNotMatch(out, /not yet available|not yet|coming soon|not ready|Talking to a person/i);
    assert.doesNotMatch(out, /ticket number|case number|support hours|live chat|call us|response time|escalat/i);
  }
});

test('the signed-out network-activity gate uses contextual sign-in copy on the shared SecureAuth', async () => {
  const src = strip(await readFile('src/features/circle/CircleExperience.tsx', 'utf8'));
  assert.match(src, /secureAuthView\(identityState, \{\s*title: 'Sign in to see your network activity',\s*reason: 'SecurePay needs to confirm who you are before showing your network activity\.',\s*\}\)/);
  assert.match(src, /createIdentityController\(auth, session\)/);
  assert.match(src, /<SecureAuthCard/);
  const view = extra.secureAuthView({ phase: 'credentials', busy: false, ksNumber: '', password: '', otp: '', challengeToken: null, error: null }, { title: 'Sign in to see your network activity', reason: 'SecurePay needs to confirm who you are before showing your network activity.' });
  assert.equal(view.title, 'Sign in to see your network activity');
  assert.doesNotMatch(view.title + view.reason, /review this/i);
  // Signed-in loading is unchanged: the self-scoped profile is (re)loaded only when the session is signed in.
  assert.match(src, /if \(sessionState\.status === 'signed-in'\) void controller\.load\(\);/);
});

// ================================================================== Agreement Support copy consistency
test('real Agreement Support speaks the same present-tense support doctrine as Help, at AA contrast', () => {
  const markup = xr(extra.AgreementSupport, { onAskAgent: noop, reviewPanel: extra.createElement('div', null, 'PANEL'), onOpenMoney: noop, onOpenHelp: noop });
  const out = text(markup);
  assert.match(out, /Need more help\?/);
  assert.match(out, /Nothing here creates a support request or contacts a person\. Use Help & Support for the available ways to inspect this Agreement, Money and formal Reviews, or ask KS001\./);
  assert.doesNotMatch(out, /not yet available|not yet|Coming soon|Request human support|under development|request submitted|ticket|case number|agent assigned|escalat|will contact you/i);
  for (const action of ['Ask KS001', 'Reviews & issues', 'Money', 'Help & Support']) assert.match(out, new RegExp(action));
  assert.match(markup, /<div class="text-\[0\.72rem\] text-sand-600">Nothing here creates a support request/);
  assert.deepEqual(lowContrastText(markup), [], 'no sand-400/500 text on the real Agreement Support card');
});

test('the "Coming soon" Agreement Support branch is fixture-only and unreachable in production', async () => {
  // Real path: the only production caller always passes reviewPanel, which selects the real branch.
  const workspace = await readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8');
  assert.match(workspace, /reviewPanel=\{<ReviewPanel /);
  const callers = execFileSync('git', ['grep', '-l', '<AgreementDetail\\b', '--', 'src'], { encoding: 'utf8' }).trim().split('\n').sort();
  assert.deepEqual(callers, ['src/App.tsx', 'src/features/workspace/WorkspaceExperience.tsx'], 'no other AgreementDetail caller');
  // src/App.tsx is the fixture App: loaded only in DEV fixture mode, and fixture mode throws in production.
  const runtime = await readFile('src/RuntimeApp.tsx', 'utf8');
  assert.match(runtime, /const FixtureApp = import\.meta\.env\.DEV && import\.meta\.env\.VITE_SECUREPAY_MODE === 'fixture'/);
  assert.match(await readFile('src/config/securepay.ts', 'utf8'), /if \(production && value === 'fixture'\) throw new Error\('Fixtures are disabled in production'\)/);
  // The fixture branch itself is intentionally unchanged (still pinned by ui-phase10).
  const fixture = text(xr(extra.AgreementSupport, { onAskAgent: noop }));
  assert.match(fixture, /Request human support/);
  assert.match(fixture, /Coming soon/);
});

test('Agreement Support gains no support authority', async () => {
  const src = strip(await readFile('src/components/AgreementSupport.tsx', 'utf8'));
  assert.doesNotMatch(src, /from '\.\.\/api|Gateway|fetch\(|http\.request|supportContext|SupportContext|ticket|escalat|localStorage|sessionStorage/i);
  // Phase 2 changed no API client. Phase 3 changes only the agent gateway (continuity + Link/Place), Phase 4
  // only the community gateway (Join / versioned Principles), and Phase 4B only the business gateway
  // (create / mine / representation, ADR-0022) -- never support.
  const changed = execFileSync('git', ['diff', '--name-only', 'cb6aa531cd4614a941c2e8b0707e190870c0975c', '--', 'src/api'], { encoding: 'utf8' }).trim();
  // Phase 4D adds Organization. Vision V1.4 later adds exactly the private visiondreams gateway.
  // Entry Perfection Phase 2 adds only an optional per-request timeout to the HTTP client (never support).
  for (const file of changed ? changed.split('\n') : []) assert.match(file, /^src\/api\/securepay\/http\/index\.ts$|^src\/api\/securepay\/(agent|community)\/|^src\/api\/securepay\/business\/index\.ts$|^src\/api\/securepay\/organization\/index\.ts$|^src\/api\/securepay\/visiondreams\/(dto|index)\.ts$|^src\/api\/securepay\/index\.ts$/,
    'only previously approved gateways plus the bounded private Vision Dream gateway may change after Phase 2');
  const registry = execFileSync('git', ['diff', '-U0', 'cb6aa531cd4614a941c2e8b0707e190870c0975c', '--', 'src/api/securepay/index.ts'], { encoding: 'utf8' })
    .split('\n').filter(line => /^[+-](?![+-])/.test(line));
  assert.ok(registry.every(line => line.startsWith('+') && /createOrganizationGateway|createVisionDreamGateway|visionDreams/.test(line)),
    'the gateway index gains only Organization and the bounded private Vision Dream gateway');
  assert.doesNotMatch(execFileSync('git', ['diff', 'cb6aa531cd4614a941c2e8b0707e190870c0975c', '--', 'src/api'], { encoding: 'utf8' }), /support|ticket|escalat/i);
});
