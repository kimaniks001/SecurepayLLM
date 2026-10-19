# Master Phase 4 — UI-to-API Integration Register
Source integration baseline: `a4858c4e6406d4e82c6e3a54c0a1f0e18b853aa8`.

UI-first only. The existing authorised `StoresTool`, `QuickSupportPanel`, Places, and live KS001/Formation controllers remain the sole active pathways. The new demonstration feeds proposed notes to the existing in-memory SecurePay Check only.

| Needed capability | Existing frontend boundary | Missing/uncertified operation | Honest Phase 4 UI fallback | Authority | Integration |
| --- | --- | --- | --- | --- | --- |
| Store discovery and photo | `gateways.stores.search`, Store `mediaRefs` | Real search/availability and image provenance require authenticated environment checks | Clearly marked sample offers and SAMPLE PHOTO | Public listing permission; no private location | PARTIAL |
| Offer comparison and source | `gateways.stores.offer`; `canonicalKsNumber` / offer ID | No independent confirmed delivered cost or stock proof | Retain source IDs and mark price/delivery unknown where absent | Refresh seller offer before proposed use | PARTIAL |
| Shortlist and proposed choice | `StoreBuyingPlan` + `onContinue` | Authoritative Agreement terms and acceptance are not created by a shortlist | Local considered state, explicit proposed-note handoff | Seller and buyer agreement required | PENDING E2E |
| Plug capacity, training, availability | Existing capacity Store search + Trust membership/Skills Institute APIs | No validated live matching, published service area, availability, training/rate/consent in this preview | Explain role and prepare a *request*, no fabricated KS identity | Individual consent, role, time and location policy | PENDING |
| Master knowledge and service | Capacity Store, Institute relationships | No certified qualifications or authorised appointment/record share demonstrated | Explain guidance and prepare a request, no invented licensed status | Separate consent and access control | PENDING |
| Quick Assist rides and stays | `QuickSupportPanel`, service search handoff to `StoresTool` | Booking/dispatch availability, confirmed provider, cancellation terms | Local inquiry only; no booking or rate promise | Provider acceptance and separate booking authority | PARTIAL discovery / PENDING booking |
| Places and Plus Codes | Phase 3 Places tool and existing gateways | No location-based provider ranking certified | No device-location request; private entrances are not searched or shared | Purpose-bound location and provider consent | PENDING |
| Community Saver | Existing Store demo policy | No verified economics or distribution | Displays buyer/seller/Plug prerequisite; zero payment operation | Plug mandatory, three-party consent and verified benefit | PENDING |

## Targeted owner corrections — live API gaps

| Needed capability | Reused UI / existing boundary | Missing operation | Honest fallback | Required authority | Integration |
| --- | --- | --- | --- | --- | --- |
| Enlarged authorised Store photos | Existing Store media references / published offers | Gallery/provenance of nonpublic completed jobs not available | Reusable viewer; only authorised image URLs, otherwise honest placeholder | Store publication and access rights | PARTIAL |
| One vs many Store coordination | Existing `StoreBuyingPlan` and offer references | Provider prices, cross-seller delivery terms and confirmation not certified | Distinct Store IDs gate local coordination, no new Agreement | Each seller and buyer must separately agree | UI BUILT / API PENDING |
| Store Saver eligibility | Store management and Plug roles | Per-provider opt-in discoverability/publishing and revocation | Local preference clearly not published | Store owner or Plug’s explicit opt-in | PENDING |
| Per-arrangement Saver consent and economics | Existing Saver policy, `StoreBuyingPlan` | Versioned baseline, coordinated costs, Plug compensation, evidenced allocations, explicit buyer/all-seller/Plug consent | Pending/unknown fields; no Saver approval or payout | Each involved party consents to specific proposal; Plug mandatory | PENDING |
| My Plugs / My Masters private tags | Existing KS identity and capacity/Skills Institute boundaries | Private per-Store relationship list, tag CRUD, provider-category search and authorised availability/rate/qualification evidence | In-memory Store-specific tags and category filter; no fake person | Owner-private storage and provider publication consent | PENDING |
| Service-area capacity matching | Places tool and provider-publication boundaries | Matching live service categories and consented service area | Optional typed area; no device GPS or exact proximity inference | Provider area/availability publication and seeker location consent | PENDING |

No new backend route is authorised by this UI build. The local Store Saver interest checkbox is not buyer/seller/Plug acceptance for a specific arrangement.

## Safety
- `api/preview-agent.js` and `api/preview-workspace.js` retain production-upstream write refusal. No use of GET as implied permission to mutate.
- This phase adds no API endpoint, persistence, identity issuance, financial action, live booking or master-agent controller.
- Real Store search and offer lookups are preserved unchanged; historical Store PRs were not merged or transplanted.
- Synthetic traders, sample prices and image URLs are explicit and never represented as live offers.
- Stage authentication, real provider rights, provenance, permissions and full KS001 examination are independent API certification tasks.
