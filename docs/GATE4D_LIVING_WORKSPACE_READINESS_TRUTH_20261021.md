# SecurePay Gate 4D — Living Workspace readiness truth (21 October 2026)

## Review finding

The approved three-column Living Workspace already renders KS001, Formation and an owner-scoped Fair Trade reading. Its right-hand panel previously displayed cached `state.data` **even when `state.status='error'`** after a failed refresh. The adjacent warning did not erase the stale facts, allowing an old Agreement version to appear current.

The existing summary also gave only the ambiguous single line `Working draft · Not yet accepted`, while the separate Fair Trade and authority explanations were buried in collapsed details.

## Surgical correction (no redesign)

- `LiveWorkResultPanel` displays an Agreement only when the canonical Formation controller says **ready**, the read had no error and the conversation ID matches.
- Replaces the single draft status line with four compact, read-only indications: **Draft**, **Fair Trade**, **Parties**, **Money**. The existing three-column design, chat, summary table, tool shelf and Agreement/KS001 controllers are preserved.
- Draft: `Still forming`, `Available to inspect` or `Sources still being read`, always from the server's Formation version and `readingSources`.
- Fair Trade: shows **Partial examination** or **Concern needs attention** only with `PARTIAL_ADVISORY` from the same conversation ID and exact Trade Context version. Mismatch/loading/unavailable values never appear as current findings.
- Parties: **Acceptance not shown**. Money: **Not authorised here**. No creation of financial/party authority. This panel is a draft preview, not an acceptance or payment domain.
- Existing canonical next question and Fair Trade advisory order remain unchanged, including the one-question behavior; no fixed 12-question script or invented compliance score.

## Tests and proof

- Actual TS projection unit tests: exact-version/current-conversation match, material concern, loading/stale/unavailable state, source-reading override, four distinct stages without approval/release language.
- Static UI regression: no stale terms after failed load, original Fair Trade/summary/question/readiness sections remain and no new authority/network/storage controller introduced.
- Existing Phase 7 and Phase 2 tests plus `typecheck`, `lint`, `build` are in the Gate 4D workflow.

## Explicit status and boundaries

This is **frontend source quality**, not a live model evaluation or proof that any Fair Trade principle has passed. The Gate 4C API remains a separate draft, and Paul's protected staging environment has no deployment as of inspection. The UI preview's protected staging routing in parent UI #156 is unchanged; no Vercel environment variable, deployment, Money rail, real KS identity, merge or production configuration was changed.

Only the user/owner can approve merges or rollout after integrated human certification.

**Status: draft Gate 4D UI implementation; CI required.**
