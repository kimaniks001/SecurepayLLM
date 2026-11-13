# P0 — Storage: recovered owner preview, hosted KS001 boundary and next integration gates

**13 November 2026. Isolated code candidate. No Vercel deployment, provider integration or real transaction performed.**

## Existing Storage source discovery

The user already has a Vercel project:
- **Project:** `storage-ke-owner-preview` (Vercel project ID `prj_Vjzf8J31nLPdEyrnCd4RRrzZN6x7`)
- **Owner preview deployment:** `dpl_7VHsNdHh3J18Nf6v3BTyzaSpTDFc` (`READY` from Vercel's deployment metadata)
- **Owner preview URL:** `https://storage-ke-owner-preview-james-8078.vercel.app`
- Vercel source file tree lists `src/index.html` and `src/vercel.json` for this API/CLI-uploaded deployment; latest deployment metadata does not show a linked Git repository or Git SHA.
- The preview HTML starts with `Storage — Make room for what matters`; description states that it discovers garages and warehouse bays across Kenya with **demo inventory**.
- The available Vercel file-content response was truncated before the full HTML could be obtained. **Do not infer or recreate the rest of the page, or claim source parity with a nonexistent GitHub Storage repo.** No dedicated Storage GitHub app source was located among the accessible owner repos.
- The deployed preview is `target=production` *as a Vercel deployment label* even though the application describes itself as an owner demo; this is not an approved SecurePay production backend, published verified storage supply or paid booking application.

## Code created without modifying the Storage preview

**SecurePayLLM**: `feat/p0-mini-ks001-governed-onion-20261113`

- `public/embed/storage-host-ks001.js` — opt-in, compact, Shadow DOM Storage launcher delivered as a reusable host adapter. **Not installed** into the owner preview; requires an explicit Storage source edit after ownership/version control is established.
- `public/embed/storage-mini.html` — protected SecurePay-hosted guest iframe using the existing `/embed/securepay-guest-agent.js` and `/embed/securepay-embed.js`, not a separate assistant engine. It exposes the same backend-owned, descriptive-only capability catalogue on human request.
- `tests/mini-p0-storage-hosted-frame.test.mjs` — source checks for origin restrictions, guest scope, no money tools, no source-data leakage, and explicit human Send.
- Four entry intentions: Find storage, Offer space, Collect my items, Extend storage. They are human-authored question prompts only; **not reservations, verified offers, inventory, custody records or actual payment charges**.

## Security and behaviour

1. Host adapter does not mount automatically. It rejects every host except a specifically known owner preview origin, and additionally requires staging/owner/credential-isolation approval and an exact operator-approved `approvedHostOrigin`. No browser secret, KS Number, private inventory, price, condition record, garage access key, GPS, or payment state is read.
2. The SecurePay iframe **independently denies every parent by default**: `APPROVED_PARENTS=Object.freeze([])`. A Vercel deployment's existence is not operator permission to embed it.
3. To activate later, first place Storage source under controlled version history and confirm the exact correct deployment SHA and target. Then approve parent origin, registered site `storage-ke-preview`, exact SecurePay iframe Origin, server-delivered `Content-Security-Policy: frame-ancestors <approved parent>`, sandbox API/model/turn limits and a controlled rollback.
4. Host passes only a short **visible user-edited** message via `postMessage` to the exact SecurePay-origin iframe after handshake. SecurePay **prefills**, never auto-sends. Conversation token and authenticated continuation remain in SecurePay; no Storage session is invented.
5. The iframe is deliberately retained while the panel is hidden and when READY arrives, so ordinary UI changes do not destroy an existing guest conversation. Explicit topic change or destroy closes the iframe.
6. Guest API route `/api/v1/public/embed/installations/{siteId}/conversations/{conversationId}/capabilities` exists only on the **unmerged** `SecurePayAPI@feat/p0-guest-ks001-capabilities-20261113` branch, which depends on historical Day 6 embed API baseline. Standalone Mini's first-party catalogue lives on a separate current-main descendant. Reconcile these backend branches before any connected staging.
7. No standalone Storage source-to-trade API exists here: host-owned authoritative space listings, physical measurements, insurance/liability constraints, access controls, item condition, inbound/outbound custody evidence and verified payment quotes are **P1 and later**; never simulate them as certified.

## Focused verification

- P0 source smoke checks: evaluate host adapter syntax with an isolated browser-like global and verify exact origins, consent flags, and empty iframe allowlist. **Performed in connector code-mode**, not a production browser E2E test.
- Full ESM Node test and browser/manual staging acceptance remain **not executed**. Node test: `node --test tests/mini-p0-storage-hosted-frame.test.mjs` once source is available in a checkout.
- First live Staging approval tests: no host auto injection; wrong parent, wrong site, wrong frame Origin, expired site, forged READY, nonregistered provider, copied conversation token and unapproved money requests all fail closed.
- One approved human journey: find garage or warehouse space → ask KS001 → review sourced offer and terms → if desired explicitly prepare Agreement review → continue in SecurePay with identity confirmation; no payment until authorised backend/provider integration.

## Planned actual Storage-source integration

**Do not edit the Vercel owner preview directly without its complete source.** Recover the original `src/index.html` and deployment configuration into its own maintained Git repository/branch or identify the prior source workspace. Then pin and install the host adapter by an explicit Storage code change. This is required to represent Ask KS001 on the Storage preview itself; a SecurePay-side plugin alone does not do so.

## Roadmap preservation

Storage P0 adds a guarded integration candidate but no new public launch or new charge. The existing SecurePay Gate 8–11 priorities remain unchanged, including provider callbacks, measured work and real evidence, the 20-user acceptance cohort and production certification.
