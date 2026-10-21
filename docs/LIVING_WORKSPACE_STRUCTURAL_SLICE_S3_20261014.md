# Living Workspace — Structural Slice S3: Native Vision and Circle Work
**Date:** 2026-10-14
**Repo:** SecurepayLLM
**Branch:** `design/living-workspace-vision-circle-20261014`
**PR:** #131 (draft / unmerged)
**Production:** UNCHANGED. **Human browser certification:** PENDING.

## Why this slice exists
The approved Living Workspace must become a real way to work, not a sequence of mock screens or a second backend. S1 established one identity and scoped lists; S2 introduced exact-ID reads/handoffs. S3 keeps users inside the same shell to edit an existing Dream or coordinate a Circle by reusing the existing secured components and API authority.

## Built
- **Real Vision:** Signed-in, owner-selected `VisionDreamDto` from the existing `WorkspaceContinuityPanel` now has **Edit here in Vision**. `InlineVisionEditor` uses the existing `createVisionDreamController`, exact-ID server `get`, `DreamBuilder`, revision-aware board saves, title patches, asset reads/uploads/deletions and the existing error handling. It does not create a second Canvas or document store. The existing Dream service owns permissions and version conflict policy.
- **Unsaved edits:** `DreamBuilder` publishes a dirty state; the shell warns on switching modes, returning to the workspace, exiting preview and browser unload. If the current board revision cannot be fetched, the editor cannot save over an unknown revision. No silent false confidence about a saved board.
- **Real Circle:** **Open Circle Board here** opens `InlineCircleBoard` within the same shell. It first reads the exact Circle and the member's status. Private content is withheld unless the membership API confirms ACTIVE or ownership. It then uses `CircleBoard` and the existing coordination engine for member-only prompts and quick responses, and the existing `circles.objects.create` for shared notes. The backend enforces member and steward powers, rejects unauthorised actions, and remains sole authority. All Circle writes use stable idempotency keys across ambiguous retries. The UI does NOT claim to accept an Agreement, approve governance, or move Money.
- **Narrow preview transport:** The same SecurePay session bearer travels only to a fixed allowlist of Dream owner routes and Circle-scoped member routes; JSON/body size bounded, cross-origin/host controlled, Vercel protection cookies NOT forwarded, and Circle idempotency keys explicitly validated. Payments, membership bypass, cross-Circle searches and arbitrary mutations remain prohibited. The preview transport is NOT a production architecture.
- **Mock sign-in remains isolated:** Selecting a sample Vision or Circle in demo mode mounts only the existing local `LivingVisionPanel` / `LivingCirclePanel` visual prototypes. No `InlineVisionEditor`, `InlineCircleBoard`, auth, private data fetch, membership, actual save or real Circle post occurs from mock mode. Prominent labels describe it as fake.
- **No new identity system:** The canonical SecurePay SessionStore, KS sign-in, saved Agreement builds and real Agreement list are unchanged. Work-mode KS001 chat and Living Agreement remain as approved.

## Tests and certification
Focused `Living Workspace Phase 7 Validation` covers:
- mock separation from authenticated editors;
- real Dream exact ID ownership and backend revision-aware writes;
- unknown Dream revision prevents overwrite;
- view-switch unsaved warning;
- Circle membership verified before private objects;
- member board using the established CircleBoard and scoped writes;
- preview relay allowlisted methods/routes, denial of unscoped or unauthenticated mutations and explicit idempotency header handling.
It also runs TS typecheck and production Vite build. The existing larger UI convergence tests remain separate and may have unrelated defects.

## Important honest limitations
- **Real-human browser test is pending**: successful compiler/tests and Vercel READY don't prove the live private SecurePayAPI endpoints or Vercel preview auth fully function for every user. Verify with a non-production/test identity and disposable test records first.
- Vision creation from scratch inside the new shell is NOT connected here; editing **existing** private Dreams is. Start a Dream through the existing native journey if needed.
- Circle Board is genuine, but the entire steward/governance/invitations suite is not transplanted to the new shell. Existing CommunityExperience remains the authorised place for complete governance. The board's quick responses and Circle notes are real actions for signed-in members.
- No automation of real Money, provider payments, Trust Project membership, Community Saver or Agreement review/acceptance by this slice.
- Backend Fair Trade PR #321 remains separate, draft/unmerged and awaiting Java CI certification.
- Production deployment and merge require explicit approval. Do not reuse demo fixtures as real records.

## Human acceptance tests
1. Open the updated isolated preview; choose **Try mock sign-in**. Navigate Vision → select a sample → open tools, add a note; Circle → select a sample → add a proposed item. Refresh; confirm both reset, do not appear in real work, and the demo banner remains visible.
2. **Exit demo**. In a separate, authorised test KS account, choose **Real KS sign-in**. Visit Vision → **Edit here in Vision** beside an already saved Dream. Change one note and save. Leave and reopen; confirm actual board revision persisted under that one Dream.
3. Make an unsaved change and try switching to My Work, leaving the preview, or refreshing. Verify the leave warning. Try opening a Dream whose board endpoint is unavailable: a save must not replace an unknown server revision.
4. Open Circle → **Open Circle Board here**. Verify only your active Circle content appears. Ask and respond to a quick coordination prompt or add a test note. Reopen the Circle and verify only that Circle received the entry, without an Agreement/Money side effect.
5. Try an identity with no membership to the selected Circle. The private board must remain hidden. Confirm mock sign-in does not expose any real records.
6. Run mobile viewport and assistive navigation checks before merging. Record provider/backend error states. Full securepay.ke deployment is untouched throughout.

## Next structural slices
- S4: universal Documents/Photos/Places/People/Quick Support tools and source provenance inside the shell, with current backend action/permission rules.
- S5: Community/projects/learning/store journeys inside this navigation model, accessible by server-confirmed membership/capabilities.
- S6: certified Money, Agreement formation and Fair Trade Qualification convergence with safe test rails; full human/mobile release gates.
