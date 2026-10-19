# Agreement Editor — contextual + Add (15 October 2026)

## Human observation
On a live draft such as *Bathroom tiling labour*, clicking **Edit** beside **People** should not presume the only possible edit is replacing "Client, Contractor" with new words or adding a KS Number. A holder may need to add a photo, a document, a place, or an identity to help KS001 resolve the fact.

## UI decision
- **Edit** opens a textarea for a written correction **and** a `+ Add` button next to **Send correction**.
- `+ Add` opens a small contextual picker, not a new page or a second document upload pipeline.
- For **People**: Photo, Document, Place, KS Number.
- For other fact rows (Work, Money, When): Photo, Document, Place.
- Select Photo/Document/Place to open the existing `UniversalSourceTray` with its existing preview, file/size restrictions and canonical KS001 source pathway. Select KS Number to open the existing People & Invitations flow; **this is not a direct participant assignment**.
- If the holder already typed a correction, the textarea's contents remain until deliberately sent or cancelled.
- When the holder expressly chooses a source task, the existing KS001 turn includes the fact it was supplied to support; it asks for evidence-grounded review without silently amending accepted terms.
- The hint is tied to the currently open conversation. Closing the tool, pressing Escape or using the top-level Add drops the fact hint. The local fact edit text remains untouched.
- No new backend mutation or new Agreement authority. Source ingestion remains under its pre-existing signed-in/demo rules, which should be certified separately before production deployment.

## Next certification
1. Live example: Work → People → Edit → + Add → Photo → inspect → choose source task → KS001 reviews without assigning any party.
2. Live example: People → Edit → + Add → KS Number → check identity status → user authorises any downstream participant/invite step separately.
3. Verify unsent text stays unchanged on cancel and after source review.
4. Verify conversation switching cannot apply a supporting source to a different Agreement.
5. Real mobile keyboard/accessibility tests, file error states, and source attachment persistence.
6. Confirm clear distinction between *uploaded source*, *understood fact*, *linked participant*, *invitation*, and *accepted Agreement*.

This is a draft, stacked on PR #134. No merge or production deployment.
