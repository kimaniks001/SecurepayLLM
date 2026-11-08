import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const human = read('src/features/living-workspace/HumanJourneysExperience.tsx');
const runtime = read('src/RuntimeApp.tsx');

test('human journey UI is restricted to a preview host and does not replace the live workspace', () => {
  assert.match(runtime, /human-journeys/);
  assert.match(runtime, /window\.location\.hostname\.endsWith\('\.vercel\.app'\)/);
  assert.match(runtime, /return <HumanJourneysExperience \/>/);
  assert.match(runtime, /if \(phase1Preview\) return <Phase1LivingWorkspacePreview/);
  assert.match(human, /No live AI, real Store publication, Agreement acceptance or Money movement/);
  assert.doesNotMatch(human, /\bgateway\.(?:submitTurn|saveBuild|createAgreement|fund|settle|release)\(/);
});

test('five independent human work examples keep drafts, sources, milestones and cart together', () => {
  for (const id of ["cctv","security-light","repairs","resident-project","busy-day"]) {
    assert.ok(human.includes("id: '"+id+"'") || human.includes("id:'"+id+"'"));
  }
  assert.match(human, /Record<WorkId,\s*Work>/);
  assert.match(human, /setWorks\(prev=>\(\{\.\.\.prev,\[id\]:change\(prev\[id\]\)\}\)\)/);
  assert.match(human, /update\(workId,w=>\(\{\.\.\.w,cart:items\}\)\)/);
  assert.match(human, /setWorkId\(id\);setMiddle\('chat'\)/);
  assert.match(human, /sessionStorage\.setItem\(STORAGE_KEY/);
  assert.match(human, /Nothing is uploaded or independently checked/);
});

test('Store stays in the existing tool-to-middle journey with no second checkout', () => {
  assert.match(human, /<CompactStoreBrowser/);
  assert.match(human, /<StoreMasterpieceLayoutReview/);
  assert.match(human, /data-store-expanded-middle/);
  assert.match(human, /setMiddle\('store'\)/);
  assert.match(human, /Back to KS001/);
  assert.match(human, /collectOffer\(current\.cart,offer,'agreement',true\)/);
  assert.match(human, /selectionToKs001\(current\.cart,'agreement'\)/);
  assert.match(human, /No bank, M-Pesa, escrow, quote, release, invitation or approval is connected/);
});

test('human-first sample asks material questions without inventing consent or Fair Trade certification', () => {
  for (const question of [
    'Where should the cameras be installed?',
    'What is the target amount',
    'If one contractor has a dispute',
    'Who must agree again',
  ]) assert.ok(human.includes(question));
  assert.match(human, /current\.deferred\.length>0/);
  assert.match(human, /deferred:\[\.\.\.w\.deferred,next\.field\]/);
  assert.match(human, /No milestone can be completed or approved in this preview/);
  assert.match(human, /Real findings must come from the canonical, evidence-bound SecurePay API/);
  assert.match(human, /role="status"/);
});

test('mobile tools and summary remain explicitly navigable around the middle KS001 conversation', () => {
  assert.match(human, /data-gate3-tools/);
  assert.match(human, /data-gate3-middle/);
  assert.match(human, /data-gate3-summary/);
  assert.match(human, /aria-label="Mobile workspace panels"/);
  assert.match(human, /data-workspace-frozen-layout/);
  assert.match(human, /sp-brand-conversation/);
  assert.match(human, /data-gate3-transcript/);
});


test('SecurePay Check opens with a compact glance and keeps depth on demand', () => {
  const right = human.slice(human.indexOf('<aside aria-label="SecurePay Check"'), human.indexOf('</aside>', human.indexOf('<aside aria-label="SecurePay Check"')));
  assert.match(right, /data-gate3-glance-first/);
  assert.match(right, /At a glance/);
  assert.match(right, /mentioned\.slice\(0,2\)/);
  assert.match(right, /<span[^>]*>Next:<\/span>|<span className="font-semibold text-forest-800">Next:<\/span>/);
  assert.doesNotMatch(right, /Your running summary|What.s being planned|Money follows the Agreement/);
  assert.match(right, /data-gate3-more-details/);
  assert.match(right, /data-gate3-milestone-row/);
  assert.match(right, /data-gate3-compact-cart/);
  assert.match(right, /data-gate3-compact-fair-trade/);
  assert.match(right, /data-gate3-compact-money/);
});

test('collapsing the glance does not remove editing, honest statuses or user-initiated KS001 discussion', () => {
  assert.match(human, /editMilestone\(m\.id,field,e\.target\.value\)/);
  assert.match(human, /setCart\(updateSelectedQuantity\(current\.cart,item\.key,item\.quantity\+1\)\)/);
  assert.match(human, /setCart\(removeSelected\(current\.cart,item\.key\)\)/);
  assert.match(human, /onClick=\{discussCart\}/);
  assert.match(human, /Not checked/);
  assert.match(human, /Not funded/);
  assert.match(human, /Example only · No Agreement saved/);
  assert.match(human, /No milestone can be completed or approved in this preview/);
});


const minutes = read('src/features/living-workspace/MinutesToAgreementPreview.tsx');

test('fictional meeting minutes become THREE distinct drafts with source-labelled gaps', () => {
  assert.match(minutes, /SAMPLE_MINUTES_LABEL/);
  for (const work of ['security-light','repairs','resident-project']) {
    assert.match(minutes,new RegExp("workId: '"+work+"'"));
  }
  assert.match(minutes, /data-gate3-minutes-tool/);
  assert.match(minutes, /data-gate3-prepare-separate-drafts/);
  assert.match(human,/minutesReview:makeMinuteReview\(decision\.workId\)/);
  assert.match(human,/if\(existing\.minutesReview\)return/);
  assert.match(human,/sources:\[\.\.\.existing\.sources,\{id:100000\+index,kind:'document'/);
  assert.match(minutes, /Scripted example · no AI reading/);
  assert.match(minutes, /does not read its contents/);
});

test('orange WWWWWH gaps can be rectified without turning proposals into accepted facts', () => {
  for(const key of ['who','what','where','when','why','how']) {
    assert.match(minutes,new RegExp("key:'"+key+"'"));
  }
  assert.match(minutes,/openMinutePoints=\(review:MinuteReview\)/);
  assert.match(minutes,/!point\.fromMinutes && !review\.corrections\[point\.key\]\?\.trim\(\)/);
  assert.match(minutes,/data-gate3-orange-count/);
  assert.match(minutes,/data-gate3-clarify-point/);
  assert.match(minutes,/data-gate3-wwwwwh-full/);
  assert.match(minutes,/onPropose\(point\.key,answer\)/);
  assert.match(human,/minutesReview:\{\.\.\.w\.minutesReview,corrections:/);
  assert.match(human,/not a committee decision or a signed term/);
  assert.match(minutes,/None has been accepted by the other parties/);
  assert.match(minutes,/Not formally examined/);
});

test('clarification-to-KS001 is an unsent human message, not a committed change', () => {
  assert.match(human,/draftFromMinutes:true/);
  assert.match(human,/draft:'The sample minutes leave this unclear:/);
  assert.match(human,/appendConversation\(current\.draft,current\.draftFromStore,current\.draftFromMinutes\)/);
  assert.match(human,/fromStore\|\|fromMinutes\|\|!prompt/);
  assert.match(human,/Your message is still unsent/);
  assert.match(human,/Do not treat it as agreed/);
  assert.match(human,/onPropose=\{proposeMinutes\} onAsk=\{askMinutes\}/);
  assert.doesNotMatch(minutes, /\bfetch\(|\.send\(|\bgateway\.[a-zA-Z_$][\w$]*\(|createAgreement\(/);
});
