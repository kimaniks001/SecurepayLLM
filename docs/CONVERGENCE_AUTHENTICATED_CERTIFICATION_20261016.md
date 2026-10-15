# One SecurePay — authenticated convergence certification
## Readiness ledger • 16 October 2026

### Truth at this checkpoint
- Living Workspace, real Home and KS001 are connected by an **explicit, reversible, ID-only handoff** in draft UI PR #139. This does **not** make the separate preview the default product.
- Entering/returning uses the authoritative KS001 server conversation ID and calls `resumeConversation` under the current session. The receiver must accept or deny access. It does not transfer money, Agreement approvals, memberships or unsubmitted draft text.
- A fresh frontend compilation, source contract or public-preview browser smoke cannot establish authenticated access, genuine invitation consent, banking rails or Money execution.
- Real end-to-end scenarios below remain **NOT CERTIFIED**, regardless of green frontend regression checks.
- Backend SecurePayAPI PR #321 is still a draft/unmerged at `87f894551e6f0ec01f63f90fa7c74ad9646ef243`, and previous CI runs report failures. Their detailed job logs were not available during this inspection, so the cause is **not established**. Do not assume a runner issue or a product defect without evidence.

### Live authentication prerequisites
1. A non-production environment with its own approved test KS identities, including a signed-in buyer, seller, organiser, invited participant, non-member and Plug; one deliberately unauthorised identity.
2. The correct test backend branch and migration state. Confirm stable health/auth/session configuration without leaking secrets to browser logs, test output or PR comments.
3. Test Stores with verifiable published SERVICE/PRODUCT offers, safe dummy photos, one named Circle and a member-only community project. Samples must never masquerade as real data.
4. Explicit permission to create **test-only** conversations and Agreement drafts. No real invitations, Money movement, payment intents, rail requests, identity verification or third-party bookings by default.
5. Test devices/browsers and two first-time humans (including an older non-technical trader); capture real observations, not invented completion ratings.

### Read-only/zero-funds convergence checkpoints
| Flow | Positive proof | Required negative proof | Status |
| --- | --- | --- | --- |
| Home → KS001 → Living Work → KS001 | Exact server conversation ID survives both transitions; draft formation version re-read | Signed-out/different identity denied; no ID in URL, no made-up transcript | NOT TESTED live |
| Living draft → + Add photo or place | Explicit source review; source belongs to current conversation | Cancel does not upload; failed/uncertain source cannot become accepted fact | NOT TESTED live |
| Accepted Agreement → review → Money | Agreement opened by server ID; status, amounts, next steps and party access grounded | Draft/unconfirmed Agreement cannot fund; no fee quote invented | NOT TESTED live |
| Saved Work → resume later | Signed-in session re-reads exact saved build and formation | Different KS cannot resume a private conversation | NOT TESTED live |
| Store offer → KS001 → Agreement | Exact published offer refreshed, provenance preserved | Fake availability, sample seller, changed offer and booking blocked | NOT TESTED live |
| Member Circle → suitable trade | Explicit membership and Circle read; separate trade action | Non-member cannot see Circle content or inherit consent | NOT TESTED live |

### Required six human journeys (do not mark PASS without an actual run)
**A Chair delivery**: buyer starts with 200 chairs; verify real Store offer and delivery place; draft review; explain funding option without initiating payment.

**B Bathroom tiling**: read quotation; People Edit → + Add photo/KS Number; identity is lookup-only; review KES 95,000 milestone proposal and unclear payment terms; no silent agreement.

**C Eight-person chama**: capture purpose, governance, eight invitations and consent boundaries; **test-only invites only if approved and all recipients consent**; Money held until authority.

**D Vision → Agreement**: preserve Dream owner, revision and intentional Agreement handoff; no automatic conversion to binding terms.

**E Short Stays/My Ride**: trace initial request → service Store discovery → chosen real offer → KS001; no phantom provider, availability, dispatch or booking.

**F Community project**: discover project inside member scope, apply participation permissions, involve a Plug/Master appropriately; no Circle leakage into LIVE.

### Completion conditions
- Backend PR #321 workflows execute and have trustworthy pass/fail logs; version-bound Fair Trade and Agreement/Money authorities behave correctly in the chosen test environment.
- All six authenticated scenarios have reproducible server and browser evidence, no unhandled permissions and no false acceptance/payment language.
- Mobile 320/390, desktop, 200% zoom, keyboard focus, Swahili, older-user readability, slow connection/unknown outcome and printed Agreement inspected.
- Phase 1 #136, Phase 2 #137, cleanup #138 and handoff #139 remain draft until the separate product-owner release approval.

**Do not report SecurePay production-ready merely because all frontend unit tests are green.**
