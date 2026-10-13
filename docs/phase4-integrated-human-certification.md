# SecurePay Phase 4 — Integrated Human Certification (Draft)

**Scope:** Phase 4A–4F of KS001 Intelligent Next Step. Test against the combined preview with fictional data. No real money and no third-party personal KS Numbers. Production, SecurePayAPI and securemain are outside scope.

## One continuous scenario: bathroom tiling agreement

Prepare a fictional set of meeting minutes: bathroom tiling, named participants, total price KES 95,000, three milestone payments totalling KES 95,000, deadline and responsibilities. In the conversation first correct the total to KES 45,000 to create a *real disagreement* between the new total and milestone payments.

| Step | Capability | Human action | Expected, observable result | Pass/fail |
|---|---|---|---|---|
| 1 | 4E Context | Upload fictional bathroom tiling meeting minutes | KS001 reads the source, proposes only work-relevant next questions; no funeral, fundi, Store or construction promotion injected generically | |
| 2 | 4A Amount conflict | Correct total to KES 45,000 while milestone payments total KES 95,000 | The two amounts are unmistakably visible as direct choices when supplied in the API question/open point; neither/another value remains possible | |
| 3 | 4A Authority | Tap KES 95,000 (or KES 45,000) | If API supplied fact IDs, a real version-bound conflict resolution occurs; not just a cosmetic change. Confirm refreshed Agreement and question | |
| 4 | 4B Identity | Open 'Add a person or organisation by KS Number'; use an authorised fictional test KS Number | Backend reports matching identity or a precise unavailable/error status; no invented identity, no secret details leaked | |
| 5 | 4C Role | Provide supervisor or contractor role | Proposed role is sent to SecurePayAPI. Verify its resulting linked/unlinked/associated status in refreshed Agreement. Entry is not participant consent | |
| 6 | 4D Date | When SecurePay genuinely asks for an open date, choose it with the date picker | The selected ISO date is sent to KS001. A free-text answer is still possible | |
| 7 | 4D Open answer | Ask a contextual 'why/how' question or add an unexpected term | Free text remains available. Interface does not force a dropdown or fabricated choice | |
| 8 | 4E Context | Change planning context to a funeral in a **fresh** conversation | No fundi/construction/Store exploration banner. Suggestions must be relevant to actual plan or absent | |
| 9 | 4F Readiness | Continue until backend says reviewable; open Agreement | Clear document opens at title, terms and unresolved points accurate. Conversation can continue | |
| 10 | 4F Safety | Edit a material term after review readiness | Server refreshes version/readiness. Earlier review acknowledgement must not count for changed version | |
| 11 | 4F Print | Print reviewable draft | Printed document shows version and draft/unaccepted status. Printing does not create any commitment | |

## Negative/safety checks
- Invalid, nonexistent, private or unavailable KS Number never displays an invented confirmed identity.
- Organisation representative is not silently authorised merely by supplying a KS Number.
- A claimed participant is not portrayed as having accepted the Agreement.
- An API failure or stale context must not show 'updated' as success.
- Every proposed correction is tied to the current Agreement context and refreshed after acknowledgement.
- Suggested pills are only limited to documented values or explicitly advisory examples, and do not silently change money or commitments.
- If a step has no supported backend capability, mark **BLOCKED**, not PASS.
- Desktop and 390px mobile run; keyboard navigation and accessible labels verified.

## Acceptance gate
For each step capture one screenshot or recording, response status and the resulting Agreement record version; record PASS / FAIL / BLOCKED and defect. Phase 4 may be **engineered** before all steps pass, but it is **Human Certified** only after end-to-end evidence, including 4B organisation authority handling. Do not merge or production-deploy without explicit approval.
