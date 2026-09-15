# Codex Task — SecurePay Brand + Visual Constitution Pass

Work only on branch `feat/brand-visual-constitution`.

Read first:

- `AGENTS.md`
- `docs/GOLDEN_SPINE_COMPATIBILITY_AUDIT.md`
- `docs/PRODUCTION_MIGRATION_LEDGER.md`
- locked Bolt reference tag `bolt-reference-pass11`

This pass happens after Golden Spine B and before Slice C.

## Why this pass exists

The locked Bolt build is the experience baseline, but two explicit human-approved corrections now supersede Bolt where they differ:

1. the Bolt logo/mark is not the canonical SecurePay logo;
2. discovery surfaces may use a richer but controlled brand palette while preserving Quiet Trust and the consequence curve.

Also, real-mode Agent discovery currently uses a generic `DISCOVERY` row card. Where the backend payload maps cleanly to existing Bolt provider/price/store visual components, restore the richer Bolt presentation instead of leaving a developer-like generic table/card.

## Source-of-truth rule

From this point:

> Bolt is the visual baseline, subject to explicitly approved SecurePay brand corrections and later locked design extensions.

SecurePayAPI remains authority for protected state. This PR must not change backend semantics or consequential authority.

## Canonical logo

First inventory repository assets and any explicitly supplied canonical SecurePay logo asset.

- Do not redraw, approximate, trace, generate, or invent the logo.
- Do not use the Bolt placeholder/incorrect logo once a canonical asset is available.
- Centralize the canonical brand mark behind one reusable component/API so later pages do not hand-roll variants.
- Support appropriate full-wordmark / compact-mark variants only if those variants actually exist in the supplied canonical asset set.
- Preserve correct aspect ratio and clear space.

If no canonical logo asset exists in the repository or supplied working files, do not invent one. Complete every other unblocked item and report `CANONICAL_LOGO_ASSET_REQUIRED` as the only brand blocker.

## Colour doctrine

Keep the existing Quiet Trust DNA:

- cream / warm neutral remains the main canvas;
- forest green remains the trust anchor;
- orange/ember remains a living/action accent;
- richer colour is allowed in discovery/Agent/Store/Community/Circles;
- Agreement becomes calmer;
- Identity/auth is deliberate and quiet;
- Money is the most minimal and precise surface.

Do not create a rainbow UI, high-saturation SaaS dashboard, gamified palette, or a second design system.

Formalize reusable tokens for at least:

- canvas / elevated canvas;
- forest/trust;
- ember/orange accent;
- muted sand/text;
- success/confirmed;
- candidate/considering;
- warning/error;
- subtle discovery tint surfaces.

Use semantic tokens where practical rather than page-specific hard-coded colours.

## Real-mode visual fidelity

Golden Spine B must continue to look like the locked experience.

Inspect real-mode:

- signed-out Home;
- conversation workspace;
- Agent state/typing;
- right-side workbench/context panel;
- mobile understanding drawer;
- Agreement preview;
- provider results;
- provider profile/comparison;
- price context;
- Store listing/result cards where currently returned by Agent discovery.

### Discovery component correction

Current Slice B generic `DISCOVERY` rendering is acceptable as a temporary transport proof but is not the final visual target.

Where backend fields are sufficient, map real Agent components onto existing Bolt visual components such as:

- `ProviderCard`
- `PriceContextCard`
- existing Store/product/listing cards
- existing provider comparison/profile composition

Use presentation adapters. Never invent missing ratings, ranking, stars, prices, availability, seller status, qualification, selection, or provenance.

If backend data is insufficient for an existing Bolt card, preserve truthful data in the closest Quiet Trust composition without exposing raw object keys as a developer/debug surface.

No `providerCount`, `sourceType`, raw camelCase field names, opaque IDs, or internal enum labels should be presented to ordinary users unless they are deliberately user-facing product language.

## Trade Context correction

Keep CANDIDATE / CONFIRMED / unknown state truthful, but present it as human-readable SecurePay understanding rather than a backend graph inspector.

- preserve provenance;
- translate safe known labels to normal language;
- never hide uncertainty;
- never convert unknown to confirmed;
- never turn provenance into authority;
- `Use this` remains explicit and only for adoptable candidates.

Internal IDs may remain available for code/tests but should not become primary visible copy.

## Existing visual structure

Do not redesign navigation, page hierarchy, journey order, interaction choreography, or responsive structure in this pass.

Do not touch Agreement handoff/auth progression; that is Slice C.

Do not start Store/Community/Circles production wiring.

## Design Extension Protocol

Add this as a permanent repository rule for future surfaces not present in Bolt:

1. start with the user's job, not a page name;
2. reuse SecurePay shell, typography, spacing, card language, Agent behavior, mobile treatment and consequence curve;
3. identify backend authority before adding consequential UI;
4. make a visual/static composition first;
5. review it against the SecurePay visual constitution;
6. lock the experience;
7. then wire real APIs;
8. stop for product/doctrine questions rather than inventing authority.

Update `AGENTS.md` accordingly.

## Visual acceptance

Capture and compare at minimum:

Desktop:
- signed-out Home;
- first conversation turn;
- discovery result state;
- Trade Context with candidate;
- Trade Context after confirmed/adopted state.

Mobile (390px or equivalent):
- signed-out Home;
- conversation;
- understanding drawer/candidate;
- discovery card.

Acceptance criteria:

- recognizably the same SecurePay/Bolt product;
- canonical logo where available;
- richer colour without visual noise;
- no generic SaaS dashboard feel;
- no raw-debug presentation;
- desktop/mobile remain first-class;
- Agreement/Identity/Money restraint doctrine remains documented and unbroken.

## Tests / validation

Run:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run test:agent`
- `npm run test:foundation`
- `npm run build`
- `git diff --check`
- browser visual verification desktop/mobile

Add focused tests for any adapter changes, especially to prove missing backend fields are not invented.

## PR

Open against `feat/production-foundation`.

Suggested title:

`Brand pass: canonical SecurePay visual constitution`

Report:

- canonical logo source used, or explicit missing-asset blocker;
- token changes;
- real-mode discovery fidelity changes;
- Trade Context presentation changes;
- desktop/mobile visual evidence;
- exact files/components changed;
- validation results;
- any retained visual debt.

Do not start Slice C in this PR.