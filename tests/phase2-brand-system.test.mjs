import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('src/index.css');
const title=read('src/features/brand/SignatureAgreementTitle.tsx');
const live=read('src/features/living-workspace/LiveWorkResultPanel.tsx');
const demo=read('src/features/living-workspace/LivingAgreementPanel.tsx');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const home=read('src/components/SignedInHome.tsx');
const publicHome=read('src/components/SignedOutHome.tsx');
const money=read('src/features/living-workspace/UnifiedMoneyTool.tsx');
const quick=read('src/features/living-workspace/QuickSupportPanel.tsx');
const visions=read('src/features/living-workspace/LivingVisionPanel.tsx');
const circles=read('src/features/living-workspace/LivingCirclePanel.tsx');
const community=read('src/features/living-workspace/LivingCommunityPanel.tsx');
const trust=read('src/features/trust/TrustProjectWelcome.tsx');
const moneyHome=read('src/components/MoneyHome.tsx');

test('signature typography and palette share one scoped semantic design language',()=>{
 assert.match(css,/family=Afacad\+Flux/);
 assert.match(css,/family=Bricolage\+Grotesque/);
 assert.match(css,/family=Uncial\+Antiqua/);
 for(const color of ['#244936','#8bb89b','#faf7f0','#ef9537']) assert.ok(css.toLowerCase().includes(color),color);
 assert.match(css,/\.sp-brand-shell,/);
 assert.match(css,/\.sp-brand-home,/);
 assert.match(css,/\.sp-brand-public/);
 assert.match(css,/\.sp-brand-nav \[aria-current="page"\]/);
 assert.match(css,/focus-visible/);
});

test('calligraphic initial is dynamic, readable, plain for non-letter titles',()=>{
 assert.match(title,/export function SignatureAgreementTitle/);
 assert.match(title,/Array\.from\(clean\)/);
 assert.match(title,/\^\\p\{L\}/);
 assert.match(title,/if \(!eligible\) return/);
 assert.match(title,/className="sr-only"\>\{clean\}/);
 assert.match(title,/aria-hidden="true" className="sp-initial-letter"/);
 assert.match(css,/\.sp-initial-letter \{/);
 assert.match(live,/<SignatureAgreementTitle title=\{customTitle\.trim\(\)\|\|humanTitle\(formation\?\.summary\)\}/);
 assert.match(demo,/<SignatureAgreementTitle title="Chair delivery"/);
 assert.doesNotMatch(title,/\.png|\.jpg|backgroundImage/);
});

test('Home and Workspace share signature without changing canonical logo',()=>{
 assert.match(home,/sp-brand-home sp-life-canvas/);
 assert.match(publicHome,/sp-brand-public w-full/);
 assert.match(shell,/sp-type-signature sp-brand-shell/);
 assert.match(shell,/data-sp-area=\{mode\}/);
 assert.match(shell,/sp-brand-header/);
 assert.match(shell,/sp-brand-nav/);
 assert.match(shell,/sp-brand-conversation/);
 assert.match(shell,/sp-brand-result/);
 assert.match(shell,/securepayWordmark/);
 assert.match(publicHome,/securepayMark/);
 assert.match(home,/securepayMark/);
});

test('each major area gains a distinct restrained identity without new features',()=>{
 assert.match(money,/className="sp-brand-money/);
 assert.match(money,/data-money-figure/);
 assert.match(quick,/className="sp-brand-quick-assist/);
 assert.match(visions,/className="sp-brand-vision/);
 assert.match(circles,/className="sp-brand-circle/);
 assert.match(community,/className="sp-brand-community/);
 for(const mode of ['vision','circle','community']) assert.ok(css.includes('data-sp-area="'+mode+'"'));
});

test('printed agreements remain clear and no Store gallery code is changed by this test',()=>{
 assert.match(css,/\[data-agreement-print\]/);
 assert.match(css,/@media print/);
 assert.match(css,/font-variant-numeric: tabular-nums/);
 assert.match(css,/font-variant-numeric: tabular-nums lining-nums/);
 assert.match(css,/prefers-reduced-motion: reduce/);
 assert.match(css,/@media \(max-width: 420px\)/);
 assert.doesNotMatch(title,/dangerouslySetInnerHTML/);
});

test('visual changes do not claim an Agreement is accepted or make demo real',()=>{
 assert.match(demo,/A working illustration/);
 assert.match(demo,/ready = false/);
 assert.match(live,/Working draft · Not yet accepted/);
 assert.match(shell,/DEMO ACCOUNT · NO REAL ACCESS/);
 assert.match(shell,/Visual shell: the preview does not authorise financial/);
});

test('legacy Money and the two-door Trust Project share typography without changing routing',()=>{
 assert.match(moneyHome,/sp-brand-home sp-brand-money-home/);
 assert.match(trust,/data-trust-project-door className="sp-brand-trust/);
 assert.match(trust,/onGoSecurePay/);
 assert.match(css,/\.sp-brand-trust \{/);
 assert.match(css,/\.sp-brand-money-home \{/);
});
