# P0 — Digital Stores in the actual SecurePay Living Workspace
**Date:** 4 November 2026  
**Branch:** `fix/p0-store-masterpiece-convergence-20261104` based on Store UI Gate 5 `feat/day5-gate5-store-certification-ui-20261103`.  
**Release boundary:** SOURCE-IMPLEMENTED, NOT BUILT/CERTIFIED, NOT MERGED, NOT DEPLOYED. Live `securepay.ke` and API/DB remain untouched.

## Root cause
`Phase1LivingWorkspacePreview.openTool('Stores')` navigated to `#/store`, unmounting the existing KS001 and right Agreement. `AgentExperience` then mounted `StoreExperience` with a *different* NavBar/app shell. Matching colour/columns did not make it the approved Living Workspace.

## Source correction implemented
- `StoreExperience` retains the **same** real Store controller, setup, offer builder, public Store, favourites, enquiries, drafts, Business representation and handoff components, with an `embedded` option that suppresses the *outer app shell only*. A compact Store discovery header reuses its same search and actions.
- The existing `Phase1LivingWorkspacePreview` mounts that entire Store body next to the persistent `LiveKs001Session` and the real `LiveWorkResultPanel`; no second Tool Shelf, KS001 or SecurePay Check. A mobile drawer offers **Chat · KS001** and **Agreement**, with explicit close.
- Store remains **mounted but hidden** when closed so an unpublished offer form is not silently thrown away. It unmounts when signed out, removing private Store state.
- `RuntimeApp` directs **authenticated** generic Store entry into this workspace, while anonymous and direct public trader Store/offer links remain public. Production uses the existing real authenticated API client; preview-host access to mutating Store APIs is restricted to an explicitly configured staging origin.
- Explicit source selection goes through the **same** `liveController.useOffer`, the existing canonical Store server source validation and the same right SecurePay Check. Unsent composer input blocks replacing an active source, and meaningful unrelated current work is saved by `beginNewWork` before selecting a new Store offer.
- KS001 questions are prepared as unsent drafts in the same existing conversation—not submitted automatically. Existing Saved Work, mobile and Day 4 protections remain.
- Real offer pointers from Vision, Community and Agreement are carried as one-shot IDs for re-reading in the embedded Store, not copied text as agreement authority.
- Business Vision uses the original Business KS owner-scoped `VisionBoardController`, rather than silently changing to a personal Vision. This remains an explicit cross-area view and needs browser verification.
- Existing public Shop presentation is intentionally separate. **Do not apply the private Tool Shelf or private conversation to anonymous visitors.**

## Gate 1–5 capability preservation matrix
The statuses below distinguish the owner's 4 November Gate 1 deployment report from independently certified results. Gate 2–5 source presence is not equivalent to live deployment. The P0 correction **reuses existing components** rather than asserting unfinished features are working.

| Capability | Prior status | Destination/source | Preservation disposition | Proof required |
|---|---|---|---|---|
| Authenticated Store shell / Tool Shelf | LIVE layout; Store split | Phase1LivingWorkspacePreview / RuntimeApp | Embedded Store; no secondary NavBar | P0 architecture test |
| KS001 persistent conversation/composer | LIVE / existing | LiveKs001Session | Still mounted while Store opens/closes | Day4 + P0 tests |
| SecurePay Check, proposed source / Agreement | LIVE / existing | LiveWorkResultPanel | One authoritative right panel | Day4 + P0 + staging |
| New Work, Saved Work, mobile Chat/Agreement | LIVE backport, Gate5 ported | Phase1 / workNavigation | Unchanged, checked source wiring | Day4 tests + staging |
| Personal and Business Store ownership | G1 live-reported | StoreExperience + StoreManagementHome | Real Store controller preserved | G1 tests + 2-identity staging |
| First-offer draft through sign-in | G1 live-reported | StoreExperience / OfferBuilderView | First-offer handoff preserved | G1 staging |
| KS Number and Business representation | G1 live-reported | StoreExperience / businessGateway | Fresh owner scope retained | Business negative tests |
| Digital Store name / address / slug / aliases | G1 live-reported | DigitalStoreSetup | Real address API retained | G1 direct link test |
| Store headlines, descriptions, themes | G1 live-reported | DigitalStoreSetup | Same live server save forms | G1 browser |
| Service areas / GPS manual correction / pin privacy | G1 live-reported | DigitalStoreSetup | Private coordinates preserved | Privacy test |
| Published public Store links and trader branding | G1 live-reported, imagery partial | Standalone public StoreExperience | Dedicated branded public experience stays | Anonymous browser |
| Store cover, logo, gallery, photo uploads | APPROVED; incomplete at G1 | Store media/customisation flow | NOT falsely implemented in P0 | BLOCKED media pipeline |
| PRODUCT / SERVICE / CAPACITY offers | G1 live-reported | OfferBuilderView / StoreManagementHome | All offer kinds and controls preserved | G1 regression |
| Offer prices, quantities, terms, availability | G1 live-reported | OfferBuilderView | No automatic Agreement/payment | Offer regression |
| Offer drafts, publish, edit, withdraw | G1 live-reported | Store controller / OfferBuilderView | Same backend actions | G1 server integration |
| Published search, browse and direct offer links | G1 live-reported | StoreHome / StoreProfileView / OfferQuickPreview | Full body embedded, public links unchanged | Anonymous and signed-in |
| Add my favourite / invite a trader | G2 draft (not production-certified) | StoreConnectionsHome / StoreCustomerConnections | All components reused | G2 2-identity |
| I'm here now trader announcement | G2 draft | DigitalStoreSetup | Direct public Store link remains | G2 copy/link |
| Buyer enquiry create + idempotency | G2 draft | StoreCustomerConnections | Original gateway and controller reused | G2 E2E |
| Trader personal & Business inbox / reply / decline | G2 draft | StoreEnquiryInbox | Private source of truth preserved | G2 E2E |
| Customer enquiry history / response status | G2 draft | StoreConnectionsHome | Server-read history retained | G2 E2E |
| Store offer → KS001 verified source | G3 draft | Phase1 continueEmbeddedOffer / liveController | Same canonical controller, not chat text | P0 and G3 test |
| Buyer enquiry quantity / message / seller response | G3 draft | StoreCustomerConnections / LiveWorkResultPanel | Current verified source only | G3 API+UI staging |
| Changed/unpublished offer fail closed | G3 draft | Existing API source checks | Backend untouched by P0 | G3 integration |
| Agreement review, consent, roles, lifecycle | Existing; G3 E2E incomplete | Existing LiveWorkResultPanel and Agreement | No new Agreement engine | Gate5 formal stage |
| In-app Store notifications / exact enquiry routing | G4 draft | NotificationsExperience / StoreEnquiryInbox | No separate notification engine | G4 staging |
| Buyer saved KS001 work across devices | G4 draft | StoreConnectionsHome / liveController | Uses same saved conversation | G4 two phones |
| Seller saved reply drafts / 409 version | G4/G5 draft | StoreEnquiryInbox | Same server-backed draft editing | G5 concurrent devices |
| Foreground refresh, session/business isolation | G4 draft | Existing Store components | No new cross-identity store | G4 security |
| OS background push / SMS / WhatsApp delivery | NOT implemented / not certified | Existing notifications provider boundary | No false delivery claims | BLOCKED adapter & device proof |
| Business KS → represented human notification fanout | NOT certified | Existing notification permissions | Store inbox remains authoritative | BLOCKED recipient routing |
| KS001 question from Store without auto-send | P0 implementation | prepareEmbeddedStoreQuestion | Writes only to existing composer | P0 + browser |
| Source from Vision/Community/Agreement | Existing; P0 bridge added | storeWorkspaceOfferEntry / AgentExperience | Server re-reads IDs, preserves current Work | P0 + browser |
| Business Vision owner-scoped Grow action | Existing; P0 bridge added | storeBusinessVisionEntry / VisionBoardController | Preserves correct Business KS, explicit external route | P0 + browser |
| Real staged API, migration and security certification | G5 NO_GO | Separate API #388 and UI #209 | No production migrations or claims | Gate5 full staging |

## Final pre-deployment corrections (4 November 2026)

- **Isolated staging home now enters the genuine masterpiece.** `isCandidateWorkspaceEntry` recognises a staging/sandbox/qa/test subdomain of `securepay.ke` and the existing Vercel preview. Root `https://securepay.ke` production routing remains unchanged.
- **Public slug route collision fixed in source.** Historical `#/s/{slug}` could refer to BOTH a public Digital Store or a legitimate existing Agreement SecureLink. New Store shares use `#/shop/{slug}`. The shared old `#/s/` route queries both existing public read endpoints. One verified match redirects to an unambiguous route; two matches require a visitor choice; any uncertain network error fails closed without silently hijacking either destination. Backend address and historical aliases are retained. This does NOT change existing server-issued Agreement SecureLink URLs.
- **Real Stores are discoverable from published offers.** Store search projects unique seller KS numbers from the backend's published offer results and exposes actionable Store links. Previously `onOpenStore={() => {}}` was inert. This does not fabricate a comprehensive directory of unpublished sellers.
- **Authenticated Store enquiry notifications stay in the masterpiece.** Signed-in `#/store/enquiry/{id}/buyer|trader` routes open the existing Store tool and recheck the original scoped Store API; no notification carries authority by itself.
- **Canonical public digital-address links** generated by Store setup and alias rewrites now use `#/shop/`. Old `#/s/` links are handled by the shared resolver. Full browser regression of link collisions/aliases is still REQUIRED.

## Mandatory visual + actual test before owner acceptance
1. With a real current KS001 conversation and unsent message, open Store. Same conversation ID, message, attachments and Agreement must remain. Close Store and verify exact restoration.
2. Run Store management and an unpublished offer editor, close then reopen Store. Confirm draft state remains. Sign out and confirm private state is no longer shown.
3. Publish a real Store offer on isolated backend, open public direct URL in anonymous browser, verify Store-specific branding and privacy-safe GPS.
4. Save a favourite, create actual enquiry, reply/decline from a second KS, and choose **Continue enquiry with KS001**. Source owner, offer UUID, quantity and text must match server. No Agreement accepted on click.
5. Open from Vision, Community and an Agreement selected offer. Verify Store source handoff, return and prior work preservation. Open Business Store Vision and confirm the represented Business KS is used.
6. On mobile, test Store → Chat → Agreement tabs and the current composer/attachments. Verify no second app shell or default navigation to Home.
7. Full TS typecheck, focused Store/day4 tests, lint/build, isolated API staging, 2 identities and real phones are outstanding.

## Explicit limitations
- Store covers, gallery and media/photo uploads were unfinished in the Gate 1 deployment report. Reusing their UI does **not** mean that backend has been implemented.
- G2–G5 backend features and full 29-check Gate 5 certification are still separate unmerged/uncertified source. Do not declare them live.
- No guaranteed locked-phone alerts, WhatsApp/SMS or Business recipient fanout.
- No production API, provider credentials, settlement or financial execution is touched or enabled by this P0 branch.
- Some deliberate cross-area destinations (Money, existing Business Vision) remain separate screens and must preserve/safely return work; this P0 corrects the Store shell itself, not every old non-Store screen.

**Acceptance:** one actual Living Workspace; every Store Gate component preserved; current KS001 and Agreement remain authoritative; no false success; isolated preview and owner visual inspection BEFORE any production merge.
