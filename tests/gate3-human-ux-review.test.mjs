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
