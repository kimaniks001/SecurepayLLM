# Mini H4C — Talk to someone

19 November 2026 · draft preview only · native Mini UI

## Human experience
In the existing `mini.html` journey, choose `Need a hand? → I want to talk to someone`, or choose another form of human help (local knowledge, basic field checks, specialist conversation). The short answer pills remain local to Mini. The person can choose KS001 separately and can seek human help when nothing is wrong.

`MiniHumanHelp` remains inside the approved native `spm-*` shell. The new H4C entry opens `MiniHumanDiscovery` through the **same authenticated first-party Mini session** in `MiniFirstPartyKs001`. Its API is `createHumanDiscoveryGateway`, sending only the selected enum intention with `auth:required`. No story, evidence, Agreement identifier, exact location, contact details or Money values are submitted for discovery. Successful answers are checked for all mandatory fail-closed `false` flags; forged human contact, Money, location and professional licensing responses are rejected.

## Truthful experience states
- The fictional `mini.html#/preview/mini/h4c` route uses the existing native Mini Help entry. No fake helper directory is bundled.
- Actual staging discovery is gated by **all** of: correct approved Mini preview host, aligned first-party staging API, no interactive demo mode, signed-in KS identity, and `VITE_SECUREPAY_MINI_H4C_DISCOVERY=enabled`.
- When a matching staging API is not certified or configured, Mini says **"Verified helper lookup is not connected in this preview"** rather than inventing people or prompting a fake booking.
- A real signed-in lookup can return zero providers without claiming help has been dispatched. Candidate cards identify a reviewed service, the source-published indicative rate and the difference between an availability declaration and an actual appointment. Person names and contact information are not fabricated.
- LOCAL_KNOWLEDGE cannot claim locality until H5 supplies a consented coarse search area.
- A person may always choose **Ask KS001 instead**; a separate choice does not turn human help into a mandatory AI session or dispute.

## No-GO
Real Core H4C backend + migration not deployed, operator catalogue and independent reviewer provisioning not verified, H3/H4A/H4B release gates open, no actual providers certified for the H4C list. Java/Postgres and complete Mini mobile/browser tests remain required. The Vercel frontend build alone is not evidence of real matching.

No changes to Mini's existing Buy/Sell/Pay/Collect Agreement authority, production routes, original customer Agreements, SecureLinks or Money. H4D will implement real separately accepted helper engagement and H4E will certify the combined Human Layer.
