# UI Completion — Phase 7 Slice 5B: The Trust Project Convergence

**Status:** draft PR, UI only. **API: no changes required after archaeology.** Nothing merged or deployed.
**Baseline:** SecurePayAPI `main` @ `faa83a32`, SecurepayLLM `main` @ `d3d2001d` (both verified).

## What this is

**Current architectural decision.** The Trust Project is the community and shared-capability layer around SecurePay. It is **not** a separate product surface: there is no nav item, dashboard, route, second Home, second identity or second membership number.

- **Signed-out / landing Home:** a lower-page "About / why this exists" section (`components/TrustProjectSection.tsx`). It renders **after** the untouched `SignedOutHome` inside `AgentExperience`'s Home branch. `SignedOutHome` is byte-pinned by `tests/agent.test.mjs` and is not modified. The first viewport stays SecurePay / KS001; the section starts about 1,250px down on desktop and about 1,280px down at 375px wide.
- **Signed-in Home** (`WorkspaceExperience` → `SignedInHome`): a *compact* doorway through a new optional `belowHome` slot. When the slot is omitted, the markup is unchanged, and the Bolt fixture tests still pass. The full explanation is one tap away ("What The Trust Project is").

## Content (every capability named is real on current main)

- **Proposition:** "Shared fair-trade technologies, systems and people."
- **Technologies:** SecurePay/KS001, Store, SecureLinks, Community. For businesses and builders, the existing Account → Developer / Connect (API credentials, webhooks), which is managed by the owning Business KS identity. No new route or action was added.
- **Systems:** the 12 Principles (reused from the canonical `FairTradePrinciplesPanel`, never rewritten) turned into methods: agreements, amendments everyone agrees to, evidence, honest uncertainty.
- **People:** Community LIVE and Circles. "Belonging is not a certificate that someone is trustworthy."
- **Why join:** access to shared technologies, systems and people, while you stay independent. "Use what helps you. Contribute what you know."
- **"Members belong. Plugs connect. Masters know."** These are equal cards and not ranks.
  - **Plug:** the existing `agreement-plug-share-10pct-v1` rule only. "Inviting someone to join is not an introduction and earns nothing."
  - **Master:** paid work is agreed separately. "Being a Master does not decide agreements, disputes or money."
- **Store:** "Your KS identity gives you a digital Store while your SecurePay identity is active. It can start empty … A Store is not an endorsement." The Store comes from the active KS identity; membership does not provision it (see the Store finding below).
- **Learn and adapt together:** "members can learn, test and adapt together". "The Skills Institute, for structured training and practice, is not open yet." Locked Phase 11D doctrine keeps TRAINING / SKILLS_INSTITUTE / SKILLS_FUND out of the capability registry.
- **"How this started"** (collapsed): The Trust Project and its trust question → the 12 Principles → SecurePay → the wider community around shared technologies, systems and people.
- **Actions:** one primary (Explore Community) plus two secondary (Read the 12 Principles, Stores).

## Membership identity

- "Trust Project member · KSxxx" appears only for an **ACTIVE** member whose canonical KS Number is known.
  - The status comes from the existing self-scoped `GET /community/membership/me`.
  - The KS Number comes from `GET /circle/me`.
- INVITED shows: "You've been invited … accept or decline in Community."
- `ownKsNumber` is now cleared on sign-out, so it can never carry over to the next person on the device.
- Membership is re-read when leaving Community, where accept and decline happen.

## Other changes

- **Invitation (Community):** adds "Joining gives you access to shared fair-trade technologies, systems and people while you remain independent." The no-obligation and independence copy is kept.
- **Workspace nav:** "Community" now opens Community. It previously showed "This area is not available yet."
- **Community identity:** unchanged. It already reads "The Trust Project · A community of people choosing to trade fairly."

## Archaeology findings (API)

- **Membership:** `community.trust_project_memberships`, one row per `identity.ks_identities` id (INVITED / ACTIVE / DECLINED / REVOKED). It is invitation-based, with a founding-member bootstrap. There is **no second number**.
- **Store:** `market.store_profiles` is keyed by identity and lazily upserted.
  - `GET /api/v1/stores/{ks}` returns a Store (with `profile: null` and no offers) for **any ACTIVE identity**.
  - `GET /store/me/profile` returns defaults when no row exists.

  Every ACTIVE SecurePay identity has a resolvable, empty-capable Store. Therefore, an active Trust Project member whose SecurePay identity is active can use that Store without separate provisioning. Membership itself does not create or guarantee the Store. No provisioning was needed, and none was faked.
- **Plug:** Lifetime Share doctrine (10% of the SecurePay platform fee on explicitly attributed, settled KeyContract agreements). Unchanged.
- **Master:** self-designated `community.master_profiles` with requests, advisory opinions and paid timed sessions. Opinions never mutate Agreements. Dispute escalation is a separate lifecycle.
- **Skills Institute / training / practice canvases:** **not live.** They are absent by locked doctrine.

## Verification

- `node --test tests/*.test.mjs`: 1287/1287 (new `tests/ui-phase7-trust-project.test.mjs`, 17 tests).
- `tsc` passes. `eslint` has 0 errors, and no new warnings in touched files. `vite build` passes.
- **Real browser, against a real local backend** (SANDBOX, `SECUREPAY_AGENT_MODEL_PROVIDER=none`, uncommitted dev proxy):
  - signed-out desktop and 375px Home: the first viewport is KS001, with no horizontal overflow;
  - the section's content, "How this started", the 12 Principles panel, and the Explore Community and Stores doorways;
  - Joseph (INVITED by founding member Amina through the real invite API): the compact doorway shows the invite line, and the Community invitation shows the new "why accept" line;
  - after Accept: "Trust Project member · KS019" on both Homes;
  - the Workspace doorway and Workspace nav open Community.
