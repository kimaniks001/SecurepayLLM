import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

// KS001 Upgrade Phase 5 continuation (Slice 3, UR-145) -- root-cause verification.
//
// Live testing (real backend, real browser, two genuinely signed-up KS Numbers) proved the exact
// disabling predicate: "Review this" was correctly disabled because the conversation's own WHAT fact
// remained a server-side CANDIDATE ("Suggested") -- AgreementSufficiencyEvaluator's own NO_SCOPE
// blocking matter -- until the person's own explicit "Use this" confirmed it. Clicking "Use this"
// immediately cleared NO_SCOPE and enabled Review, which then correctly reached the canonical
// Agreement review, SET, and the real post-SET continuation. This gate is legitimate, not a defect
// (see mandate Section 7): the fix here is the UX-clarity improvement Section 7 itself calls for,
// naming the exact real reason instead of leaving the button silently disabled.
//
// Matches this codebase's own established convention for AgentExperience.tsx -- a large, deeply
// integrated component tested via source inspection (see tests/pr11-review-closure.test.mjs) rather
// than full isolated rendering.
const agentExperience = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');

test('UR-145: no diagnostic instrumentation was left in the shipped component', () => {
  assert.doesNotMatch(agentExperience, /UR145/);
  assert.doesNotMatch(agentExperience, /console\.log/);
});

// Entry Perfection Phase 6 -- DELIBERATELY RESTATED: Review is gated by the server-owned agreement-formation projection
// (reviewable / reviewBlockedReason), which replaced fact-by-fact "Use this" gating (UR-239). Same intent: a server-owned gate,
// the server's own words for why, never hard-coded.
test('UR-145: the Review-gate hint uses the server\'s own reason verbatim, never an invented copy', () => {
  assert.match(agentExperience, /formationState\.data\.reviewBlockedReason\}/);
  assert.doesNotMatch(agentExperience, /Confirm it above with “Use this” first/);
});

test('UR-145: the hint only renders for the real server reason, while nothing is busy, and only while Review is not available', () => {
  const hintBlock = agentExperience.slice(agentExperience.indexOf('DELIBERATELY RESTATED: the old hint'), agentExperience.indexOf('DELIBERATELY RESTATED: the old hint') + 900);
  assert.match(hintBlock, /!state\.busy/);
  assert.match(hintBlock, /!state\.pending/);
  assert.match(hintBlock, /!formationState\.data\.reviewable/);
  assert.match(hintBlock, /formationState\.data\.reviewBlockedReason/);
});

test('UR-145: the Review button\'s disabling predicate is the real server gate (never hard-coded true)', () => {
  assert.match(agentExperience, /disabled=\{!state\.conversationId \|\| state\.busy \|\| !!state\.pending \|\| !formationState\.data\?\.reviewable\}/);
});
