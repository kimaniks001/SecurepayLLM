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

test('UR-145: the Review-gate hint uses the server\'s own mustResolve description verbatim, never an invented copy', () => {
  assert.match(agentExperience, /state\.context\.data\.sufficiency\.mustResolve\[0\]\.description/);
});

test('UR-145: the hint only renders for the real sufficiency reason -- gated on the SAME busy/pending/handoff-idle conditions as the Review button itself, inverted for canReview', () => {
  const hintBlock = agentExperience.slice(
    agentExperience.indexOf('UR-145) -- "Review this" is correctly'),
    agentExperience.indexOf('UR-145) -- "Review this" is correctly') + 1200,
  );
  assert.match(hintBlock, /!state\.busy/);
  assert.match(hintBlock, /!state\.pending/);
  assert.match(hintBlock, /handoffState\.phase === 'idle'/);
  assert.match(hintBlock, /!state\.context\.data\.sufficiency\.canReview/);
  assert.match(hintBlock, /mustResolve\.length > 0/);
});

test('UR-145: the Review button\'s own disabling predicate is unchanged by this fix (still the real gate, never hard-coded true)', () => {
  assert.match(
    agentExperience,
    /disabled=\{!state\.conversationId \|\| state\.busy \|\| !!state\.pending \|\| handoffState\.phase !== 'idle'\s*\n\s*\|\| \(state\.context\.data\?\.sufficiency && !state\.context\.data\.sufficiency\.canReview\)\}/,
  );
});
