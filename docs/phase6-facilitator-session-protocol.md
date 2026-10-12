# SecurePay Phase 6 — Facilitator & Session Protocol

## Purpose

Test the product, not the participant.

Do not teach SecurePay before the task.

Use controlled pilot/test data rather than unnecessary production financial information.

## Opening script

> I want to see how this product makes sense to you. I'm testing the product, not you. Please use it the way you naturally would. I won't explain the interface unless you become completely stuck. Say out loud whatever you're thinking.

Do not explain:
- Agreements / Money / Vision / Store / Community / Skills architecture;
- KS001;
- internal workflow names;
- where buttons are.

## Assistance levels

**Level 1 — Unassisted:** give only the real-life intention.

**Level 2 — Natural hint:** use only neutral prompts such as:
- “What would you normally try?”
- “What do you think that means?”

**Level 3 — Rescue:** tell them how to proceed so later journey steps can still be observed. Mark the failed step as a human task failure.

## Questions at consequential boundaries

After an important action ask:

> What just happened?

Then:

> What do you think happens next?

Where relevant ask:

> Has anything been agreed yet?

> Has any money moved?

> Was there anywhere you were afraid to click?

## Observation record per step

Record:
- first correct action;
- time to first correct action;
- wrong turns;
- assistance level;
- hesitation: immediate / small pause / obvious uncertainty / stuck;
- participant's own explanation of current state;
- participant's expectation before pressing the primary action;
- truth comprehension after the action.

Do not ask “Do you like it?” before observing behavior.

## Session evidence template

Participant code:
Device:
Viewport:
Fresh first-time user: yes / no
Wave: 1 / 2 / 3
Consent for screen recording: yes / no

| Journey | First action | Time | Wrong turns | Assistance | Hesitation | Participant interpretation | Result |
|---|---|---:|---:|---|---|---|---|

### Truth checks
- Agreement currently agreed? Participant answer:
- Actual system truth:
- Money currently moved? Participant answer:
- Actual system truth:
- Invitation vs join distinction understood?:
- Evidence vs completion distinction understood?:
- Unknown state understood as unknown?:

### Fear points
| Screen/control | What participant feared | Actual consequence | Severity |
|---|---|---|---|

### Exact short quotes
Only real participant quotes, anonymised.

### Defects
| ID | Severity | Journey | Evidence | Reproducible? | Proposed smallest fix |
|---|---|---|---|---|---|

## Severity

**H0 — Truth / safety failure:** cannot remain unresolved.

**H1 — Task failure:** core task requires Rescue.

**H2 — Major confusion:** repeated important misunderstanding or substantial wrong turns.

**H3 — Friction:** hesitation, scroll, rereading, secondary hierarchy issue.

**H4 — Polish:** non-material aesthetic issue.

## Fix discipline

For every product change:
1. link to real human evidence;
2. identify journey/participant code;
3. make the smallest likely correction;
4. preserve backend authority;
5. add/update automated regression where practical;
6. re-test with a fresh human.

Do not redesign a whole surface from one person's preference.

## Mobile

Run meaningful tasks on:
- 320px-equivalent;
- 360px;
- 390px;
- ordinary Android phone where practical.

Watch for horizontal overflow, hidden primary action, keyboard-blocked composer, small tap targets, clipped Agreement, inaccessible Details.

## Privacy

Use participant codes instead of unnecessary names.

Do not commit private participant recordings, identifying screenshots, or sensitive research notes to the repository.

The repository may contain only safe aggregate results and anonymised short quotes.
