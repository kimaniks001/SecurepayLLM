# Mini Sell Something — Phase 4 signed-in account integration

Date: 17 November 2026
Status: **DRAFT; authorization and integration tests not yet executed.**

## Actual paths now connected in code

When first-party Mini KS001 has an active **signed-in** user on the explicitly configured isolated API origin, the existing `MiniSellerStore` management screen first verifies the personal Store or represented Business. It now offers **Sell something**. This opens the approved `MiniSellSomething` experience, using the SAME authenticated `stores`, `agreements`, and KS001 `pair.gateway` created by `MiniFirstPartyKs001`, not a second account or mock service.

### Seller exits

- **Save for later** — unchanged local text-only draft.
- **Add to my Store** — explicit authenticated unpublished, image-free, quantity-unverified Store draft. A separate **Publish text only** answer pill compares the fresh server offer with the saved revision and invokes the dedicated optimistic backend `publish-text` contract. An unfamiliar or changed version cannot be published. Public availability remains **Needs confirmation**. Business publishing uses the independently verified Business identity, never a fictional KSNumber.
- **Share with buyer** — the signed-in **personal** seller may explicitly select **Prepare these terms in KS001**. This sends ONE seller-authored, bounded ordinary statement via the existing KS001 conversation controller; no file data, photo names or hidden identity are attached. After a successful turn, the frontend separately reads the real backend Trade Context and holds only the returned conversation ID and version in component memory. The seller then reviews the backend handoff and chooses **These are the terms I'll share**, **Set up my draft Agreement**, **Propose Agreement**, and **Create SecureLink** using the existing backend Agreement API. These are separate authoritative operations.

### Why Business sharing remains gated

Verified Business Store representation only proves Store-management authority. It does not by itself prove authority to create and propose an Agreement as the Business. For Business `Share with buyer`, Mini explicitly tells the seller to verify representation through KS001; it does not pass an invented Business Agreement authority.

## Onboarding and shell boundaries

- This does not turn on public/guest write controls. The `MiniExperience` owner preview still passes no real gateways.
- Real first-party Mini KS001 is origin-gated by `getMiniFirstPartyOrigin`, and actual mutations require a signed-in, refreshed session.
- The real first-party managed Store is available through the existing Mini route; entering the native seller composer is an additional deliberate click after Store account choice.
- Signing out or losing authentication clears the transient selected seller/Business context.
- Local text edits after saving a draft or KS001 context require another explicit review; no magic synchronization from unverified browser data.
- Existing seller choices and onion-style answer pills are preserved. Standard SecureLink only; no visual customisation. Buyer controls Money.
- Real images, Identimarks and rights approval remain blocked separately by Phase 3 certification.

## Before user acceptance/release

1. Check that explicit seller message matches the reviewed canonical terms, not just a similarly named different conversation. The person must inspect the actual server review before confirmation.
2. Run complete Node test suite, TypeScript/Vite production build, backend Java 21, PostgreSQL, authorization, signed-in first-party and request concurrency tests. **Not executed here.**
3. Validate current KS001 saved Work identity and conversation continuity across signout, user switch and network-uncertain message delivery.
4. Verify the dedicated publication API exists in the deployed backend before enabling this seller path; both PR branches are draft and stacked.
5. Resolve Business Agreement representation, source/version fidelity, regulatory category permissions and the legacy generic Store PUT publication policy before broad rollout.
6. Verify proper Store profile/payment membership permissions in Phase 5.

No live Store publication, invitation, SecureLink issuance, Money action or payment was performed by creating this branch.
