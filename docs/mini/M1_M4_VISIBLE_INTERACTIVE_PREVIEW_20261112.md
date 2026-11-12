# SecurePay Mini — first visible M1–M4 interactive preview
**12 November 2026** · **Audience:** product review, not a staging or production release.
**Preview build:** `https://securepay-kmhgo96yi-james-8078.vercel.app/mini.html?demo=1` on `c2fd12c24c20f12ac1b44f5447f92936947566b4` (Vercel READY).

## Why this exists
Previous M1–M4 changes were source-tested but invisible to reviewers because the staging-only first-party KS001 activation gate deliberately refused the Preview project's production API origin. Source tests ≠ an experience a real person can try. The product owner asked for a visible, working Mini before moving to M5.

## What the existing Mini now shows
- On the normal Mini homepage in the scoped Vercel preview, **Explore the latest Mini build** appears as one optional entry, without changing the established Buy/Sell/Pay/Collect and Store experiences.
- `?demo=1` opens the **same `MiniFirstPartyKs001` component** with an explicit `demo` prop. It reuses the actual `createAgentGateway` / `createAgentController`, `MiniAgreementSlots`, `miniSavedWorkFlow`, `MiniParticipantInvitations`, `MiniCreatorInvitations`, and `MiniMyAgreements` components.
- The demonstration uses **`createMiniDemoHttpClient`**, a local deterministic stub satisfying the normal `HttpClient` interface. It deliberately makes **zero network requests** and refuses unknown paths, including financial commands. The *real* Mini path still uses the original `createHttpClient(apiOrigin, session.getAccessToken)` guarded by matching, verified staging origins.
- In preview, an explicitly labelled synthetic buyer **Amina** and synthetic seller **Njeri** can switch roles without an actual KS Number/OTP identity. The real account path remains unchanged.
- The running sample is 40 chairs for a Ruiru meeting: 15 said to be available, 25 still needed, proposed delivery on 2 December. The chat is **scripted** and labelled as such, not passed off as actual AI.
- M2: Review shows the *real* expandable `MiniAgreementSlots` for purpose, people, money, dates, responsibilities and unresolved questions.
- M3A: Save for later / My saved work / Resume uses `miniSaveServerBuild`, `miniListServerBuilds` and `miniResumeServerBuild` against synthetic backing records, with the same exact-context validation as the production gateway. The sample fixture persists **only** within the user's browser tab under a demo-only `sessionStorage` key; no real secrets.
- M3B: Creator invitation panel and recipient inbox use the **actual** InviteController, InvitationInboxController and RecipientController. Viewing is separate from Join, which is separate from confirming the exact version. Synthetic role changes update the preview data. No actual invitation token is issued or delivered.
- M4: The same My Agreements component shows server-shape-compatible actor-specific attention, next actions, Agreement details, milestones, responsibilities and `NOT_FUNDED`. This does not grant permission to finance or alter an Agreement.

## Focused user experience walkthrough
1. Visit the direct `?demo=1` preview, or the preview home page and choose **Explore M1–M4**. Confirm that a prominent **SYNTHETIC DATA · Scripted preview** label appears.
2. As **Amina**, read the sample conversation and ask about delivery or stocks; open **Review what SecurePay understands**, inspect people, money, dates and unresolved questions.
3. Open **My SecurePay**. Select **My saved work**, Continue the original conversation; then open **My Agreements** and review the current next action/milestone.
4. Under **My SecurePay → Invite someone**, explore the existing Agreement's People flow with sample KSNumber `DEMO-N`. This is **not** a real invitation; no link is sent.
5. Switch to **Njeri**, open **My SecurePay → Invitations for me**, explicitly Review, then **Take part** and **I agree to this exact version**, as separate actions. This changes only the synthetic fixture.
6. Switch back to **Amina** and reopen My Agreements to view the updated sample next-action state.
7. Close the preview tab after testing; do not enter personal or real transaction information.

## Safety and release gates
- Direct simulation is enabled only when Mini sees the specific `securepay-<deployment-hash>-james-8078.vercel.app` preview hostname (or localhost) and the sample is explicitly opened. Neither the production `securepay.ke` domain, staging.securepay.ke nor generic/other Vercel hosts qualify.
- No real KSNumber credentials, customer addresses, bank/provider tokens, invoices, personal beneficiaries, production store stock, real-world SMS, payments or money are requested or used. No production data is copied into synthetic fixtures.
- Existing Mini home, Stores, guest fallback and staging-only first-party branch remain unchanged outside the optional preview.
- Passing **83 focused Node tests, zero failures, plus TypeScript / Vercel READY** includes 11 runtime tests using the *same mocked HttpClient + canonical controllers* and prior M1–M4 checks. This demonstrates client state and routes, **not** a visual human pass or a live API certification.
- M1 staging remains blocked by independent backend/API/DB/CORS verification. Signed-in real identities, KS001 model quality, actual consent, saved Agreements and financial rails remain **NO-GO** until tested in genuine isolated staging.
- The preview is an **experience validation step on the main route to finishing SecurePay**, not a parallel app, redesign, new testing programme or claim of product launch readiness.

## Current decision
**Experience candidate visible:** YES, on scoped Vercel preview.
**Source-focused tests:** PASS (83/83).
**Automated browser/human usability acceptance:** NOT CERTIFIED.
**Live M1–M4 backend acceptance:** NOT CERTIFIED.
**Production and regulated Money:** NO-GO.

Once the owner has experienced the actual same Mini components and approved their behaviour, return to the main route for M5 Stores and the remaining canonical Agreement capabilities. Do not market synthetic replies as production KS001 intelligence.
