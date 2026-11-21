# SecurePay Mini — approved Companion Phase 5 integration

Owner-approved prototype: 21 November 2026 (subtle Proudly.ke footer variant).

## Source of truth and scope
- Product reference: SecurePay Mini Companion Phase 5 Final Review — Subtle Proudly.ke HTML prototype.
- Implementation base: native Mini Human H4E branch `feat/mini-human-h4e-usability-certification-20261119`.
- Visual and language adoption pass, not replacement of the real Buy, Sell, Pay, Collect, KS001, SecureLink, Agreement, Store or Money implementations.
- Main currently lacks the full src/mini implementation; this PR targets H4E, not main directly.

## Adopted
- Humanist Cabin typographic treatment with system fallbacks; restrained green, ivory and orange identity.
- Official SecurePay mark identifies KS001, not a generic AI sparkle.
- Distinct, consistent Lucide icons for four Mini trading entrances.
- Existing trading routes retain original components, service boundaries and API gateways.
- Quiet interaction and selected-answer-pills treatment; accessible keyboard focus.
- Compact 'Explore with your AI' beside the other help choices.
- Independent public AI learning guide with practical personal examples, explicit uncertainties, private clipboard interaction and no network send.
- Very small photographic Proudly.ke bracelet integrated into the original footer.
- Do not transplant prototype's fictional transactions or payment examples into production.

## Validation gates before main/production
1. Run `node --test tests/mini-companion-phase5.test.mjs`.
2. Run `npm run typecheck`, `npm run build` and existing Mini/human certification tests.
3. Browser check English/Kiswahili at 375, 390 and 430 px, focus, Escape, clipboard fallback and reduced motion.
4. Review Buy, Sell, Pay, Collect, KS001, human help, canonical Agreement review, SecureLink, Store checkout and deep links; verify existing authority and payment gates.
5. Confirm device-specific staging routing and rollback. Do not switch production domains, resume the paused Vercel alias, alter payments or change deployment routing in this PR.
6. Coordinate broader Mini branch integration and release authorization separately.

## Rollback
Revert this PR. Styling is scoped to .spm-companion, AI guide is self-contained and canonical data/financial operations are unchanged.