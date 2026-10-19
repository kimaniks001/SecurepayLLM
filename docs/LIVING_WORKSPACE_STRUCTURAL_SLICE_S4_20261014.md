# Living Workspace — Structural Slice S4: Community and Shared Intake
**Date:** 2026-10-14
**Branch:** `design/living-workspace-vision-circle-20261014`; draft PR #131
**Release:** preview only. No merge, no production deployment, no paid-provider operation.

## Objective
Continue building around the approved Living Workspace rather than redesigning KS001 or the sign-in experience: member-safe Community discovery plus Photos-first universal input in one contextual Add/Tools surface.

## Implemented
### Community — actual SecurePay records, protected
- `InlineCommunityHub` is embedded under the signed-in **Community** workspace. No duplicate backend.
- Canonical SessionStore access and `ensureFreshSession`; membership via `gateways.community.membership.me()`.
- Only if membership is explicitly `ACTIVE` does the hub request the relevant tab:
  - LIVE: `community.feed(20,0)`
  - Projects: `community.projects.list(20,0)`
  - Help & skills: `community.serviceOpportunities.list(20,0)`
  - Events: `community.events.list(20,0)`
- Entries are filtered to `circleId === null` before rendering, even if the backend returns Circle-scoped rows. No Circle-only posts, projects, opportunities or events appear in the wider Community feed.
- **Learning** points to the existing Skills Institute/Community journey rather than fetching personally identifying apprenticeship data or inventing sessions.
- The isolated Vercel preview relay has exact GET allowlists for these three additional pages, with bounded `limit/offset`. It checks the server's actual `/membership/me` again before serving them to a signed-in identity. No arbitrary search, write, attendance, money or privilege paths are added.
- UI is **read-only**; no RSVP, volunteer registration, joining or personal allocation has been silently created. Continue those actions in the existing first-party authorised Community experience.
- The existing LIVE/Circle/member authority from earlier slices is preserved. Signing into SecurePay alone never creates Trust Project membership.

### Universal contextual input — deliberately not yet authoritative evidence
- **Photos** is first in the shared Add/Tools panel in My Work, Vision, Circle and Community, followed by Documents and Places.
- New `UniversalSourceTray` supports selecting a photo from the device, seeing its actual thumbnail, captioning the picture, removing it; selecting a document and showing its name/caption; and adding a user-entered place/address and caption.
- Supports bounded local previews (2 MB file maximum). These materials are not uploaded or sent to KS001, and they are never represented as interpreted text, confirmed facts, official evidence or items in an Agreement. There is no backend write, persistent storage, or token access in this component. Tool/area changes clear staged local previews.
- Existing Quick Support still exposes Short Stays, My Ride and Quick Documents through the common tool panel. Its drafts remain explicitly illustrative and do not make bookings, issue legal receipts or collect money.
- The mock sign-in user can open an interactive sample Community panel. It cannot call the real Community API or obtain membership.

## Automated verification
`Living Workspace Phase 7 Validation` executed:
- local-only source intake, Photos-first navigation and thumbnail FileReader checks;
- Community data only when ACTIVE membership has been verified, with Circle exclusion;
- preview GET route bounds, rejection of unexpected query parameters, and independent relay membership check;
- wider existing structural S1/S2/S3 focused regression tests;
- TypeScript and Vite production build.
All three focused verification steps completed green at S4 commit `7fa14357`. No claim is made that GitHub's separate full convergence/legacy Home tests, real browser identity flow, or API live availability are fully certified.

## Limitations and next slice
- This is not an upload connector: Photos and Documents are local device previews until a real, per-workspace provenance/evidence API binding is built, human-approved and version-verified.
- Project/events/help browsing is real for ACTIVE members, but attendance/volunteering/participation actions remain under the existing Community application; first-party handoff can encounter preview CORS on Vercel. Do not imply an RSVP occurred just because the person viewed a listing.
- No private Circle content joins LIVE, no automatic Trust Project membership, no Money instructions, and no automatic legal Agreement creation.
- Community proper governance, institutional learning and Stores need further connected structural slices, as do production auth/same-origin and real attachment workflows.
- Full authenticated human/mobile testing is pending. Unmerged API Fair Trade PR #321 is separate.

## Suggested human acceptance tests
1. Open the updated preview → **Try mock sign-in** → Community → open sample. Switch LIVE/Projects/Learning/Connections; see the persistent DEMO label and local-only interest.
2. Open Add/Tools in all four modes. Confirm Photos is first; select a small image, inspect the thumbnail and caption, remove it; try a PDF in Documents; add an address in Places. Verify the screen says **not uploaded**, and these items disappear after a tool change/refresh.
3. Exit demo. Use a disposable authorised ACTIVE Trust Project test member via **Real KS sign-in** → Community. Check LIVE/Projects/Help & skills/Events. Compare with the backend's actual records; private Circle entries must not appear.
4. Use a signed-in identity without ACTIVE Trust Project membership. Confirm the hub never fetches or displays the member data and the preview relay rejects its discovery calls.
5. Check mobile layout and accessibility; note the real full Community route may still encounter cross-origin restrictions in Vercel preview.
6. Do not try production payments or submit sensitive personal evidence while doing preview acceptance.

## Next structural slice (S5)
Implement explicit, provenance-bound Photo/Document upload and selection through existing secure SecurePay APIs, then contextual Places/People/Stores entry with authenticated permissions, and member capability actions through established Community service controllers. Keep Money tied only to signed/accepted Agreement authority.
