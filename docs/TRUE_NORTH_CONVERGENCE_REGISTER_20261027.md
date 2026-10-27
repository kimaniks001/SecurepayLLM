# True North — Workspace convergence register
27 October 2026 | Draft integration branch | Production unchanged

## Authority
The canonical governing specification is in SecurePayAPI:
`docs/TRUE_NORTH_HUMAN_EXPERIENCE_CONTRACT_20261027.md`.
The three-column Living Workspace is **frozen**. This is convergence, not redesign.

## Day 2 observation → correction → verification
| Finding | Human consequence | Implemented in this branch | Proof still required |
|---|---|---|---|
| D2-01 / D2-07 | User asks for delivery or home works; KS001 asks unrelated price or assumes work scope | API companion branch revises narrow deterministic price/scope conditions and open-decision reply | Live-model journey proving contextual question order and contract maturity |
| D2-06 | Acknowledgement and bold next question appear in different UI locations | Next server-owned question now renders in the latest KS001 reply; detached panel removed | Browser replay, mobile/desktop, real API question/version reconciliation |
| D2-08 | PDF extraction fails with photo-specific recovery language | File-type-aware upload and retry language | Real PDF extraction tracing, retention, source status, retry identity, and graceful alternative entry |

## Remaining required engineering packages — not implemented by these initial commits
1. Canonical intention and material-understanding projection: service vs goods, scope, obligations, risks and relevant Fair Trade consideration, with human judgments over ten scenarios.
2. Distinguish draft inspectability, meaningful review and participant acceptance without creating duplicate Agreement authority. A rejected/open item must remain visible, versioned and not accepted.
3. Source understanding: PDF/DOCX/XLSX parsing with strict privacy, sanitisation and consent; summaries distinguish decisions, proposals, conflict, stale source and unknown.
4. Personal action plan: structured current objective, established facts, decisions, options, verified local opportunities, stakeholder contact options, one next step; use existing permissioned stores/identity/Agreements and preserve provenance.
5. Mode fluency: concise My Work and expansive Vision using one KS001 provider/controller; intentional handoff from Vision sources to practical work.
6. Locality: genuine offers and rates only, with freshness, location context, availability, KS identity and privacy boundaries. Never fabricate an actual match.
7. Full lifecycle: print/share SecureLink, explicit acceptance, provider sandbox funding, obligation evidence, review and settlement with user-visible status and a reversible/error-safe path.

## Certification
Run API / UI exact-commit source tests first, then isolated real-model and browser journeys with recordings. Human reviewer scores: intent understood, useful new insight, economy of language, correct unanswered obligations, tangible next action, honest local verification. Each scenario reports PASS, FAIL or NOT VERIFIED; no static test or merged code equals live certification. Keep media/money provider flags OFF until separate operational gates pass.

## Release
Draft branches and PRs only. Do not merge, deploy, enable media, submit live funds, create real identities or disturb production on the strength of this register.
