# Day 11 — Human-first, contextual Plug & Master support blueprint
Date: 12 November 2026
Applies to: **Living Workspace, SecurePay Mini, Ask KS001 and Digital Stores**
Status: **OWNER PRODUCT DIRECTION — DOCUMENTED FOR INTEGRATION. This is not built UI, test certification or deployment.**
Companion architecture: SecurePayAPI PR #409 (role source/authority audit).
Preserve: approved three-panel Living Workspace, single mini.html, one KS001, Store master layouts and all existing working controllers.

## The governing experience
**People come to shop, sell, learn, work or complete an agreement. They do not come to navigate a Plug/Master system.**

Human assistance is **a capability available when needed**, not a mandatory product tier, main navigation category, pop-up advertisement, compulsory registration or automatic paid extra.

For a straightforward purchase or work task, neither Plug nor Master is involved. There is always a simple unobtrusive "Need help?" escape hatch for people who ask, but no unsolicited role selection in ordinary Store browsing and checkout.

A young person with **little/no mobile data** (or little stored business information) can still ask a trusted helper for practical assistance; do not assume SMS/USSD, offline sync, delegated login, proxy consent, or phone bookings exist in production. They are proposed channels and require security, explicit opt-in and affordability checks. Low-data performance must remain usable without heavy imagery or map rendering.

An older skilled scientist who dislikes digital interfaces can contribute as an expert or obtain assistance in a way that protects expertise and dignity; their knowledge does not magically become a verified Master credential, nor should technology literacy determine competence. Offer familiar choices like "Talk to someone" or "Share the details by voice" only when supported; human assistants may help prepare documents, but **only the principal** may approve engagement, publish expertise or accept agreement under their own authorised authentication/assisted-consent process.

## One shared context-driven assistance contract
The same underlying case/Agreement references, context and approved choices flow into Store, Living Workspace, Mini and Ask KS001. Each surface can *present* help differently but no duplicate person database, agent instance, task ledger, appointment mechanism, checkout engine, money authority, Store or permission layer.

Default: show ordinary shopping, seller operations or agreement status. Then **only with grounded need** or an explicit request:
1. Understand the actual obstacle in familiar words (can't find stock, needs a person to coordinate, needs specialist opinion, difficulty using tools).
2. Check whether the user can continue unaided; never create a problem solely to show help.
3. If useful, show **one small option** in ordinary language (e.g. "Ask someone to help", "Get expert advice", "Compare delivery choices"), with "Not now". Do not display "Plug" and "Master" as jargon until the person asks who will help.
4. After a tap, explain what human assistance entails: qualifications where verified, scope, privacy, possible fee, relevant geography/time, and that inviting or browsing is NOT booking or acceptance.
5. Only then hand off to existing authorised Market Network Plug opportunity/availability, Trust Project/Skills Institute capability verification, Master Request, or canonical Agreement service. A role is assigned **only** with the person's permission and the helper's separate acceptance. The assistant never hires a person, shares private agreement context or promises money.
6. Return to the exact previous work/cart/Agreement with the resulting status, or allow decline/dismissal with no penalty. No forced chat and no new root screen.

### Suggested presentation per surface

**Digital Store**
- Primary interface: search, goods, services, availability, clear price, cart, familiar checkout.
- No visible Plug/Master categories, badges or automatic Saver upsell as baseline Store furniture.
- When a user selects multiple suppliers, cannot find needed goods, or requests coordination, consider a one-line optional prompt: "Need help bringing these together?" / "Would you like someone to help?" only with real underlying capability.
- Seller's ordinary Store management stays the same. A Plug can offer assistance to maintain store data, but only via explicit granular delegation; never silently replace a seller's stock, price, promise or relationship.
- Community Saver appears as **optional coordination** after genuine opportunity and source-consented participation, not a default buy mode and not a discount promise.

**Living Workspace (three panels)**
- Left: existing tools (Store, document, photo, etc). Do NOT add compulsory Plug/Master navigation, fourth panel or parallel service marketplace.
- Middle: KS001 acknowledges the real problem and asks one concise material question. A discrete "Get help" action appears contextually.
- Right: compact summary stays about what is happening and the immediate next action; only once human help was requested/accepted may it show `Waiting for helper`, `Review expert's opinion`, etc.
- Keep chat independent when store opens, source references and cart unchanged; return without losing progress.

**SecurePay Mini**
- Keep one compact independent checkout with the actual approved quote/Agreement/payment options. Never force KS001 chat, a Plug referral, a Master consultation or Community Saver to complete ordinary checkout.
- If a genuine block arises (unclear handover, missing approval, technical specification concern), a small optional "Need assistance?" may open source-bound review and return to the *same* Mini. Never self-activate a paid human role, payment rail or release action.
- Display capability and fee explicitly before an engagement; no referral-driven interruption.

**Ask KS001**
- Default to evidence-backed brief answer and at most one useful next question; pills if they reduce typing, with free chat always possible.
- Trigger optional human assistance only from **the user's request** or a verifiable problem: unfulfilled stock/service, complex specialist risk, multi-party coordination, unresolved handover/inspection, explicit low-tech need.
- Do not use age, education, poverty, disability or assumed competence as automatic triggers; honor expressed preferences.
- Source truth only: avoid invented availability, credentials, status, prices or saved money. KS001 explains the choice; it cannot appoint or sign for anyone.

## Owner correction: Ask KS001 can show a few relevant Store suggestions
**User journey: Buy → discover → enter the actual seller's Store → select items → form the canonical Agreement → choose settlement when appropriate.** The "Buy something" intention in Mini is fundamentally different from "Pay someone" and must not ask for an agreed price before finding products.

A person who asks KS001 for an item or service can receive a **small set of genuine, relevant suggested Digital Stores inline** as convenient quick assistance. "Sample Stores" means **selected candidate Stores** in the real experience—not fabricated merchants, fake stock or injected advertisements. Fictional samples are allowed only in labelled test fixtures.

### Grounded conditions, not an ad slot
- Suggest **zero to three** Store cards only when the question indicates buying/discovery (or the customer explicitly asks for Store suggestions). No cards for unrelated questions and never an always-on home feed.
- Rank from **actual published Store/offer/search records** with relevance to item/specification, local area or requested destination (coarse consented context), serviceability, source freshness and verified stock evidence where present. Never claim in-stock, nearby, delivery available, licensed or cheapest without authoritative, current data.
- Each suggestion shows **real Store identity, matched published item/service, verified information actually available, and availability status** (confirmed or needs checking). If no suitable published Store is found, say so; do not invent results or automatically reroute to a paid Plug.
- Do not pay-to-rank, favour Keyman companies, or treat suggestions as ads. Neutral selection should be inspectable and user-correctable. Show why an option fits in plain words.
- Offer only minimal actions: **View Store**, **View item**, or **Ask about availability** where real capability exists. The user decides whether to enter a Store. More matches may be discovered on explicit request.
- In the three-panel Living Workspace, Store thumbnails/cards render within the **existing middle KS001 conversation**, and **View Store/Item** uses the already agreed Store tool-to-middle expansion; it must never replace the conversation or open a fourth panel. Cart and summary remain canonical.
- In Mini and embedded Ask KS001, keep the existing **compact lightweight surface**: tap a suggestion to open the seller's real Store/offer, then return through the existing one-agreement/one-checkout flow. No second catalogue, Store clone, cart or payment.
- In a limited-data mode, render **text-first cards**, with optional images on demand. No compulsory map, video, external link or deep AI response to discover goods.
- A suggested Store is **not an endorsed seller, a reservation, confirmed stock, buyer/seller agreement, pending charge or authorisation to share private delivery details**. An offer snapshot must be refreshed and seller confirmation obtained as the agreement progresses.
- If the person asks for multiple suppliers, coordinate only after they choose; Community Saver/Plug support remains separately voluntary and consented. Do not show a Master or Plug on an ordinary Store suggestion.

### Examples (fictional labels only)
- "Where can I buy 40 bags of cement around Varsityville?" → up to 3 actual Store/offer matches with *40 bags not yet confirmed*; tap to view published shop.
- "I need milk today" → one nearby eligible listing if published and available; straight to Store without an unnecessary support prompt.
- "I want an engineer to inspect a foundation" → service discovery must check current, scope-specific expert and regulatory claims; never imply self-designation is verified competence.
- "What is a fair price for cement?" → answer the factual question first, optionally "Show Stores selling cement" if context calls for it; no mandatory promotional results.

### Acceptance guard
No mock card may appear as a real Store; no suggestion without source; no unrelated recommendation; no paid ranking or unsupported discount; no forced chat, Plug, Master or Mini switch; item/Store selection does not destroy chat state, cart or rights.

## Personas as equal first-class citizens

**Young trader with no/limited mobile data**
- Can see/search simple text-first offers; images, live maps, video and AI verbosity are optional data costs. Provide a lightweight mode with explicit user choice when implemented.
- May seek a local Plug to help register a Store, publish a truthful offer, find suppliers or assist a customer. Skills Institute may help the person become a qualified Plug themselves if they choose.
- Proposed assisted access requires clear fee disclosure, verified helper identity, scope-limited delegation, consent receipts, revocation, no credential sharing, no hidden deductions or owner impersonation.
- If connectivity fails, preserve locally entered drafts only where a safe implementation truly supports it. Never pretend an SMS, phone, offline or saved transaction succeeded without backend confirmation.

**Older scientist or skilled elder who dislikes technology**
- May sell expertise, consult, teach, inspect or mentor using minimal screens, voice or trusted assistance (future supported channels only).
- A person can be an accomplished scientist *without being a SecurePay-designated Master*. To advertise a verified SecurePay capability, follow existing independently reviewed Master claims. For legally regulated activities also check required professional status.
- Show scope, remuneration, schedule and evidence in simple language. A helper transcribes; the expert reviews and authorises the actual opinion; never silently author an opinion in the expert's name.
- No recurring app demands, dashboard complexity or large forms just to answer a one-off question.

**Ordinary shopper**
- Can shop unaided from one seller and complete checkout without ever seeing the words Plug or Master.

**Coordination-heavy buyer or community**
- A qualified on-duty Plug may help only with individually agreed scope and each party's consent. A Master appears only for independently justified expertise.
- A Saver proposal is not an accepted purchase, a delivered promise, or proven saving.

## Plain-language trigger → response reference
| Grounded situation | Default optional help | Existing authority |
| --- | --- | --- |
| Simple purchase of one item | NONE | Store → Agreement/Mini |
| "I cannot find someone to deliver these" | "Would you like help arranging delivery?" | Qualified Plug and separately vetted transport if used |
| "Several shops, one site" | "Explore a coordinated delivery?" | Consent-aware Saver/Plug; all seller approvals |
| "Is this building material suitable?" | "Ask a qualified specialist?" | Current verified Master capability/request |
| "I need someone to set up my shop" | "Get help setting up your Store?" | Granular owner-delegated Plug assistance |
| "I just want to speak to somebody" | "Ask a person for help?" | Bounded support request; no mandatory AI dialogue |
| Normal Mini payment step | NONE | Existing Mini source/Agreement/Money |
| Live Agreement waiting on approval | "Remind the relevant party" only if authorised | Existing attention/notifications |

## Human permission contract
- A proposed helper or a person's qualified status is not acceptance of an assignment, a guaranteed price, or access to private information.
- Every human service has separate explicit scope, current qualification/status checks, offer/fee disclosure, invitation, recipient acceptance, delegated permission if any, audit and expiry.
- Store assistance does not make Plug the Store owner. Master is a *capability* scoped to domain evidence; never silently imply licence or guaranteed result.
- Plugs and Masters are not compulsory intermediaries for all trade. Community Saver is the one coordinated mode where a qualified Plug is a prerequisite **per current G4 doctrine**; if no Plug is available, offer an honest non-Saver direct/combined alternative instead of blocking purchases.
- Distinguish ordinary customer support from paid expert/Plug contracts; charge is never assumed and must be disclosed before acceptance. Simple voluntary community help may be unpaid, but do not fake canonical funded status for paid tasks.
- No revealing private home place, Circle participation, client agreement details or personal information to discover a helper; use disclosed coarse area/need.
- For elderly or lower-connectivity users, assisted consent must be independently authenticatable; **never** ask for a user's PIN/password/OTP, assume a helper has power of attorney or allow the helper to approve their own pay.

## Things never to build from this blueprint
- A compulsory Plug/Master directory on the Store home page.
- Ads, referral pop-ups or sales prompts injected into Mini.
- A second checkout, AI chat agent or marketplace.
- A new mandatory long intake form just to request one item.
- A default Community Saver enrolment, fake discount or automatic 3-party consent.
- A token-expensive AI conversation when simple verified answer pills suffice.
- A high-data map/image experience required to make a basic purchase.
- Mandatory expert review for ordinary goods or a general assumption that older people need help.

## Product success tests
1. First-time shopper buys an ordinary item without seeing Plug, Master or Saver.
2. Low-data visitor can view core information in a small-screen, text-priority experience; no video/maps needed to decide.
3. User asks for person, receives a friendly meaningful choice with fee and privacy explained *before* accepting.
4. Scientist can choose expert consultancy/teaching with minimal tech, and his supplied opinion cannot be impersonated by a helper.
5. Request for multi-store pooled fulfilment offers a Plug only after need is established; existing qualified availability is real and named participants consent.
6. Declining an offer of help does not lose a Store cart, reset KS001, change Mini or block the ordinary agreement.
7. A Master is suggested for a technical need only when verified for that exact scope; self-designation alone is not certification.
8. Once a human request is accepted, the same request/status follows between Store, Living Workspace, Mini, Ask KS001.
9. No human or AI role may auto-accept seller terms, change stock, grant gate entry, complete a milestone, charge money or release funds.
10. No vague promise of "offline" or SMS/USSD delivery before the actual channel is implemented and tested.

## Implementation and integration gates
- Gate 0: review and lock this blueprint with owner against both approved Day 11 Store and approved Mini Phase 4 branch. The two UI histories are divergent; neither is a standalone future product.
- Gate 1: reuse existing back-end Market Network Plug, Master Request, Skills/Trust qualification, StatusEvent and Agreement source truth. Do **not** create duplicate role schemas.
- Gate 2: one small contextual help entry point per surface, and prove invisible-by-default behavior across real direct purchases.
- Gate 3: permissions/consent/fee/disclosure contract for authentic human requests; optionally build lightweight and accessible access modes, only if supported by available channels.
- Gate 4: staged fictional-persona tests (text-only/poor connectivity, scientist reluctant to operate software, ordinary shopper, multi-Store order, blocked Mini). Inspect screen recordings and complete separate mobile/security validation.
- Gate 5: controlled merge and staging rollout only after paired API/UI/auth/privacy tests; no production or estate changes through documentation PR.

## References
- SecurePayAPI main: `community/training/PlugQualificationService`, `marketnetwork/service/PlugMissionService`, `master/service/MasterRequestService`, `community/training/MasterCapabilityQualificationService`, `geo/GeoCommunitySaverService`.
- SecurePayAPI PR #409: audited roles, Master privacy/verification corrections (still draft).
- SecurepayLLM PRs #270 and #271: distinct owner-review branches for Mini and Store; preview Community Saver consent only.
- SecurepayLLM PR #151: buyer journey and Store buying-plan local-only coordination.
