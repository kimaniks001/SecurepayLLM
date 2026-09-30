# Vision V1 UI — isolated Dream foundation

Status: implementation foundation on an isolated draft branch. **NOT MOUNTED YET.**

The VisionDreamExperience and its controller are intentionally NOT wired into
AgentExperience or RuntimeApp yet. Claude's active Gate 1 UI PR #74 changes those
shared router/Home paths. Their heads must be reconciled before wiring the
optional Dream experience into the production app.

## New behavior
- New first-party Vision Dream gateway with the existing possession header,
  sent only for the exact conversation claimed. On successful claim the
  temporary secret is forgotten; a failed/unknown response retains it.
- Dream controller creates one existing KS001 conversation, saves a private
  IDEA through new owner-scoped API, and retries ambiguous saves against the
  SAME conversation ID. No LLM call is made simply by creating the Dream.
- An unrelated unsaved conversation in the tab prevents an implicit new
  conversation from replacing its possession token.
- The person's original words create the first Dream note/title; the UI does
  not claim it automatically extracted decisions or a plan.
- Recent Dreams, editable note, version-pinned correction, and optional
  Continue with KS001 callback. Existing Vision Library and document templates
  remain unchanged. A future router must pass a SAME-ID resume callback.

## Not yet implemented
Signed-out Vision routing, long-term Dream-summary intelligence, image/file
attachments, browser-tested journey, OpenAI adapters, search/RFQ, Vision Plus,
Vision-to-Agreement handoff. No private Vision endpoint is anonymously readable.

## Required integration verification
Node tests, typecheck, lint, build, real Postgres and HTTP tests of claim
and wrong/expired/foreign conversation; real desktop/mobile browser after
Gate 1 branch reconciliation. No runtime pass is claimed solely because
this file or the corresponding tests were written.