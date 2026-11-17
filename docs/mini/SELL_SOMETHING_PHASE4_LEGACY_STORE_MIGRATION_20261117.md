# SecurePay Mini Sell Phase 4 — live Store client migration inventory

17 November 2026 | Engineering inventory; **not a deployed migration**.

## Why the strict Store gate is still OFF

The new API branch allows a controlled `securepay.store.strict-versioned-publication=true` migration gate, but activating it today would reject older Store management flows whose ordinary `createOffer` or `updateOffer` requests set `published=true`.

The following existing first-party callers were inspected **on the Phase 4 feature branch**:

| Existing client | Observed publication behavior | Needed before strict switch |
| --- | --- | --- |
| `src/features/store/controller.ts` | `submitDraft()` calls ordinary personal/Business `createOffer` or `updateOffer`, copying `state.draft.published` into the body | Preserve draft editing, separate explicit text-only publish intent, fetch exact owner Store version, call CAS `publish-text`, and handle already published listings without unsafe unversioned overwrite |
| `src/features/store/StoreExperience.tsx` | Connects Store builder and manage screens to the above controller | Show the new two-step review and publication states instead of implying a direct one-click save can publish |
| `src/mini/MiniSellerStore.tsx` | `savePublished()` calls the existing Store controller `submitDraft()` for a *previously published* listing, including price/quantity changes | Implement separate versioned edit/republish flow for existing published offers; don't silently unpublish them or discard changed terms |
| `src/features/living-workspace/StoresTool.tsx` | The examined native offer-create path already sends `published:false` and explicitly says it remains a draft | The draft path is compatible; verify its subsequent Store-management publication and clarify resulting status |
| `src/mini/MiniSellSomething.tsx` (new) | Creates a private text-only Store draft, then asks seller separately via `Publish text only` pill and calls CAS `publish-text` after fresh server read | Designed for strict gate; full authenticated integration and TypeScript/PostgreSQL checks remain outstanding |

## Safe migration requirements

1. **Do not switch strict mode ON yet.** The new Mini pathway itself uses a safe, separate text publication action.
2. Published listings must remain editable without losing existing customers' published state unexpectedly. Build an explicit new offer-version/draft-edit protocol for those updates; **do not** blindly rewrite a live public offer through an unfenced PUT.
3. If an older Store editor attempts to publish an image, quantity claim, or `AVAILABLE` state through `publish-text`, show what needs separate confirmation; do not erase seller details or silently pretend publication succeeded.
4. Existing Store photos are NOT licensed by having a `mediaRefs` value. The Phase 3 rights and takedown gate stays separate and OFF.
5. Certified rollout requires Java 21/Gradle, PostgreSQL/Flyway, stale-time SQL tests, real signed-in personal/Business authorization, changed-session/seller tests, TypeScript/Vite and all 20-person acceptance journeys at the later acceptance gate.
6. Do not merge or deploy #329/#476 or flip any gate without explicit release authorization and evidence.

## Source-fidelity and real KS001 turn correction

The seller now carries condition, specifications, intended use and inclusions separately when the reviewed description did not already include them, and explicitly discloses that local people/photos/files were not transmitted. Text exceeding contract limits is rejected, not shortened silently. Descriptions awaiting seller review block Agreement handoff.

The real signed-in entry now uses `pair.controller.sendStatement` **not** best-effort `send`, requiring an acknowledged server turn and matching live Trade Context version before any handoff. This avoids treating a busy/no-op chat action as an accepted seller statement.

**Verification in isolated V8 harness:** 52 of 52 Phase 2–4 focused source, bridge and UI checks passed. This is not a complete Node/TypeScript/Spring/PostgreSQL build or an end-to-end signed-in acceptance test.

## 17 November — migration engineering implemented after inventory

- `features/store/view.ts`: newly authored Store offers now start as **private drafts** (`published:false`, `NEEDS_CONFIRMATION`) instead of being publicly visible by default.
- `features/store/controller.ts`: new offers are saved privately; unpublished draft edits cannot secretly set `published:true` through ordinary PUT. An owner-confirmed `publishReviewedTextOffer()` rereads the current personal/Business Store offer and uses the dedicated API `publish-text` with exact `updatedAt`. Unknown outcomes require a Store read before retry.
- `components/StoreManagementHome.tsx`: private drafts now have a **Review draft** action.
- `components/OfferBuilderView.tsx`: removed the misleading **Publish immediately** checkbox. The trader saves a private draft first and, after opening that saved draft, selects **Review and publish text only**, followed by **Publish this text-only listing** or **Keep private**.
- Existing **published text-only** listings with `quantityAvailable:null`, empty media and `NEEDS_CONFIRMATION` can now update title, description and price through a *separate* exact-revision endpoint. The listing stays public; old Agreements are not amended.
- The pure `storeTextPublicationPolicy.mjs` and typed declaration keep new private listing publication separate from already-public text changes, and reject stale timestamps, changed content, unverified photographs, stock quantities and other unsupported transitions. Safe public-edit path also rechecks the latest Store revision immediately before mutation.
- `MiniSellerStore` uses the same `StoreController.submitDraft()` machinery; eligible text-only public edits therefore gain the new CAS protocol without another UI rewrite.
- The API companion in PR #476 now exposes `update-published-text` for personal and represented Business Stores. It requires current revision, explicit seller confirmation, empty media, no quantity claims, and `NEEDS_CONFIRMATION`; it does not interrupt public visibility or validate stock.
- The backend publication service no longer requires an unknown global Spring `Clock` bean; the normal constructor supplies UTC and tests retain a package-scoped fixed-clock constructor.

### Verification and still-open migration

- **64/64 focused frontend checks** were executed across Phase 2–4 source contracts and the new managed Store publication/edit policy in isolated V8 checks. These do **not** replace a full Node/TypeScript production build.
- Java unit tests were authored but **not run** in a complete Java 21/Gradle/PostgreSQL checkout.
- Existing published offers containing media references or quantity claims are NOT silently transformed, unpublished or moved to text-only. Their older direct `updateOffer` path is still present. Thus the `securepay.store.strict-versioned-publication` switch MUST remain **OFF** pending migration of that legacy editing contract, including versioned inventory and authorised media support.
- Separate Business Agreement creation remains gated; verified Business Store management ≠ power to bind the Business in an Agreement. Buyer alone authorises Money.
- No PR merged or deployed, no real Store published, and no live SecureLink or Money operation initiated during these commits.
