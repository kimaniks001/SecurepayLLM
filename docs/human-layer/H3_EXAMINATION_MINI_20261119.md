# Mini H3 — Verified Agreement examination continuation

**19 November 2026 · Draft / Mini review only.**

- In the **actual authenticated Mini Help** flow, `Need a hand?` uses the shared core triage. When a fresh, exact-version Agreement is available, the person may press **Examine the real Agreement**.
- The client calls the core's new `POST /api/v1/human-layer/help/examine` through the existing authenticated SecurePay API and session refresh. The original Agreement and version are checked on the server; Mini never supplies a caller identity or role.
- A successful read shows source-grounded Agreement facts and current formal-review *states*, distinctly from both parties' unverified positions, unexamined evidence, and voluntary next steps.
- Source ID and current version in the response must match the request or the facts are withheld. An unavailable server or stale version produces a truthful error instead of simulated proof.
- The dedicated phone-first Mini **H3 design review** stays at `#/preview/mini/h3`. The user may inspect an example of facts versus claims, but it is a LOCAL SAMPLE, not a real Agreement investigation, Plug assignment, Money operation, live KS001 assessment or human conversation.

**H2 remains under `#/preview/mini/h2`. Living Workspace is separate and never auto-substituted for Mini.**

**Still required:** authentic bilateral party-position and evidence reads with permissions, provenance and challenge, KS001's real assessment with uncertainty, actual A/B/C account tests, full backend compilation/DB suites, a real backend preview deployment, and a final human usability pass. No production deployment or real adjudication.
