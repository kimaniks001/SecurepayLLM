# Launch tool-tray cleanup — 15 October 2026

## Decision and visible change
The Living Workspace Add menu no longer looks like an endless catalogue of promises. It has **seven working entry points** in two intentionally short groups:

- **Add something**: Photos (first), Documents, Places. These use the existing universal source tray and its explicit provenance/permission handling.
- **Get something done**: Quick Assist, Stores, People & Invitations, Money. These open the existing actual bounded panels.

Desktop and mobile **Add / Tools** now open the grouped picker, not whichever tool the holder last viewed. The picker is a compact overlay, not a full new page. The Store gallery remains at its approved wide width; all other panels remain compact.

## Removed from launcher
- **Milestones** — already belong inside the Agreement journey and its authorised next actions; do not offer a dead mini-app.
- **Vision tools** — Vision is its own workspace, with a real Dream editor available under its existing access conditions, not an empty launch tile.
- **Community & Circles** — real scoped workspace navigation exists; don't duplicate it as a fake tool.
- **More tools** — a placeholder promise, deleted from launcher.
- **Quick Support** — retired visible label, consolidated under Quick Assist.

KS001 preview suggestions now only open tools present in the launch catalogue; a reference to a nonexistent tool never silently falls back to Photos. Removing an entry from the launcher is **not** deletion of backend Agreements, documents, community data, Dream content or milestones.

## Preserved authority and scope
Quick Assist retains Short Stays / My Ride / + Add a tool and its Store SERVICE offer discovery. Seller Quick Contract stays in Store as a preparation aid. It does not automatically create a booking, issue a contract, charge money or disclose private context.

Signed-in Money, canonical Agreement review, Store buying offers, People invites, photos and places retain their existing separate permission checks. The approved Store UX baseline on `baseline/stores-approved-20261015` was not edited.

## Explicit limits for launch readiness
This is a **tool-launcher cleanup on the unmerged Living Workspace stack**, not a certified live product release. Store/Quick Assist provider booking and dispatch are not yet integrated. Some universal source types support only an explicit preview stage; they must not be represented as uploaded authoritative evidence until the actual canonical command succeeds. Quick Assist collection remains session-local pending an owner-scoped persistence contract.

Engineering checklist: TypeScript, ESLint, full frontend regressions, production bundle, preview browser/mobile screenshot review, keyboard/focus QA and real KS001/Store/Agreement end-to-end human certification. Retain honest demo labels where data is simulated; do **not** make sample data look real merely to achieve a clean screen. No merge or deployment without approval.

## Branch and release
Built on `feature/launch-tools-cleanup-20261015`, stacked on Quick Assist PR #132, itself stacked on Living Workspace PR #131. No changes to SecurePayAPI, `main`, `securemain`, or the frozen Store baseline.
